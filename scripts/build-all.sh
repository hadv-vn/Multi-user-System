#!/usr/bin/env bash
#
# Build backend (Prisma generate + NestJS) va frontend (Next.js) cho
# Multi-User System.
#
# Neu chua co backend/.env hoac frontend/.env, script tao tu .env.example
# va tu dien IP LAN cua server (CORS_ORIGIN, APP_BASE_URL,
# NEXT_PUBLIC_API_BASE_URL) cung CSRF_SECRET ngau nhien. File .env da ton
# tai thi giu nguyen.
#
# Luu y: NEXT_PUBLIC_API_BASE_URL duoc nhung vao frontend luc build, doi gia
# tri nay thi phai build lai.
#
# Su dung:
#   ./scripts/build-all.sh [--skip-install]

set -euo pipefail

# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

SKIP_INSTALL=false

for arg in "$@"; do
  case "$arg" in
    --skip-install) SKIP_INSTALL=true ;;
    *) fail "Tham so khong hop le: $arg (chi ho tro --skip-install)" ;;
  esac
done

require_supported_node

LAN_IP=$(get_lan_ip || true)
[ -n "$LAN_IP" ] || fail "Khong phat hien duoc IP LAN cua server (kiem tra 'ip addr')."
echo "IP server: $LAN_IP"

step "Kiem tra backend/.env"
if [ ! -f "$BACKEND_DIR/.env" ]; then
  sed -e "s#^CORS_ORIGIN=.*#CORS_ORIGIN=http://$LAN_IP:$FRONTEND_PORT#" \
    -e "s#^APP_BASE_URL=.*#APP_BASE_URL=http://$LAN_IP:$FRONTEND_PORT#" \
    -e "s#^CSRF_SECRET=.*#CSRF_SECRET=$(openssl rand -hex 32)#" \
    "$BACKEND_DIR/.env.example" > "$BACKEND_DIR/.env"
  warn "Da tao backend/.env voi IP $LAN_IP. Kiem tra lai DATABASE_URL va SMTP_*."
else
  echo "Giu nguyen backend/.env."
  grep -q "$LAN_IP" "$BACKEND_DIR/.env" ||
    warn "backend/.env khong chua IP $LAN_IP - kiem tra CORS_ORIGIN/APP_BASE_URL."
fi

step "Kiem tra frontend/.env"
if [ ! -f "$FRONTEND_DIR/.env" ]; then
  sed -e "s#^NEXT_PUBLIC_API_BASE_URL=.*#NEXT_PUBLIC_API_BASE_URL=http://$LAN_IP:$BACKEND_PORT/api/v1#" \
    "$FRONTEND_DIR/.env.example" > "$FRONTEND_DIR/.env"
  warn "Da tao frontend/.env voi API http://$LAN_IP:$BACKEND_PORT/api/v1."
else
  echo "Giu nguyen frontend/.env."
  grep -q "$LAN_IP:$BACKEND_PORT" "$FRONTEND_DIR/.env" ||
    warn "frontend/.env khong tro toi http://$LAN_IP:$BACKEND_PORT - kiem tra NEXT_PUBLIC_API_BASE_URL."
fi

if [ "$SKIP_INSTALL" = false ]; then
  step "Cai dependency (npm install, workspaces backend + frontend)"
  (cd "$REPO_ROOT" && npm install)
else
  echo "Bo qua npm install (--skip-install)."
fi

step "Build backend"
(cd "$REPO_ROOT" && npm run build --workspace=backend)

step "Build frontend"
(cd "$REPO_ROOT" && npm run build --workspace=frontend)

echo ""
echo "Build xong. Chay ./scripts/run-all.sh de khoi dong."
