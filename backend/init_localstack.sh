#!/bin/bash

# Script to initialize LocalStack S3 bucket
# Run this after starting docker-compose if the bucket doesn't auto-create

echo "Waiting for LocalStack to be ready..."
sleep 5

echo "Creating S3 bucket..."
aws --endpoint-url=http://localhost:4566 \
    --region=us-east-1 \
    s3 mb s3://teacher-pfp-bucket

echo "Setting bucket policy for public read..."
aws --endpoint-url=http://localhost:4566 \
    --region=us-east-1 \
    s3api put-bucket-acl \
    --bucket teacher-pfp-bucket \
    --acl public-read

echo "✅ LocalStack S3 bucket initialized!"
echo "Bucket: teacher-pfp-bucket"
echo "Endpoint: http://localhost:4566"
