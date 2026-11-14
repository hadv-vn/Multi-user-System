#!/usr/bin/env python3
"""Quan ly backend + frontend cua Multi-User System bang mot lenh.

Chay `./build_and_run.py` (khong can tham so) de thuc hien tron quy trinh:
  1. Dung moi tien trinh cu (theo pid file va theo cong 8080/8081).
  2. Build neu can: chi cai dependency / build lai phan nao co source, cau
     hinh hoac lock file moi hon ban build hien tai (hoac chua tung build).
  3. Chay migrate + seed, khoi dong backend va frontend o che do nen.
  4. Kiem tra status: cong da lang nghe va endpoint HTTP tra loi.

Chi dung thu vien chuan (Python 3.10+). Dung chung thu muc .runtime/ (log +
pid) voi cac script trong scripts/, nen co the dung lan voi stop-all.sh.

Dung tat ca: ./scripts/stop-all.sh

Luu y: NEXT_PUBLIC_API_BASE_URL duoc nhung vao frontend luc build, nen sua
frontend/.env se tu dong kich hoat build lai frontend.
"""

from __future__ import annotations

import dataclasses
import os
import pathlib
import re
import secrets
import shutil
import signal
import socket
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

FRONTEND_PORT = 8080  # Phai khop "-p" trong frontend/package.json.
BACKEND_PORT = 8081  # Phai khop PORT trong backend/.env.
STARTUP_TIMEOUT_SECONDS = 60
STOP_TIMEOUT_SECONDS = 10
HEALTH_CHECK_TIMEOUT_SECONDS = 30
DB_CONNECT_TIMEOUT_SECONDS = 3
HTTP_REQUEST_TIMEOUT_SECONDS = 5


class ScriptError(Exception):
  """Loi nghiep vu cua script; in ra thong bao va thoat voi ma 1."""


class Console:
  """In thong bao theo cung dinh dang voi cac script shell."""

  @staticmethod
  def step(message: str) -> None:
    print(f'\n==> {message}', flush=True)

  @staticmethod
  def info(message: str) -> None:
    print(message, flush=True)

  @staticmethod
  def warn(message: str) -> None:
    print(f'[!] {message}', flush=True)

  @staticmethod
  def error(message: str) -> None:
    print(f'[x] {message}', file=sys.stderr, flush=True)


@dataclasses.dataclass(frozen=True)
class ProjectPaths:
  """Cac duong dan quan trong trong repo."""

  repo_root: pathlib.Path

  @property
  def backend_dir(self) -> pathlib.Path:
    return self.repo_root / 'backend'

  @property
  def frontend_dir(self) -> pathlib.Path:
    return self.repo_root / 'frontend'

  @property
  def log_dir(self) -> pathlib.Path:
    return self.repo_root / '.runtime' / 'logs'

  @property
  def pid_dir(self) -> pathlib.Path:
    return self.repo_root / '.runtime' / 'pids'

  @property
  def backend_env(self) -> pathlib.Path:
    return self.backend_dir / '.env'

  @property
  def frontend_env(self) -> pathlib.Path:
    return self.frontend_dir / '.env'

  @classmethod
  def from_script_location(cls) -> ProjectPaths:
    return cls(pathlib.Path(__file__).resolve().parent)


@dataclasses.dataclass(frozen=True)
class ManagedService:
  """Mot dich vu chay nen: ten, lenh, cong lang nghe va URL kiem tra."""

  name: str
  work_dir: pathlib.Path
  command: list[str]
  port: int
  health_path: str
  extra_env: dict[str, str] = dataclasses.field(default_factory=dict)

  @property
  def process_name(self) -> str:
    return f'{self.name}-{self.port}'

  @property
  def health_url(self) -> str:
    return f'http://127.0.0.1:{self.port}{self.health_path}'


@dataclasses.dataclass(frozen=True)
class BuildTarget:
  """Mot phan can build: file danh dau ket qua build va cac input cua no."""

  name: str
  output_marker: pathlib.Path
  inputs: list[pathlib.Path]
  command: list[str]


class EnvFile:
  """Doc gia tri KEY=VALUE tu mot file .env."""

  def __init__(self, path: pathlib.Path) -> None:
    self._path = path

  def read_value(self, key: str) -> str | None:
    pattern = re.compile(rf'^{re.escape(key)}=(.*)$')
    for line in self._path.read_text(encoding='utf-8').splitlines():
      match = pattern.match(line)
      if match:
        return match.group(1).strip()
    return None


