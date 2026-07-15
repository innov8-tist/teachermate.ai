# Docker Build Optimization Guide

## Why Builds Are Fast Now

### 1. Docker Layer Caching
Dependencies (`pyproject.toml` and `uv.lock`) are copied and installed **before** application code. This means:
- ✅ If dependencies don't change, Docker reuses the cached layer
- ✅ Only rebuilds when you actually change dependencies
- ✅ Code changes trigger fast rebuilds (only copies new code)

### 2. BuildKit
Enabled with `DOCKER_BUILDKIT=1`:
- ✅ Parallel layer builds
- ✅ Better caching strategy
- ✅ Faster image builds

### 3. .dockerignore
Excludes unnecessary files from build context:
- ✅ Smaller context = faster upload to Docker daemon
- ✅ No unnecessary cache invalidation
- ✅ Excludes `.venv`, `.git`, `__pycache__`, etc.

### 4. Local Builds
Builds happen on EC2 server:
- ✅ Uses local cache from previous builds
- ✅ No need to push/pull images
- ✅ Faster network access to dependencies

## Build Times

**First build (no cache)**: 2-5 minutes
- Downloads all dependencies
- Builds all layers

**Subsequent builds (code changes only)**: 10-30 seconds
- Reuses dependency layers
- Only rebuilds code layers

**Dependency changes**: 1-3 minutes
- Reuses system packages
- Rebuilds Python dependencies

## Manual Build Commands

### Regular build (uses cache):
```bash
cd backend
DOCKER_BUILDKIT=1 docker compose build backend
```

### Force rebuild (no cache):
```bash
cd backend
DOCKER_BUILDKIT=1 docker compose build --no-cache backend
```

### Pull latest base image:
```bash
cd backend
DOCKER_BUILDKIT=1 docker compose build --pull backend
```

## Troubleshooting Slow Builds

### 1. Check if BuildKit is enabled:
```bash
docker buildx version
```

### 2. Check cache usage:
```bash
docker system df
```

### 3. Clean up if needed:
```bash
# Remove unused images
docker image prune -f

# Remove build cache (will slow down next build)
docker builder prune -f
```

### 4. Monitor build progress:
```bash
cd backend
DOCKER_BUILDKIT=1 docker compose build --progress=plain backend
```

## EC2 Instance Recommendations

For faster builds, ensure your EC2 has:
- **vCPUs**: At least 2 (t3.small or better)
- **RAM**: At least 2GB
- **Disk**: At least 20GB free space

Current recommended instance: **t3.small** or **t3.medium**

### Check current resources:
```bash
# CPU info
lscpu | grep "^CPU(s):"

# Memory info
free -h

# Disk space
df -h
```

## GitHub Actions Timeout

The workflow has a 15-minute timeout. If deployment takes longer:

1. **Check EC2 resources** (might be too small)
2. **Check network** (downloading dependencies)
3. **Check Docker cache** (might need cleanup)

Typical deployment times:
- **First deploy**: 5-10 minutes
- **Code changes**: 2-3 minutes
- **Dependency changes**: 3-5 minutes
