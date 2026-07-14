# EC2 deployment

This project is set up to run the backend and its Postgres database with Docker Compose.

## 1. Prepare environment

Copy the sample file and fill in the real secrets:

```bash
cp .env.example .env
```

Important values:

- `BACKEND_BIND_IP`: default is `0.0.0.0`, matching the pattern you already use for other containers.
- `BACKEND_PORT`: host port exposed on EC2. Default is `8082`, following your existing `8080` and `8081`.
- `POSTGRES_BIND_IP`: default is `0.0.0.0`, matching your existing DB containers.
- `POSTGRES_HOST_PORT`: host port for Postgres. Default is `5434`, following your existing `5432` and `5433`.
- `POSTGRES_PASSWORD`: required for the internal Postgres container.
- `DB_URL_POSTGRES`: keep the host as `db` when using Compose.
- `GOOGLE_GEMINI_API_KEY`, `GROQ_API_KEY`, `JWT_SECRET_KEY`, and AWS S3 values: set these to production values.

## 2. Start the stack

```bash
docker compose up -d --build
```

What happens:

- `db` starts first.
- `migrate` waits for Postgres, runs `alembic upgrade head`, and Alembic auto-seeds the baseline subject/student data.
- `backend` starts only after migrations finish successfully.

## 3. Useful commands

Run migrations manually:

```bash
docker compose run --rm migrate
```

Local migration flow stays the same:

```bash
cd backend
uv run alembic revision --autogenerate -m "good boy"
uv run alembic upgrade head
```

View logs:

```bash
docker compose logs -f backend
docker compose logs -f migrate
docker compose logs -f db
```

Stop the stack:

```bash
docker compose down
```

Stop and remove volumes too:

```bash
docker compose down -v
```

## 4. EC2 notes

- Expose `BACKEND_PORT` in your EC2 security group if the API should be reachable directly.
- Expose `POSTGRES_HOST_PORT` only if you actually need DB access from outside Docker.
- If you run a reverse proxy such as Nginx, proxy traffic to `127.0.0.1:${BACKEND_PORT}` or keep Docker bound on `0.0.0.0` and proxy to the host IP.
- Internal container ports do not clash with other Docker apps on the same EC2 host. Only published host ports must be unique.

## 5. Frontend/mobile app

The Expo app is not part of this Compose stack. Point the app API base URL to your EC2 backend URL and exposed port after deployment.