class SystemInspector:
  """Kiem tra moi truong: Node.js, IP LAN, cong mang, DB, HTTP."""

  _SUPPORTED_NODE_MINIMUMS = {20: 19, 22: 12}
  _NODE_LATEST_MAJOR = 24

  def require_supported_node(self) -> None:
    """Prisma va Next.js 16 can Node.js 20.19+, 22.12+ hoac 24+."""
    if shutil.which('node') is None:
      raise ScriptError(
          "Chua cai 'node'. Cai Node.js 24 LTS (xem README, muc Yeu cau moi"
          ' truong).')
    version = subprocess.run(
        ['node', '-v'], capture_output=True, text=True,
        check=True).stdout.strip().lstrip('v')
    major, minor = (int(part) for part in version.split('.')[:2])
    if major >= self._NODE_LATEST_MAJOR:
      return
    if minor >= self._SUPPORTED_NODE_MINIMUMS.get(major, sys.maxsize):
      return
    raise ScriptError(
        f'Node.js v{version} khong duoc ho tro (can 20.19+, 22.12+ hoac 24+).'
        " Cai Node 24 qua nvm: 'nvm install' trong thu muc repo (doc .nvmrc).")

  def get_lan_ip(self) -> str | None:
    result = subprocess.run(
        ['ip', '-4', 'addr', 'show', 'scope', 'global'],
        capture_output=True, text=True, check=False)
    match = re.search(r'inet (\d+\.\d+\.\d+\.\d+)', result.stdout)
    return match.group(1) if match else None

  def is_port_busy(self, port: int) -> bool:
    return bool(self._listening_sockets(port))

  def pids_on_port(self, port: int) -> set[int]:
    """PID cac tien trinh (cua user hien tai) dang lang nghe o cong."""
    output = '\n'.join(self._listening_sockets(port, with_process=True))
    return {int(pid) for pid in re.findall(r'pid=(\d+)', output)}

  def is_db_reachable(self, database_url: str) -> bool:
    parsed = urllib.parse.urlsplit(database_url)
    if not parsed.hostname or not parsed.port:
      Console.warn(
          'Khong doc duoc host/port tu DATABASE_URL, bo qua kiem tra ket noi.')
      return True
    try:
      with socket.create_connection(
          (parsed.hostname, parsed.port), timeout=DB_CONNECT_TIMEOUT_SECONDS):
        return True
    except OSError:
      return False

  def http_status(self, url: str) -> int | None:
    """Ma HTTP cua URL (sau redirect), None neu khong ket noi duoc."""
    try:
      with urllib.request.urlopen(
          url, timeout=HTTP_REQUEST_TIMEOUT_SECONDS) as response:
        return response.status
    except urllib.error.HTTPError as error:
      return error.code
    except (urllib.error.URLError, OSError):
      return None

  @staticmethod
  def _listening_sockets(port: int, with_process: bool = False) -> list[str]:
    flags = '-tlnpH' if with_process else '-tlnH'
    result = subprocess.run(
        ['ss', flags, f'sport = :{port}'],
        capture_output=True, text=True, check=False)
    return [line for line in result.stdout.splitlines() if 'LISTEN' in line]


class CommandRunner:
  """Chay lenh dong bo, in output truc tiep ra terminal."""

  def run(self, command: list[str], cwd: pathlib.Path) -> None:
    result = subprocess.run(command, cwd=cwd, check=False)
    if result.returncode != 0:
      raise ScriptError(
          f"Lenh '{' '.join(command)}' that bai (ma {result.returncode}).")


