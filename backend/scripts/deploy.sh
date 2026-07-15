#!/bin/bash
set -e

echo "🚀 Starting deployment..."

# Pull latest changes
echo "📦 Pulling latest code..."
git pull origin main

# Navigate to backend
cd "$(dirname "$0")/.."

# Rebuild backend
echo "🔨 Rebuilding backend..."
docker compose build backend

# Stop and remove backend containers (keep DB running)
echo "🔄 Stopping backend container..."
docker rm -f teachermate-backend 2>/dev/null || true
docker rm -f teachermate-migrate 2>/dev/null || true

# Start services
echo "🚀 Starting services..."
docker compose up -d

# Wait for health check
echo "⏳ Waiting for backend to be healthy..."
timeout 60 sh -c 'until docker inspect --format="{{.State.Health.Status}}" teachermate-backend 2>/dev/null | grep -q "healthy"; do sleep 2; done' || {
  echo "❌ Backend failed to become healthy"
  docker logs teachermate-backend --tail 50
  exit 1
}

echo "✅ Deployment successful!"
echo ""
echo "Current status:"
docker ps --filter name=teachermate

echo ""
echo "Recent logs:"
docker logs teachermate-backend --tail 20
