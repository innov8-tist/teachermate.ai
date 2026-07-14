#!/bin/sh
set -eu

echo "Waiting for Postgres at ${POSTGRES_HOST:-db}:${POSTGRES_PORT:-5432}..."
until pg_isready -h "${POSTGRES_HOST:-db}" -p "${POSTGRES_PORT:-5432}" -U "${POSTGRES_USER:-postgres}" >/dev/null 2>&1; do
  sleep 2
done

echo "Running Alembic migrations..."
uv run alembic upgrade head

exec uv run uvicorn server:app --host 0.0.0.0 --port "${PORT:-8000}"
