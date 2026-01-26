import boto3
import os
from typing import Optional
from dotenv import load_dotenv
import uuid
from botocore.exceptions import ClientError

load_dotenv()

AWS_ENDPOINT_URL = os.getenv("AWS_ENDPOINT_URL", "http://localhost:4566")
# For mobile app access, use 10.0.2.2 instead of localhost
PUBLIC_ENDPOINT_URL = os.getenv("PUBLIC_ENDPOINT_URL", "http://10.0.2.2:4566")
AWS_ACCESS_KEY_ID = os.getenv("AWS_ACCESS_KEY_ID", "test")
AWS_SECRET_ACCESS_KEY = os.getenv("AWS_SECRET_ACCESS_KEY", "test")
AWS_REGION = os.getenv("AWS_DEFAULT_REGION", "us-east-1")
S3_BUCKET_NAME = os.getenv("S3_BUCKET_NAME", "teacher-pfp-bucket")


class S3Service:
    def __init__(self):
        self.s3_client = boto3.client(
            's3',
            endpoint_url=AWS_ENDPOINT_URL,
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION
        )
        self.bucket_name = S3_BUCKET_NAME
        self.is_available = False
        self._ensure_bucket_exists()
    
    def _ensure_bucket_exists(self):
        """Create bucket if it doesn't exist"""
        try:
            self.s3_client.head_bucket(Bucket=self.bucket_name)
            self.is_available = True
            print(f"✓ S3 bucket '{self.bucket_name}' is available")
        except ClientError:
            try:
                self.s3_client.create_bucket(Bucket=self.bucket_name)
                self.is_available = True
                print(f"✓ Created S3 bucket: {self.bucket_name}")
            except ClientError as e:
                print(f"⚠ Warning: S3 not available - {e}")
                print(f"⚠ Profile pictures will not be stored. Start LocalStack to enable this feature.")
                self.is_available = False
        except Exception as e:
            print(f"⚠ Warning: Could not connect to S3 - {e}")
            print(f"⚠ Profile pictures will not be stored. Start LocalStack to enable this feature.")
            self.is_available = False
    
    def upload_file(self, file_content: bytes, file_extension: str) -> Optional[str]:
        """
        Upload a profile picture to S3 and return the URL
        """
        if not self.is_available:
            print("S3 service not available, skipping file upload")
            return None
            
        try:
            file_key = f"teacher-pfp/{uuid.uuid4()}{file_extension}"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=self._get_content_type(file_extension)
            )
            
            # Generate URL using PUBLIC_ENDPOINT_URL for mobile app access
            url = f"{PUBLIC_ENDPOINT_URL}/{self.bucket_name}/{file_key}"
            return url
        except ClientError as e:
            print(f"Error uploading file to S3: {e}")
            return None
    
    def upload_co_image(self, file_content: bytes, file_extension: str) -> Optional[str]:
        """
        Upload a CO mapping image to S3 and return the URL
        """
        if not self.is_available:
            print("S3 service not available, skipping CO image upload")
            return None
            
        try:
            file_key = f"co-images/{uuid.uuid4()}{file_extension}"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=self._get_content_type(file_extension)
            )
            
            # Generate URL using PUBLIC_ENDPOINT_URL for mobile app access
            url = f"{PUBLIC_ENDPOINT_URL}/{self.bucket_name}/{file_key}"
            print(f"✓ Uploaded CO image to S3: {file_key}")
            return url
        except ClientError as e:
            print(f"Error uploading CO image to S3: {e}")
            return None
    
    def delete_file(self, file_url: str) -> bool:
        """
        Delete a file from S3 given its URL
        """
        if not self.is_available:
            print("S3 service not available, skipping file deletion")
            return True  # Return True to not block the operation
            
        try:
            # Extract key from URL
            file_key = file_url.split(f"{self.bucket_name}/")[-1]
            self.s3_client.delete_object(Bucket=self.bucket_name, Key=file_key)
            return True
        except ClientError as e:
            print(f"Error deleting file from S3: {e}")
            return False
    
    def _get_content_type(self, file_extension: str) -> str:
        """Get content type based on file extension"""
        content_types = {
            '.jpg': 'image/jpeg',
            '.jpeg': 'image/jpeg',
            '.png': 'image/png',
            '.gif': 'image/gif',
            '.webp': 'image/webp'
        }
        return content_types.get(file_extension.lower(), 'application/octet-stream')


# Singleton instance
s3_service = S3Service()
