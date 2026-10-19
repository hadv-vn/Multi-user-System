#!/usr/bin/env bash
#
# Khoi dong toan bo he thong (backend + frontend) cho Multi-User System tren
# Bash (Git Bash, WSL, macOS, Linux), san sang truy cap tu cac may khac
# trong mang LAN.
#
# Chuan bi file .env cho backend va frontend (neu chua co), cai dependency,
# kiem tra Postgres, chay migration + seed, roi khoi dong backend (NestJS)
# va frontend (Next.js) song song trong cung mot terminal (log gop, Ctrl+C
# se dung ca hai). Script KHONG tu dong mo firewall (iptables/ufw khac nhau
# tuy distro) - xem phan canh bao in ra cuoi script de tu cau hinh.
#
# Su dung:
#   ./scripts/run-full.sh [--skip-install] [--skip-migrate]

set -uo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"
FRONTEND_DIR="$REPO_ROOT/frontend"

SKIP_INSTALL=false
SKIP_MIGRATE=false

for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
    *)
      echo "Tham so khong hop le: $arg (chi ho tro --skip-install, --skip-migrate)" >&2
      exit 1
      ;;
  esac
done

step() { echo -e "\n==> $1"; }
warn() { echo "[!] $1"; }

is_db_reachable() {
  local url="$1"
  local host_port
  host_port=$(echo "$url" | sed -nE 's#.*@([^:/]+):([0-9]+)/.*#\1 \2#p')
  if [ -z "$host_port" ]; then
    warn "Khong doc duoc host/port tu DATABASE_URL, bo qua kiem tra ket noi."
    return 0
  fi
  local db_host db_port
  read -r db_host db_port <<< "$host_port"
  (exec 3<>"/dev/tcp/$db_host/$db_port") 2>/dev/null
}

get_lan_ip() {
  if command -v ip >/dev/null 2>&1; then
    ip -4 addr show scope global | grep -oE 'inet [0-9.]+' | awk '{print $2}' | head -n1
  elif command -v ifconfig >/dev/null 2>&1; then
    ifconfig | grep -oE 'inet (addr:)?[0-9.]+' | grep -v '127.0.0.1' | awk '{print $2}' | sed 's/addr://' | head -n1
  fi
}

step "Kiem tra backend/.env"
BACKEND_ENV_PATH="$BACKEND_DIR/.env"
BACKEND_ENV_EXAMPLE_PATH="$BACKEND_DIR/.env.example"

if [ ! -f "$BACKEND_ENV_PATH" ]; then
  cp "$BACKEND_ENV_EXAMPLE_PATH" "$BACKEND_ENV_PATH"
  warn "Da tao backend/.env tu .env.example. Hay mo file nay va cap nhat DATABASE_URL, CSRF_SECRET, CORS_ORIGIN, APP_BASE_URL (dung IP LAN, khong de localhost)."
else
  echo "backend/.env da ton tai, giu nguyen."
fi

step "Kiem tra frontend/.env"
FRONTEND_ENV_PATH="$FRONTEND_DIR/.env"
FRONTEND_ENV_EXAMPLE_PATH="$FRONTEND_DIR/.env.example"

if [ ! -f "$FRONTEND_ENV_PATH" ]; then
  cp "$FRONTEND_ENV_EXAMPLE_PATH" "$FRONTEND_ENV_PATH"
  warn "Da tao frontend/.env tu .env.example. Hay sua NEXT_PUBLIC_API_BASE_URL thanh http://<IP-LAN-cua-may-nay>:3001/api/v1."
else
  echo "frontend/.env da ton tai, giu nguyen."
fi

LAN_IP=$(get_lan_ip || true)
if [ -n "$LAN_IP" ]; then
  echo "IP LAN phat hien duoc cua may nay: $LAN_IP"
  grep -q "$LAN_IP" "$BACKEND_ENV_PATH" || warn "backend/.env khong chua IP '$LAN_IP' - kiem tra lai CORS_ORIGIN/APP_BASE_URL neu IP vua doi."
  grep -q "$LAN_IP" "$FRONTEND_ENV_PATH" || warn "frontend/.env khong chua IP '$LAN_IP' - kiem tra lai NEXT_PUBLIC_API_BASE_URL neu IP vua doi."
else
  warn "Khong tu dong phat hien duoc IP LAN. Kiem tra thu cong bang 'ip addr' / 'ifconfig'."
fi

if [ "$SKIP_INSTALL" = false ]; then
  step "Cai dependency (npm install, root workspaces: backend + frontend)"
  (cd "$REPO_ROOT" && npm install)
else
  echo "Bo qua npm install (--skip-install)."
fi

step "Kiem tra ket noi PostgreSQL"
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$BACKEND_ENV_PATH" | cut -d '=' -f2-)

if is_db_reachable "$DATABASE_URL"; then
  echo "Ket noi duoc PostgreSQL."
else
  warn "Khong ket noi duoc PostgreSQL theo DATABASE_URL trong backend/.env."
  warn "Hay khoi dong PostgreSQL roi chay lai script nay, hoac cap nhat DATABASE_URL cho dung."
  if [ "$SKIP_MIGRATE" = false ]; then
    warn "Buoc migrate/seed phia duoi se that bai neu DB van chua san sang."
  fi
fi

if [ "$SKIP_MIGRATE" = false ]; then
  step "Chay Prisma migrate deploy + seed du lieu goc (role USER/ADMIN)"
  (cd "$BACKEND_DIR" && npm run db:migrate && npm run db:seed)
else
  echo "Bo qua migrate/seed (--skip-migrate)."
fi

warn "Script nay KHONG tu mo firewall. Neu may khac trong LAN khong ket noi duoc, tu mo cong 3000 va 3001:"
warn "  Ubuntu/Debian (ufw):  sudo ufw allow 3000/tcp && sudo ufw allow 3001/tcp"
warn "  firewalld (RHEL/Fedora): sudo firewall-cmd --add-port=3000/tcp --add-port=3001/tcp --permanent && sudo firewall-cmd --reload"

step "Khoi dong backend (NestJS, watch mode) + frontend (Next.js, watch mode)"
cleanup() {
  echo -e "\nDang dung backend + frontend..."
  [ -n "${BACKEND_PID:-}" ] && kill "$BACKEND_PID" 2>/dev/null
  [ -n "${FRONTEND_PID:-}" ] && kill "$FRONTEND_PID" 2>/dev/null
}
trap cleanup EXIT INT TERM

(cd "$BACKEND_DIR" && npm run start:dev) &
BACKEND_PID=$!

(cd "$FRONTEND_DIR" && npm run dev) &
FRONTEND_PID=$!

echo ""
echo "Backend:  http://localhost:3001$( [ -n "$LAN_IP" ] && echo " (LAN: http://$LAN_IP:3001)" )"
echo "Frontend: http://localhost:3000$( [ -n "$LAN_IP" ] && echo " (LAN: http://$LAN_IP:3000)" )"
echo ""
echo "Moi nguoi dung tu dang ky tai khoan rieng qua man hinh /register. Nhan Ctrl+C de dung ca hai."

wait
