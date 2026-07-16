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
until pg_isready -h "${POSTGRES_HOST:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; do
  sleep 2
done

# Change to app directory (works both locally and in Docker)
if [ -d /app ]; then
  cd /app
else
  cd "$BACKEND_DIR"
fi

echo "Running Alembic migrations..."
uv run python -m alembic -c alembic.ini upgrade head

echo "Starting server..."
exec uv run python -m uvicorn server:app --host 0.0.0.0 --port "${PORT:-8000}"