class EnvFileInitializer:
  """Tao backend/.env va frontend/.env tu .env.example neu chua co."""

  def __init__(self, paths: ProjectPaths, lan_ip: str) -> None:
    self._paths = paths
    self._lan_ip = lan_ip

  def ensure_backend_env(self) -> None:
    frontend_url = f'http://{self._lan_ip}:{FRONTEND_PORT}'
    if self._paths.backend_env.exists():
      if self._lan_ip not in self._paths.backend_env.read_text('utf-8'):
        Console.warn(f'backend/.env khong chua IP {self._lan_ip} - kiem tra'
                     ' CORS_ORIGIN/APP_BASE_URL.')
      return
    self._create_from_example(self._paths.backend_env, {
        'CORS_ORIGIN': frontend_url,
        'APP_BASE_URL': frontend_url,
        'CSRF_SECRET': secrets.token_hex(32),
    })
    Console.warn(f'Da tao backend/.env voi IP {self._lan_ip}. Kiem tra lai'
                 ' DATABASE_URL va SMTP_*.')

  def ensure_frontend_env(self) -> None:
    api_url = f'http://{self._lan_ip}:{BACKEND_PORT}/api/v1'
    if self._paths.frontend_env.exists():
      # URL tuong doi (vd /api/v1) nghia la da co reverse proxy phia truoc.
      current = EnvFile(self._paths.frontend_env).read_value(
          'NEXT_PUBLIC_API_BASE_URL') or ''
      expected = f'{self._lan_ip}:{BACKEND_PORT}'
      if current.startswith('http') and expected not in current:
        Console.warn(f'frontend/.env khong tro toi http://{expected} - kiem'
                     ' tra NEXT_PUBLIC_API_BASE_URL.')
      return
    self._create_from_example(self._paths.frontend_env,
                              {'NEXT_PUBLIC_API_BASE_URL': api_url})
    Console.warn(f'Da tao frontend/.env voi API {api_url}.')

  @staticmethod
  def _create_from_example(target: pathlib.Path,
                           overrides: dict[str, str]) -> None:
    example = target.with_name('.env.example')
    lines = []
    for line in example.read_text(encoding='utf-8').splitlines():
      key = line.split('=', 1)[0]
      lines.append(f'{key}={overrides[key]}' if key in overrides else line)
    target.write_text('\n'.join(lines) + '\n', encoding='utf-8')


class BuildFreshnessChecker:
  """Quyet dinh co can npm install / build lai hay khong dua vao mtime."""

  _IGNORED_DIRS = frozenset(
      {'node_modules', 'dist', '.next', 'generated', '__pycache__', '.git'})
  _IGNORED_SUFFIXES = ('.spec.ts', '.spec.tsx', '.e2e-spec.ts')

  def __init__(self, paths: ProjectPaths) -> None:
    self._paths = paths

  def needs_install(self) -> bool:
    """npm ghi node_modules/.package-lock.json moi lan install thanh cong."""
    installed_marker = self._paths.repo_root / 'node_modules/.package-lock.json'
    lock_file = self._paths.repo_root / 'package-lock.json'
    return self._is_stale(installed_marker, [lock_file])

  def needs_build(self, target: BuildTarget) -> bool:
    return self._is_stale(target.output_marker, target.inputs)

  def _is_stale(self, output: pathlib.Path,
                inputs: list[pathlib.Path]) -> bool:
    if not output.exists():
      return True
    output_time = output.stat().st_mtime
    return any(self._latest_mtime(path) > output_time for path in inputs)

  def _latest_mtime(self, path: pathlib.Path) -> float:
    if not path.exists():
      return 0.0
    if path.is_file():
      return path.stat().st_mtime
    latest = 0.0
    for current_dir, dir_names, file_names in os.walk(path):
      dir_names[:] = [name for name in dir_names
                      if name not in self._IGNORED_DIRS]
      for file_name in file_names:
        if file_name.endswith(self._IGNORED_SUFFIXES):
          continue
        latest = max(latest,
                     os.path.getmtime(os.path.join(current_dir, file_name)))
    return latest


