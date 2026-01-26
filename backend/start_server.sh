#!/bin/bash

# Create necessary directories
mkdir -p public/pdf_images
mkdir -p public/co_image
mkdir -p uploads/pdfs

# Start the server
uv run uvicorn server:app --reload --host 0.0.0.0 --port 8000
