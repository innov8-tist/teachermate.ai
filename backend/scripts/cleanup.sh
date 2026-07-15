#!/bin/bash
# Cleanup script to fix container conflicts

set -e

echo "🧹 Cleaning up backend containers..."

cd "$(dirname "$0")/.."

# Remove backend containers (keep database!)
echo "Stopping backend containers..."
docker rm -f teachermate-backend 2>/dev/null || true
docker rm -f teachermate-migrate 2>/dev/null || true

# Remove auto-generated containers if they exist
docker rm -f backend-backend-1 2>/dev/null || true
docker rm -f backend-migrate-1 2>/dev/null || true

# Remove old images
echo "Removing old backend images..."
docker rmi backend-backend:latest 2>/dev/null || true
docker rmi backend-migrate:latest 2>/dev/null || true

# Prune dangling images
echo "Pruning dangling images..."
docker image prune -f

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Database container status:"
docker ps --filter name=teachermate-db
echo ""
echo "Now run: docker compose up -d"
