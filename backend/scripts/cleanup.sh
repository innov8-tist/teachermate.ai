#!/bin/bash
# Cleanup script to fix container conflicts and start fresh

set -e

echo "🧹 Cleaning up Docker containers and images..."

cd "$(dirname "$0")/.."

# Stop and remove all containers
echo "Stopping all containers..."
docker compose down --remove-orphans

# Remove old container by name if it exists
if docker ps -a | grep -q teachermate-postgres; then
  echo "Removing old teachermate-postgres container..."
  docker rm -f teachermate-postgres || true
fi

if docker ps -a | grep -q teachermate-backend; then
  echo "Removing old teachermate-backend container..."
  docker rm -f teachermate-backend || true
fi

if docker ps -a | grep -q teachermate-migrate; then
  echo "Removing old teachermate-migrate container..."
  docker rm -f teachermate-migrate || true
fi

# Remove old images
echo "Removing old images..."
docker rmi backend-backend:latest 2>/dev/null || true
docker rmi backend-migrate:latest 2>/dev/null || true
docker rmi teachermate-backend:latest 2>/dev/null || true
docker rmi teachermate-migrate:latest 2>/dev/null || true
docker rmi teachermateai-backend:latest 2>/dev/null || true
docker rmi teachermateai-migrate:latest 2>/dev/null || true

# Prune dangling images
echo "Pruning dangling images..."
docker image prune -f

echo ""
echo "✅ Cleanup complete!"
echo ""
echo "Now run: docker compose up -d"
