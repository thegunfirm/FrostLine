#!/usr/bin/env bash
set -euo pipefail
set +H   # prevent history expansion from '!' in secrets

ENV_FILE="/root/pm2/frostline.env"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "::error::$ENV_FILE missing"
  exit 1
fi
chmod 600 "$ENV_FILE"
set -a; . "$ENV_FILE"; set +a

# Some app code reads RSR_PORT; keep both to avoid NaN in logs
export RSR_PORT="${RSR_PORT:-${RSR_FTP_PORT:-2222}}"

APP_HOST="${APP_HOST:-${ORIGIN_HOST:-thegunfirm.com}}"
APP_PORT="${PORT:-5000}"

echo "==> Using DATABASE_URL from env"
DBURL="${DATABASE_URL:?DATABASE_URL is required}"

# Parse DATABASE_URL  postgresql://user:pass@host:port/db
db_user="$(printf '%s' "$DBURL" | sed -nE 's~^[a-z]+://([^:/@]+).*@\S+$~\1~p')"
db_pass="$(printf '%s' "$DBURL" | sed -nE 's~^[a-z]+://[^:]+:([^@]+)@.*$~\1~p')"
db_host="$(printf '%s' "$DBURL" | sed -nE 's~^[a-z]+://[^@]+@([^:/?]+).*$~\1~p')"
db_port="$(printf '%s' "$DBURL" | sed -nE 's~^[a-z]+://[^@]+@[^:/?]+:([0-9]+).*$~\1~p')"
db_name="$(printf '%s' "$DBURL" | sed -nE 's~.*/([^/?]+).*~\1~p')"
db_port="${db_port:-5432}"

echo "==> DB parsed: user=${db_user} host=${db_host} port=${db_port} db=${db_name}"

pg() { PGPASSWORD="${db_pass}" psql -h "${db_host}" -p "${db_port}" -U "${db_user}" -d "${db_name}" -v ON_ERROR_STOP=1 "$@"; }
has_table() { pg -Atc "select to_regclass('public.$1') is not null;" 2>/dev/null | grep -qx t; }

run_migrations() {
  echo "==> Attempting DB migrations (best effort)"
  cd /var/www/frostline || return 0

  if command -v npx >/dev/null 2>&1; then
    # Prisma
    if [[ -f prisma/schema.prisma ]]; then
      npx --yes prisma migrate deploy || true
    fi
    # Knex
    if [[ -f knexfile.js || -f knexfile.ts ]]; then
      npx --yes knex migrate:latest || true
    fi
    # TypeORM (generic)
    if ls dist/**/migrations/*.js >/dev/null 2>&1; then
      npx --yes typeorm migration:run || true
    fi
  fi

  # SQL fallbacks (common locations)
  for f in migrations/*.sql server/db/schema.sql db/schema.sql; do
    if [[ -f "$f" ]]; then
      echo "==> Applying $f"
      PGPASSWORD="${db_pass}" psql -h "${db_host}" -p "${db_port}" -U "${db_user}" -d "${db_name}" -v ON_ERROR_STOP=1 -f "$f" || true
    fi
  done
}

# --- If DB is local, ensure role/db and align password; take a backup ---
if [[ "$db_host" == "127.0.0.1" || "$db_host" == "localhost" ]]; then
  echo "==> Waiting for local PostgreSQL…"
  timeout 30 bash -c "until pg_isready -h 127.0.0.1 -p ${db_port} -U postgres >/dev/null 2>&1; do sleep 1; done" || {
    echo "::warning::pg_isready not OK; proceeding anyway"
  }

  echo "==> Create role/db if missing and align password"
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='${db_user}') THEN
    CREATE ROLE "${db_user}" LOGIN PASSWORD 'temp';
  END IF;
END \$\$;
SQL

  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
DO \$\$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_database WHERE datname='${db_name}') THEN
    CREATE DATABASE "${db_name}" OWNER "${db_user}";
  END IF;
END \$\$;
SQL

  tag="pw$(date +%s%N)"
  sql="ALTER ROLE \"${db_user}\" WITH LOGIN PASSWORD \$${tag}\$${db_pass}\$${tag}\$;"
  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "$sql"

  sudo -u postgres psql -v ON_ERROR_STOP=1 -c "ALTER DATABASE \"${db_name}\" OWNER TO \"${db_user}\";"

  echo "==> Taking pg_dump backup (custom format)"
  backup_dir="/root/pm2/backups"; mkdir -p "$backup_dir"
  sudo -u postgres pg_dump -Fc -Z9 -f "${backup_dir}/$(date +%Y%m%d%H%M%S)-${db_name}.dump" "${db_name}" || true
  ls -1t "${backup_dir}"/*-"${db_name}".dump 2>/dev/null | tail -n +6 | xargs -r rm -f || true
else
  echo "==> Skipping DB maintenance (non-local host: ${db_host})"
fi

# --- Schema preflight: require products table, try migrations if missing ---
if ! has_table products; then
  echo "::warning::Required table 'products' is missing; attempting migrations…"
  run_migrations
  if ! has_table products; then
    echo "::error::DB schema is missing 'products'. Add/run your migrations (Prisma/Knex/TypeORM or an SQL schema) and re-deploy."
    exit 1
  fi
fi

# --- Restart app with PM2 and persist ---
echo "==> Restarting pm2 app"
cd /var/www/frostline
pm2 restart frostline --update-env --cwd /var/www/frostline
pm2 save

# --- Wait for app and probe nginx ---
echo "==> Waiting for app on :${APP_PORT}"
for i in {1..60}; do
  curl -sS -m 1 "http://127.0.0.1:${APP_PORT}/" >/dev/null && break
  sleep 1
done
curl -sSI "http://127.0.0.1:${APP_PORT}/" | head -1 || true

echo "==> Probing nginx -> app"
curl -sSI -H "Host: ${APP_HOST}" http://127.0.0.1/ | head -1 || true

# --- Show recent RSR/FTP/import logs ---
echo "==> Recent RSR/FTP/import logs"
pm2 logs frostline --lines 200 --nostream \
  | egrep -i 'rsr|Connecting FTPS|> USER|< 331|< 230|IM-QTY|FULL|download|insert|upsert|error' || true

echo "==> Done."
