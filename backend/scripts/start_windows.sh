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

# Use Python to check PostgreSQL connection instead of pg_isready
until uv run python -c "import psycopg2; psycopg2.connect(host='${POSTGRES_HOST:-db}', port=${POSTGRES_PORT:-5432}, user='${POSTGRES_USER:-postgres}', password='${POSTGRES_PASSWORD}', dbname='${POSTGRES_DB}')" 2>/dev/null; do
  echo "Waiting for database..."
  sleep 2
done

echo "Database is ready!"

# Change to app directory (works both locally and in Docker)
if [ -d /app ]; then
  cd /app
else
  cd "$BACKEND_DIR"
fi

echo "Running Alembic migrations..."
uv run python -m alembic -c alembic.ini upgrade head

echo "Migrations and seeding complete. Exiting."
