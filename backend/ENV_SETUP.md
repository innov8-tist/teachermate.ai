# Environment Setup Guide

## Required Environment Variables

Make sure your `backend/.env` file has these variables:

```bash
# Application
ENVIRONMENT=production
PORT=8000

# PostgreSQL Connection
POSTGRES_DB=teachermate
POSTGRES_USER=postgres
POSTGRES_PASSWORD=change-me
POSTGRES_HOST=db
POSTGRES_PORT=5432
DB_URL_POSTGRES=postgresql+psycopg2://postgres:change-me@db:5432/teachermate

# JWT Authentication
JWT_SECRET_KEY=your-super-secret-jwt-key-change-this-in-production

# AI APIs
GOOGLE_GEMINI_API_KEY=your-api-key-here
GROQ_API_KEY=your-api-key-here

# AWS S3 (Optional)
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_DEFAULT_REGION=us-east-1
S3_BUCKET_NAME=teacher-pfp-bucket
USE_LOCALSTACK=false
AWS_ENDPOINT_URL=
PUBLIC_ENDPOINT_URL=
```

## Important Notes

### 1. Database Host
The `POSTGRES_HOST` **must** be set to `db` (the docker-compose service name):
```bash
POSTGRES_HOST=db
```

**NOT** `localhost`, `postgres`, or `127.0.0.1` when running in Docker.

### 2. Database URL
The connection string should match:
```bash
DB_URL_POSTGRES=postgresql+psycopg2://postgres:change-me@db:5432/teachermate
```

Format: `postgresql+psycopg2://{user}:{password}@{host}:{port}/{database}`

### 3. Security
Change these in production:
- `POSTGRES_PASSWORD` - Use a strong password
- `JWT_SECRET_KEY` - Generate a random secure key

### 4. API Keys
Get your API keys from:
- Google Gemini: https://makersuite.google.com/app/apikey
- Groq: https://console.groq.com/keys

## Verification

After updating `.env`, restart the backend:

```bash
cd ~/teachermate.ai/backend
docker compose down
docker compose up -d
```

Check logs:
```bash
docker logs teachermate-backend -f
```

Test health endpoint:
```bash
curl http://localhost:8082/health
```