class ProcessManager:
  """Khoi dong dich vu o che do nen va dung chung theo pid file + cong."""

  def __init__(self, paths: ProjectPaths, inspector: SystemInspector,
               services: list[ManagedService]) -> None:
    self._paths = paths
    self._inspector = inspector
    self._services = services

  def start(self, service: ManagedService) -> None:
    """Chay trong nhom tien trinh rieng de dung duoc ca npm lan node con."""
    self._paths.log_dir.mkdir(parents=True, exist_ok=True)
    self._paths.pid_dir.mkdir(parents=True, exist_ok=True)
    log_path = self._paths.log_dir / f'{service.process_name}.log'
    with open(log_path, 'wb') as log_file:
      process = subprocess.Popen(
          service.command, cwd=service.work_dir,
          env={**os.environ, **service.extra_env},
          stdin=subprocess.DEVNULL, stdout=log_file, stderr=subprocess.STDOUT,
          start_new_session=True)
    pid_path = self._paths.pid_dir / f'{service.process_name}.pid'
    pid_path.write_text(f'{process.pid}\n', encoding='utf-8')
    Console.info(f'{service.name} -> log: .runtime/logs/{log_path.name}')

  def wait_until_listening(self, port: int) -> bool:
    deadline = time.monotonic() + STARTUP_TIMEOUT_SECONDS
    while time.monotonic() < deadline:
      if self._inspector.is_port_busy(port):
        return True
      time.sleep(1)
    return False

  def stop_all(self) -> None:
    """Gui SIGTERM toi nhom tien trinh va tien trinh chiem cong, roi SIGKILL."""
    self._stop_pid_files()
    self._signal_port_listeners(signal.SIGTERM)

    deadline = time.monotonic() + STOP_TIMEOUT_SECONDS
    while self.busy_ports() and time.monotonic() < deadline:
      time.sleep(1)

    remaining = self.busy_ports()
    if remaining:
      Console.warn(f'Sau {STOP_TIMEOUT_SECONDS}s van con cong:'
                   f' {self._format_ports(remaining)} - gui SIGKILL.')
      self._signal_port_listeners(signal.SIGKILL)
      time.sleep(1)

    remaining = self.busy_ports()
    if remaining:
      raise ScriptError(
          f'Khong giai phong duoc cong: {self._format_ports(remaining)}'
          ' (co the do user khac chay - thu voi sudo).')
    Console.info(f'Cac cong {FRONTEND_PORT}, {BACKEND_PORT} deu trong.')

  def busy_ports(self) -> list[int]:
    return [service.port for service in self._services
            if self._inspector.is_port_busy(service.port)]

  def _stop_pid_files(self) -> None:
    if not self._paths.pid_dir.is_dir():
      return
    for pid_path in sorted(self._paths.pid_dir.glob('*.pid')):
      try:
        process_group = int(pid_path.read_text(encoding='utf-8').strip())
        os.killpg(process_group, signal.SIGTERM)
        Console.info(f'Dung {pid_path.stem} (nhom tien trinh {process_group})')
      except (ValueError, ProcessLookupError, PermissionError):
        pass
      pid_path.unlink(missing_ok=True)

  def _signal_port_listeners(self, signal_number: signal.Signals) -> None:
    for service in self._services:
      for pid in self._inspector.pids_on_port(service.port):
        if signal_number == signal.SIGTERM:
          Console.info(f'Dung tien trinh {pid} dang chiem cong {service.port}')
        try:
          os.kill(pid, signal_number)
        except (ProcessLookupError, PermissionError):
          pass

  @staticmethod
  def _format_ports(ports: list[int]) -> str:
    return ' '.join(str(port) for port in ports)


