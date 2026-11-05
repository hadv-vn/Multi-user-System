#!/usr/bin/env bash
#
# Tao moi hoac reset mot tai khoan ADMIN truc tiep trong database.
#
# - Email chua ton tai: tao user moi (ACTIVE, da xac thuc email) voi role ADMIN.
# - Email da ton tai: dat lai mat khau, mo khoa (ACTIVE, xoa dem dang nhap sai,
#   bo khoa tam), gan them role ADMIN neu chua co, va dang xuat moi phien cu.
#
# Chi can sua khoi CAU HINH ngay ben duoi roi chay:
#   ./scripts/reset-admin.sh
#
# Ket noi DB theo DATABASE_URL trong backend/.env. Mat khau duoc bam bcrypt
# giong backend (BCRYPT_SALT_ROUNDS), khong luu plain text.

set -euo pipefail

# ============================== CAU HINH ==============================
ADMIN_EMAIL="admin@gmail.com"
ADMIN_PASSWORD="Ha@12345"  # >= 8 ky tu, co it nhat 1 chu cai va 1 chu so
ADMIN_NAME=""                 # de trong = giu nguyen ten hien tai
# ======================================================================

# shellcheck source=lib/common.sh
source "$(dirname "${BASH_SOURCE[0]}")/lib/common.sh"

readonly PASSWORD_MIN_LENGTH=8   # phai khop backend/src/auth/dto/password-rules.ts
readonly PASSWORD_MAX_LENGTH=128
readonly DEFAULT_BCRYPT_SALT_ROUNDS=12

read_env_value() {
  grep -E "^$1=" "$BACKEND_DIR/.env" | cut -d '=' -f2- || true
}

validate_input() {
  ADMIN_EMAIL=$(echo "$ADMIN_EMAIL" | tr -d '[:space:]' | tr '[:upper:]' '[:lower:]')
  [[ "$ADMIN_EMAIL" =~ ^[^@]+@[^@]+\.[^@]+$ ]] || fail "ADMIN_EMAIL '$ADMIN_EMAIL' khong hop le."

  local length=${#ADMIN_PASSWORD}
  if [ "$length" -lt "$PASSWORD_MIN_LENGTH" ] || [ "$length" -gt "$PASSWORD_MAX_LENGTH" ] ||
    [[ ! "$ADMIN_PASSWORD" =~ [A-Za-z] ]] || [[ ! "$ADMIN_PASSWORD" =~ [0-9] ]]; then
    fail "ADMIN_PASSWORD phai co $PASSWORD_MIN_LENGTH-$PASSWORD_MAX_LENGTH ky tu, gom it nhat 1 chu cai va 1 chu so."
  fi
}

hash_password() {
  local salt_rounds
  salt_rounds=$(read_env_value BCRYPT_SALT_ROUNDS)
  (cd "$BACKEND_DIR" && PASSWORD="$ADMIN_PASSWORD" SALT_ROUNDS="${salt_rounds:-$DEFAULT_BCRYPT_SALT_ROUNDS}" \
    node -e "console.log(require('bcrypt').hashSync(process.env.PASSWORD, Number(process.env.SALT_ROUNDS)))")
}

[ -f "$BACKEND_DIR/.env" ] || fail "Chua co backend/.env - chay ./scripts/build-all.sh truoc."
require_command psql "Cai bang: sudo apt install -y postgresql-client"
require_supported_node
(cd "$BACKEND_DIR" && node -e "require.resolve('bcrypt')" 2>/dev/null) ||
  fail "Chua cai dependency (thieu bcrypt) - chay 'npm install' o thu muc goc repo truoc."
validate_input

DATABASE_URL=$(read_env_value DATABASE_URL)
parsed=$(echo "$DATABASE_URL" |
  sed -nE 's#^postgres(ql)?://([^:]+):([^@]+)@([^:/]+):([0-9]+)/([^?]+).*#\2 \3 \4 \5 \6#p')
[ -n "$parsed" ] || fail "DATABASE_URL khong dung dang postgresql://user:password@host:port/db."
read -r DB_USER DB_PASSWORD DB_HOST DB_PORT DB_NAME <<< "$parsed"

run_psql() {
  PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
    -v ON_ERROR_STOP=1 -q "$@"
}

is_db_reachable "$DATABASE_URL" || fail "Khong ket noi duoc PostgreSQL o $DB_HOST:$DB_PORT."
[ "$(run_psql -tAc "SELECT count(*) FROM roles WHERE name = 'ADMIN'")" = "1" ] ||
  fail "Chua co role ADMIN - chay 'npm run db:migrate --workspace=backend && npm run db:seed --workspace=backend' truoc."

step "Bam mat khau (bcrypt)"
PASSWORD_HASH=$(hash_password)

step "Tao/reset admin $ADMIN_EMAIL"
PASSWORD_HASH="$PASSWORD_HASH" ADMIN_EMAIL="$ADMIN_EMAIL" ADMIN_NAME="$ADMIN_NAME" run_psql <<'SQL'
\getenv admin_email ADMIN_EMAIL
\getenv admin_name ADMIN_NAME
\getenv password_hash PASSWORD_HASH
BEGIN;

INSERT INTO users (id, email, password_hash, name, email_verified_at, status, updated_at)
VALUES (gen_random_uuid(), :'admin_email', :'password_hash', NULLIF(:'admin_name', ''),
        now(), 'ACTIVE', now())
ON CONFLICT (email) DO UPDATE SET
  password_hash = EXCLUDED.password_hash,
  name = COALESCE(EXCLUDED.name, users.name),
  email_verified_at = COALESCE(users.email_verified_at, now()),
  status = 'ACTIVE',
  failed_login_attempts = 0,
  locked_until = NULL,
  disabled_at = NULL,
  updated_at = now();

INSERT INTO user_roles (user_id, role_id)
SELECT u.id, r.id FROM users u CROSS JOIN roles r
WHERE u.email = :'admin_email' AND r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Mat khau vua doi: huy moi phien dang nhap cu cua tai khoan nay.
DELETE FROM sessions WHERE user_id = (SELECT id FROM users WHERE email = :'admin_email');

COMMIT;

SELECT u.email, u.name, u.status, string_agg(r.name, ', ' ORDER BY r.name) AS roles
FROM users u
JOIN user_roles ur ON ur.user_id = u.id
JOIN roles r ON r.id = ur.role_id
WHERE u.email = :'admin_email'
GROUP BY u.email, u.name, u.status;
SQL

echo "Xong. Dang nhap bang $ADMIN_EMAIL voi mat khau trong ADMIN_PASSWORD."
