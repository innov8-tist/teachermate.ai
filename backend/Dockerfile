# Use Python 3.12 slim image to match the project requirement
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
# - curl: for health checks
# - gcc, python3-dev, libpq-dev: for building psycopg2 (PostgreSQL client library)
# - postgresql-client: for pg_isready command in migration scripts
# - libgl1, libglib2.0-0, libsm6, libxext6, libxrender-dev: for OpenCV
# - libgomp1: for scikit-learn
# - ffmpeg: for media processing
RUN apt-get update && apt-get install -y \
    curl \
    gcc \
    postgresql-client \
    libpq-dev \
    python3-dev \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender-dev \
    libgomp1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

# Copy dependency files first (better layer caching)
COPY pyproject.toml uv.lock ./

# Install dependencies (this layer will be cached if dependencies don't change)
RUN uv sync --no-dev

# Copy application code
COPY alembic.ini ./alembic.ini
COPY alembic/ ./alembic/
COPY scripts ./scripts
COPY . .

# Create necessary directories
RUN mkdir -p /app/public/evaluation_pdfs /app/public/student_pdfs /app/public/co_images

# Make scripts executable
RUN chmod +x /app/scripts/*.sh

EXPOSE 8000

CMD ["/app/scripts/start.sh"]
