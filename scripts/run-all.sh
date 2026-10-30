#!/usr/bin/env bash
#
# Khoi dong toan bo Multi-User System (ban build production) o che do nen:
#   - N instance backend o 127.0.0.1:8081..(8080+N), sau nginx o cong 8080
#   - frontend (Next.js) o 0.0.0.0:3000
#
# Truoc khi chay, script goi stop-all.sh de dung moi tien trinh cu, roi
# (tuy chon) build, chay migration + seed. Log nam o .runtime/logs/, dung
# bang ./scripts/stop-all.sh.
#
# Su dung:
#   ./scripts/run-all.sh [--backends N] [--build] [--skip-migrate]
#     --backends N    so instance backend, 1-9 (mac dinh 3)
#     --build         goi build-all.sh truoc khi chay
#     --skip-migrate  bo qua prisma migrate deploy + seed

set -euo pipefail

SCRIPT_DIR="$(dirname "${BASH_SOURCE[0]}")"
# shellcheck source=lib/common.sh
source "$SCRIPT_DIR/lib/common.sh"

readonly STARTUP_TIMEOUT_SECONDS=60

BACKEND_COUNT=3
RUN_BUILD=false
SKIP_MIGRATE=false

while [ $# -gt 0 ]; do
  case "$1" in
    --backends)
      [[ "${2:-}" =~ ^[1-9]$ ]] || fail "--backends can mot so tu 1 den $MAX_BACKEND_INSTANCES."
      BACKEND_COUNT="$2"
      shift
      ;;
    --build) RUN_BUILD=true ;;
    --skip-migrate) SKIP_MIGRATE=true ;;
    *) fail "Tham so khong hop le: $1 (ho tro --backends N, --build, --skip-migrate)" ;;
  esac
  shift
done

require_command npm "Cai Node.js 20+ (kem npm) truoc."

"$SCRIPT_DIR/stop-all.sh"

if [ "$RUN_BUILD" = true ]; then
  "$SCRIPT_DIR/build-all.sh"
fi

[ -f "$BACKEND_DIR/.env" ] && [ -f "$FRONTEND_DIR/.env" ] ||
  fail "Thieu backend/.env hoac frontend/.env - chay ./scripts/build-all.sh truoc."
[ -d "$BACKEND_DIR/dist" ] || fail "Chua build backend - chay ./scripts/build-all.sh hoac them --build."
[ -d "$FRONTEND_DIR/.next" ] || fail "Chua build frontend - chay ./scripts/build-all.sh hoac them --build."

step "Kiem tra ket noi PostgreSQL"
DATABASE_URL=$(grep -E '^DATABASE_URL=' "$BACKEND_DIR/.env" | cut -d '=' -f2-)
is_db_reachable "$DATABASE_URL" ||
  fail "Khong ket noi duoc PostgreSQL theo DATABASE_URL trong backend/.env. Hay khoi dong Postgres truoc."
echo "Ket noi duoc PostgreSQL."

if [ "$SKIP_MIGRATE" = false ]; then
  step "Chay Prisma migrate deploy + seed"
  (cd "$BACKEND_DIR" && npm run db:migrate && npm run db:seed)
else
  echo "Bo qua migrate/seed (--skip-migrate)."
fi

mkdir -p "$LOG_DIR" "$PID_DIR"

# Chay lenh trong nhom tien trinh rieng (setsid) de stop-all.sh dung duoc
# ca npm lan tien trinh node con. $1 = ten, $2 = thu muc, con lai = lenh.
start_detached() {
  local name="$1" work_dir="$2"
  shift 2
  (cd "$work_dir" && setsid "$@" > "$LOG_DIR/$name.log" 2>&1 < /dev/null &
    echo $! > "$PID_DIR/$name.pid")
  echo "$name -> log: .runtime/logs/$name.log"
}

wait_for_port() {
  local port="$1"
  for _ in $(seq 1 "$STARTUP_TIMEOUT_SECONDS"); do
    is_port_busy "$port" && return 0
    sleep 1
  done
  return 1
}

step "Khoi dong $BACKEND_COUNT instance backend"
for i in $(seq 1 "$BACKEND_COUNT"); do
  port=$(backend_port "$i")
  start_detached "backend-$port" "$BACKEND_DIR" \
    env PORT="$port" HOST=127.0.0.1 TRUST_PROXY=loopback npm run start:prod
done

step "Khoi dong frontend"
start_detached "frontend-$FRONTEND_PORT" "$FRONTEND_DIR" \
  npm run start -- -p "$FRONTEND_PORT"

step "Cho cac dich vu san sang (toi da ${STARTUP_TIMEOUT_SECONDS}s)"
failed=false
for port in $(seq "$(backend_port 1)" "$(backend_port "$BACKEND_COUNT")") "$FRONTEND_PORT"; do
  if wait_for_port "$port"; then
    echo "[ok] cong $port"
  else
    warn "Cong $port chua san sang - xem log trong .runtime/logs/."
    failed=true
  fi
done

is_port_busy "$PROXY_PORT" ||
  warn "Chua co gi lang nghe o cong $PROXY_PORT - cai nginx voi deploy/nginx/multi-user-system.conf."

LAN_IP=$(get_lan_ip || true)
echo ""
echo "Frontend: http://${LAN_IP:-<IP-server>}:$FRONTEND_PORT"
echo "API:      http://${LAN_IP:-<IP-server>}:$PROXY_PORT/api/v1 (qua nginx)"
echo "Dung tat ca: ./scripts/stop-all.sh"

[ "$failed" = false ] || exit 1