class StackManager:
  """Dieu phoi quy trinh stop -> build (neu can) -> run -> status."""

  def __init__(self, paths: ProjectPaths) -> None:
    self._paths = paths
    self._inspector = SystemInspector()
    self._runner = CommandRunner()
    self._freshness = BuildFreshnessChecker(paths)
    self._backend = ManagedService(
        name='backend', work_dir=paths.backend_dir,
        command=['npm', 'run', 'start:prod'], port=BACKEND_PORT,
        health_path='/health', extra_env={'PORT': str(BACKEND_PORT)})
    self._frontend = ManagedService(
        name='frontend', work_dir=paths.frontend_dir,
        command=['npm', 'run', 'start'], port=FRONTEND_PORT, health_path='/')
    self._services = [self._backend, self._frontend]
    self._processes = ProcessManager(paths, self._inspector, self._services)
    self._build_targets = self._create_build_targets()

  def up(self) -> None:
    self._inspector.require_supported_node()
    Console.step('[1/4] Dung tien trinh cu')
    self._processes.stop_all()
    Console.step('[2/4] Build (neu can)')
    self._build_if_needed()
    Console.step('[3/4] Khoi dong dich vu')
    self._start_services()
    Console.step('[4/4] Kiem tra status')
    if not self._report_status():
      raise ScriptError('Mot so dich vu chua san sang - xem log trong'
                        ' .runtime/logs/.')
    Console.info('\nDung tat ca: ./scripts/stop-all.sh')

  def _report_status(self) -> bool:
    """In trang thai tung dich vu; tra ve True neu tat ca deu khoe."""
    deadline = time.monotonic() + HEALTH_CHECK_TIMEOUT_SECONDS
    all_healthy = True
    for service in self._services:
      http_code = self._wait_for_http(service, deadline)
      listening = self._inspector.is_port_busy(service.port)
      healthy = http_code is not None and http_code < 500
      all_healthy = all_healthy and healthy
      label = '[ok]' if healthy else '[x] '
      port_state = 'dang lang nghe' if listening else 'khong lang nghe'
      http_state = f'HTTP {http_code}' if http_code else 'khong phan hoi'
      Console.info(f'{label} {service.name:<9} cong {service.port}'
                   f' ({port_state}), {service.health_path} -> {http_state}')
    self._print_urls()
    return all_healthy

  def _build_if_needed(self) -> None:
    lan_ip = self._inspector.get_lan_ip()
    if not lan_ip:
      raise ScriptError(
          "Khong phat hien duoc IP LAN cua server (kiem tra 'ip addr').")
    env_initializer = EnvFileInitializer(self._paths, lan_ip)
    env_initializer.ensure_backend_env()
    env_initializer.ensure_frontend_env()

    if self._freshness.needs_install():
      Console.info('Cai dependency (npm install)...')
      self._runner.run(['npm', 'install'], self._paths.repo_root)
    else:
      Console.info('Dependency da cap nhat, bo qua npm install.')

    for target in self._build_targets:
      if self._freshness.needs_build(target):
        Console.info(f'Build {target.name}...')
        self._runner.run(target.command, self._paths.repo_root)
      else:
        Console.info(f'{target.name}: ban build da moi nhat, bo qua.')

  def _start_services(self) -> None:
    self._check_database()
    Console.info('Chay Prisma migrate deploy + seed...')
    self._runner.run(['npm', 'run', 'db:migrate'], self._paths.backend_dir)
    self._runner.run(['npm', 'run', 'db:seed'], self._paths.backend_dir)
    for service in self._services:
      self._processes.start(service)
    for service in self._services:
      if not self._processes.wait_until_listening(service.port):
        Console.warn(f'{service.name} chua lang nghe cong {service.port} sau'
                     f' {STARTUP_TIMEOUT_SECONDS}s.')

  def _wait_for_http(self, service: ManagedService,
                     deadline: float) -> int | None:
    while True:
      http_code = self._inspector.http_status(service.health_url)
      if (http_code is not None and http_code < 500) or (
          time.monotonic() >= deadline):
        return http_code
      time.sleep(1)

  def _check_database(self) -> None:
    database_url = EnvFile(self._paths.backend_env).read_value('DATABASE_URL')
    if not database_url:
      raise ScriptError('Thieu DATABASE_URL trong backend/.env.')
    if not self._inspector.is_db_reachable(database_url):
      raise ScriptError(
          'Khong ket noi duoc PostgreSQL theo DATABASE_URL trong backend/.env.'
          ' Hay khoi dong Postgres truoc.')
    Console.info('Ket noi duoc PostgreSQL.')

  def _print_urls(self) -> None:
    host = self._inspector.get_lan_ip() or '<IP-server>'
    Console.info(f'\nFrontend: http://{host}:{FRONTEND_PORT}')
    Console.info(f'API:      http://{host}:{BACKEND_PORT}/api/v1')

  def _create_build_targets(self) -> list[BuildTarget]:
    root_lock = self._paths.repo_root / 'package-lock.json'
    backend = self._paths.backend_dir
    frontend = self._paths.frontend_dir
    return [
        BuildTarget(
            name='backend',
            output_marker=backend / 'dist' / 'main.js',
            inputs=[backend / 'src', backend / 'prisma',
                    backend / 'package.json', backend / 'tsconfig.json',
                    backend / 'tsconfig.build.json', backend / 'nest-cli.json',
                    backend / 'prisma.config.ts', root_lock],
            command=['npm', 'run', 'build', '--workspace=backend']),
        BuildTarget(
            name='frontend',
            output_marker=frontend / '.next' / 'BUILD_ID',
            inputs=[frontend / 'src', frontend / 'public',
                    frontend / 'package.json', frontend / 'tsconfig.json',
                    frontend / 'next.config.ts', frontend / '.env', root_lock],
            command=['npm', 'run', 'build', '--workspace=frontend']),
    ]


def main() -> int:
  manager = StackManager(ProjectPaths.from_script_location())
  try:
    manager.up()
  except ScriptError as error:
    Console.error(str(error))
    return 1
  except KeyboardInterrupt:
    Console.error('Da huy.')
    return 130
  return 0


if __name__ == '__main__':
  sys.exit(main())
