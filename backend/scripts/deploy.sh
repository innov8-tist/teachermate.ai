#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📦 Pulling latest code..."
git pull origin main

# Navigate to backend
cd "$(dirname "$0")/.."

# Stop backend containers
echo "🔄 Stopping backend container..."
docker rm -f teachermate-backend 2>/dev/null || true
docker rm -f teachermate-migrate 2>/dev/null || true

# Rebuild backend with cache
echo "🔨 Rebuilding backend (with BuildKit cache)..."
DOCKER_BUILDKIT=1 docker compose build --pull backend

# Start services
echo "🚀 Starting services..."
docker compose up -d

# Wait for migrations
echo "⏳ Waiting for migrations to complete..."
timeout 120 sh -c 'until [ "$(docker inspect -f {{.State.Status}} teachermate-migrate 2>/dev/null)" = "exited" ]; do sleep 2; done' || {
  echo "❌ Migrations timed out"
  docker logs teachermate-migrate --tail 50
  exit 1
}

# Wait for health check
echo "⏳ Waiting for backend to be healthy..."
timeout 120 sh -c 'until docker inspect --format="{{.State.Health.Status}}" teachermate-backend 2>/dev/null | grep -q "healthy"; do sleep 2; done' || {
  echo "❌ Backend failed to become healthy"
  docker logs teachermate-backend --tail 50
  exit 1
}

# Cleanup old images
echo "🧹 Cleaning up old images..."
docker image prune -f

echo ""
echo "✅ Deployment successful!"
echo ""
echo "Current status:"
docker ps --filter name=teachermate

echo ""
echo "Health check:"
curl -s http://localhost:8082/health | python3 -m json.tool 2>/dev/null || echo "Health check pending..."

echo ""
echo "Recent logs:"
docker logs teachermate-backend --tail 20
