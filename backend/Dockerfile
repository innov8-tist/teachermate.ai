# Use Python 3.12 slim image to match the project requirement
FROM python:3.12-slim

WORKDIR /app

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
    libsm6 \
    libxext6 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

COPY . .

RUN uv sync --frozen --no-dev

RUN mkdir -p /app/public/evaluation_pdfs /app/public/student_pdfs /app/public/co_images
RUN chmod +x /app/scripts/*.sh

EXPOSE 8000

CMD ["/app/scripts/start.sh"]
