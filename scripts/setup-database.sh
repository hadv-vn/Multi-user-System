#!/usr/bin/env bash
#
# Tao user + database PostgreSQL theo DATABASE_URL trong backend/.env (chay
# mot lan, can sudo). Idempotent: chay lai se chi dat lai mat khau user cho
# khop .env, khong xoa du lieu.
#
# Mat khau doc tu .env va truyen cho psql qua bien moi truong, khong hien
# tren dong lenh. Chi ho tro Postgres cai tren chinh server (localhost).
#
# Su dung:
#   ./scripts/setup-database.sh

set -euo pipefail

# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

[ -f "$BACKEND_DIR/.env" ] || fail "Chua co backend/.env - chay ./scripts/build-all.sh truoc."
command -v psql >/dev/null 2>&1 ||
  fail "Chua cai PostgreSQL. Cai bang: sudo apt install -y postgresql"

DATABASE_URL=$(grep -E '^DATABASE_URL=' "$BACKEND_DIR/.env" | cut -d '=' -f2-)
parsed=$(echo "$DATABASE_URL" |
  sed -nE 's#^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):([0-9]+)/([^?]+).*#\2 \3 \4 \5 \6#p')
[ -n "$parsed" ] || fail "DATABASE_URL khong dung dang postgresql://user:password@host:port/db."
read -r DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME <<< "$parsed"

case "$DB_HOST" in
  localhost | 127.0.0.1) ;;
  *) fail "DATABASE_URL tro toi '$DB_HOST' - script chi tao DB tren chinh server (localhost)." ;;
esac

step "Tao user '$DB_USER' va database '$DB_NAME' (port $DB_PORT)"
sudo -u postgres env DB_USER="$DB_USER" DB_PASSWORD="$DB_PASSWORD" DB_NAME="$DB_NAME" \
  psql -p "$DB_PORT" -v ON_ERROR_STOP=1 -q <<'SQL'
\getenv db_user DB_USER
\getenv db_password DB_PASSWORD
\getenv db_name DB_NAME
SELECT format('CREATE ROLE %I LOGIN', :'db_user')
  WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = :'db_user') \gexec
ALTER ROLE :"db_user" WITH LOGIN PASSWORD :'db_password';
SELECT format('CREATE DATABASE %I OWNER %I', :'db_name', :'db_user')
  WHERE NOT EXISTS (SELECT 1 FROM pg_database WHERE datname = :'db_name') \gexec
SQL

if is_db_reachable "$DATABASE_URL"; then
  echo "Xong. Ket noi duoc PostgreSQL o $DB_HOST:$DB_PORT."
else
  fail "Da tao user/DB nhung khong ket noi duoc $DB_HOST:$DB_PORT - kiem tra 'systemctl status postgresql'."
fi
