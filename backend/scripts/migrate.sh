#!/bin/sh
set -eu

# Determine the script's directory
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# Load .env file from backend directory
if [ -f "$BACKEND_DIR/.env" ]; then
  echo "Loading environment from $BACKEND_DIR/.env"
  export $(cat "$BACKEND_DIR/.env" | grep -v '^#' | xargs)
elif [ -f /app/.env ]; then
  echo "Loading environment from /app/.env"
  export $(cat /app/.env | grep -v '^#' | xargs)
fi

# Determine host and port for database connection
HOST="${POSTGRES_HOST:-db}"
PORT="${POSTGRES_PORT:-5432}"

# If running directly on host and 'db' cannot be resolved, fallback to localhost
if [ ! -f /.dockerenv ] && [ "$HOST" = "db" ]; then
  if ! ping -c 1 -W 1 db >/dev/null 2>&1 && ! getent hosts db >/dev/null 2>&1; then
    echo "ℹ️  'db' host is not resolvable on the host machine. Falling back to localhost:${PORT}..."
    HOST="localhost"
    export POSTGRES_HOST="localhost"
    # Also update DB_URL_POSTGRES if it pointed to @db:
    if [ -n "${DB_URL_POSTGRES:-}" ]; then
      export DB_URL_POSTGRES=$(echo "$DB_URL_POSTGRES" | sed "s/@db:[0-9]*/@localhost:${PORT}/" | sed "s/@db\//@localhost:${PORT}\//")
    fi
  fi
fi

echo "Waiting for Postgres at ${HOST}:${PORT}..."
# Check if pg_isready is available (Docker environment)
if command -v pg_isready >/dev/null 2>&1; then
  until pg_isready -h "${HOST}" -p "${PORT}" -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; do
    sleep 2
  done
else
  # Fallback for local dev without pg_isready
  echo "pg_isready not found, using Python-based connection check..."
  until uv run python -c "import psycopg2; psycopg2.connect(host='${HOST}', port=${PORT}, user='${POSTGRES_USER:-postgres}', password='${POSTGRES_PASSWORD}', dbname='${POSTGRES_DB}', connect_timeout=2)" 2>/dev/null; do
    sleep 2
  done
fi

# Change to app directory (works both locally and in Docker)
if [ -d /app ]; then
  cd /app
else
  cd "$BACKEND_DIR"
fi

echo "✅ Applying Alembic migrations..."
uv run python -m alembic -c alembic.ini upgrade head

echo "✅ Syncing seed data..."
uv run python -m db_service.seed_data

echo "✅ Migrations and seeding complete!"


