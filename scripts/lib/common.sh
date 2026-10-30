#!/usr/bin/env bash
#
# Hang so va ham dung chung cho build-all.sh, run-all.sh, stop-all.sh.
# File nay chi duoc `source`, khong chay truc tiep.

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
readonly REPO_ROOT
readonly BACKEND_DIR="$REPO_ROOT/backend"
readonly FRONTEND_DIR="$REPO_ROOT/frontend"
readonly RUNTIME_DIR="$REPO_ROOT/.runtime"
readonly LOG_DIR="$RUNTIME_DIR/logs"
readonly PID_DIR="$RUNTIME_DIR/pids"

readonly FRONTEND_PORT=3000
readonly PROXY_PORT=8080
readonly MAX_BACKEND_INSTANCES=9
readonly STOP_TIMEOUT_SECONDS=10

step() { echo -e "\n==> $1"; }
warn() { echo "[!] $1"; }
fail() {
  echo "[x] $1" >&2
  exit 1
}

# Cong cua instance backend thu i (1..9): 8081..8089.
backend_port() {
  echo $((PROXY_PORT + $1))
}

# Tat ca cong ma script quan ly (frontend + moi slot backend).
managed_ports() {
  echo "$FRONTEND_PORT"
  for i in $(seq 1 "$MAX_BACKEND_INSTANCES"); do
    backend_port "$i"
  done
}

get_lan_ip() {
  ip -4 addr show scope global 2>/dev/null | grep -oE 'inet [0-9.]+' | awk '{print $2}' | head -n1
}

is_port_busy() {
  ss -tlnH "sport = :$1" 2>/dev/null | grep -q LISTEN
}

# PID cac tien trinh (cua user hien tai) dang lang nghe o cong $1.
pids_on_port() {
  ss -tlnpH "sport = :$1" 2>/dev/null | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -u
}

is_db_reachable() {
  local url="$1"
  local host_port db_host db_port
  host_port=$(echo "$url" | sed -nE 's#.*@([^:/]+):([0-9]+)/.*#\1 \2#p')
  if [ -z "$host_port" ]; then
    warn "Khong doc duoc host/port tu DATABASE_URL, bo qua kiem tra ket noi."
    return 0
  fi
  read -r db_host db_port <<< "$host_port"
  (exec 3<>"/dev/tcp/$db_host/$db_port") 2>/dev/null
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Chua cai '$1'. $2"
}
