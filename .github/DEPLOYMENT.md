# GitHub Actions Deployment Setup

## Required GitHub Secrets

Go to your repository → Settings → Environments → PROD → Add secret

Add these environment secrets to the **PROD** environment:

### 1. `EC2_SSH_KEY`
Your private SSH key content (the `.pem` file)

```bash
# Copy the content of your nirthaacc.pem file
cat ~/servers/nirthaacc.pem
```

**IMPORTANT**: Paste the **entire** content including the header and footer:
```
-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA...
(all the lines in between)
...
-----END RSA PRIVATE KEY-----
```

**Common issues:**
- ❌ Don't add extra spaces or newlines at the beginning/end
- ❌ Don't modify the key content
- ✅ Copy exactly as-is from the file
- ✅ Include both `-----BEGIN` and `-----END` lines

### 2. `EC2_HOST`
Your EC2 public IP or hostname
```
13.204.9.209
```

### 3. `EC2_USER`
SSH username (usually `ubuntu` for Ubuntu instances)
```
ubuntu
```

## How It Works

1. **Trigger**: Workflow runs automatically when you push to `main` branch and backend files change
2. **SSH**: GitHub Actions connects to your EC2 using the SSH key
3. **Deploy**: 
   - Pulls latest code
   - Rebuilds backend Docker image
   - Recreates backend container (keeps postgres running)
   - Runs migrations automatically (via start.sh)
   - Seeds data if database is empty (via Alembic env.py)
4. **Health Check**: Waits for backend to be healthy before completing

## Manual Deployment

You can also trigger deployment manually:
1. Go to Actions tab in GitHub
2. Select "Deploy Backend to EC2"
3. Click "Run workflow"

## What Happens on Server

```bash
cd ~/teachermate.ai
git pull origin main
cd backend
docker compose build backend
docker compose up -d --force-recreate backend
```

The workflow:
- ✅ Pulls latest code
- ✅ Rebuilds only backend (postgres stays running)
- ✅ Runs migrations via start.sh
- ✅ Seeds data automatically if DB is empty
- ✅ Zero-downtime for database
- ✅ Checks health before completing

## First Time Setup on EC2

Make sure your EC2 has:

```bash
# Clone repo
cd ~
git clone https://github.com/yourusername/teachermate.ai.git
cd teachermate.ai

# Start postgres (first time)
cd backend/postgres
docker compose up -d

# Start backend (first time)
cd ..
docker compose up -d
```

After this, GitHub Actions will handle all future deployments!

## Troubleshooting

### Check health status
```bash
curl http://13.204.9.209:8082/health
```

Expected response:
```json
{
  "status": "healthy",
  "message": "Service is running",
  "environment": "production",
  "timestamp": "2026-01-30T...",
  "version": "1.0.0",
  "services": {
    "database": {
      "status": "healthy",
      "message": "Database connection successful"
    },
    "s3": {
      "status": "available"
    }
  }
}
```

### Check deployment logs
```bash
ssh -i ~/servers/nirthaacc.pem ubuntu@13.204.9.209
docker logs teachermate-backend --tail 100 -f
```

### Check migrations
```bash
docker exec teachermate-backend uv run python -m alembic current
docker exec teachermate-backend uv run python -m alembic history
```

### Manual rollback
```bash
docker exec teachermate-backend uv run python -m alembic downgrade -1
```
