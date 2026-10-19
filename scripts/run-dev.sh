#!/usr/bin/env bash
#
# Khoi dong moi truong phat trien (dev) cho Multi-User System tren Bash
# (Git Bash, WSL, macOS, Linux).
#
# Chuan bi file .env cho backend (neu chua co), cai dependency, kiem tra
# Postgres co the ket noi duoc khong, chay migration + seed, roi khoi dong
# NestJS backend o che do watch. Frontend (Next.js) chua duoc khoi tao
# trong repo nen script chi chay backend; se bo sung khi frontend/ ton tai.
#
# Su dung:
#   ./scripts/run-dev.sh [--skip-install] [--skip-migrate]

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$REPO_ROOT/backend"

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

step "Kiem tra backend/.env"
ENV_PATH="$BACKEND_DIR/.env"
ENV_EXAMPLE_PATH="$BACKEND_DIR/.env.example"

if [ ! -f "$ENV_PATH" ]; then
  cp "$ENV_EXAMPLE_PATH" "$ENV_PATH"
  warn "Da tao backend/.env tu .env.example. Hay mo file nay va cap nhat gia tri thuc te (DATABASE_URL, CSRF_SECRET, SMTP_*) truoc khi dung cho production."
else
  echo "backend/.env da ton tai, giu nguyen."
fi

if [ "$SKIP_INSTALL" = false ]; then
  step "Cai dependency (npm install, root workspaces)"
  (cd "$REPO_ROOT" && npm install)
else
  echo "Bo qua npm install (--skip-install)."
fi

step "Kiem tra ket noi PostgreSQL"
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$ENV_PATH" | cut -d '=' -f2-)

if is_db_reachable "$DATABASE_URL"; then
  echo "Ket noi duoc PostgreSQL."
else
  warn "Khong ket noi duoc PostgreSQL theo DATABASE_URL trong backend/.env."
  warn "Hay khoi dong PostgreSQL (service local hoac container) roi chay lai script nay, hoac cap nhat DATABASE_URL cho dung."
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

step "Khoi dong backend (NestJS, watch mode, http://localhost:3001)"
cd "$BACKEND_DIR"
npm run start:dev
