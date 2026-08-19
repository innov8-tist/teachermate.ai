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

echo "Waiting for Postgres at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
# Check if pg_isready is available (Docker environment)
if command -v pg_isready >/dev/null 2>&1; then
  until pg_isready -h "${POSTGRES_HOST:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; do
    sleep 2
  done
else
  # Fallback for local dev without pg_isready (e.g., Windows)
  echo "pg_isready not found, using Python-based connection check..."
  until python -c "import psycopg2; psycopg2.connect(host='${POSTGRES_HOST:-db}', port=${POSTGRES_PORT:-5432}, user='${POSTGRES_USER:-postgres}', password='${POSTGRES_PASSWORD}', dbname='${POSTGRES_DB}', connect_timeout=2)" 2>/dev/null; do
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

echo "✅ Migrations complete!"


