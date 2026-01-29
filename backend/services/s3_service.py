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
USE_LOCALSTACK = os.getenv("USE_LOCALSTACK", "false").lower() == "true"

class S3Service:
    def __init__(self):
        client_kwargs = {
            "service_name": "s3",
            "region_name": AWS_REGION,
            "aws_access_key_id": AWS_ACCESS_KEY_ID,
            "aws_secret_access_key": AWS_SECRET_ACCESS_KEY,
        }

        if USE_LOCALSTACK:
            client_kwargs.update({
                "endpoint_url": AWS_ENDPOINT_URL,
            })

        self.s3_client = boto3.client(**client_kwargs)
        self.bucket_name = S3_BUCKET_NAME
        self.is_available = False
        self._ensure_bucket_exists()
    
    def _generate_url(self, file_key: str) -> str:
        """Generate the appropriate URL based on LocalStack or AWS"""
        if USE_LOCALSTACK:
            return f"{PUBLIC_ENDPOINT_URL}/{self.bucket_name}/{file_key}"
        else:
            # AWS S3 URL format
            return f"https://{self.bucket_name}.s3.{AWS_REGION}.amazonaws.com/{file_key}"
    
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
            
            # Generate URL using the appropriate method
            url = self._generate_url(file_key)
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
            
            # Generate URL using the appropriate method
            url = self._generate_url(file_key)
            print(f"✓ Uploaded CO image to S3: {file_key}")
            return url
        except ClientError as e:
            print(f"Error uploading CO image to S3: {e}")
            return None
    
    def upload_student_sheet(self, file_content: bytes, file_extension: str, subject_id: int, unique_id: str) -> Optional[str]:
        """
        Upload a student answer sheet to S3 and return the URL
        """
        if not self.is_available:
            print("S3 service not available, skipping student sheet upload")
            return None
            
        try:
            file_key = f"co-student-images/{subject_id}_{unique_id}{file_extension}"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=self._get_content_type(file_extension)
            )
            
            # Generate URL using the appropriate method
            url = self._generate_url(file_key)
            print(f"✓ Uploaded student sheet to S3: {file_key}")
            return url
        except ClientError as e:
            print(f"Error uploading student sheet to S3: {e}")
            return None
    
    def upload_processed_image(self, file_content: bytes, file_extension: str, subject_id: int, unique_id: str, image_type: str) -> Optional[str]:
        """
        Upload a processed image (top/bottom) to S3 and return the URL
        
        Args:
            file_content: Image file content as bytes
            file_extension: File extension (e.g., '.png')
            subject_id: Subject ID
            unique_id: Unique identifier
            image_type: Either 'top' or 'bot'
        """
        if not self.is_available:
            print("S3 service not available, skipping processed image upload")
            return None
            
        try:
            file_key = f"co-processed-images/{subject_id}_{unique_id}_{image_type}{file_extension}"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=self._get_content_type(file_extension)
            )
            
            # Generate URL using the appropriate method
            url = self._generate_url(file_key)
            print(f"✓ Uploaded {image_type} image to S3: {file_key}")
            return url
        except ClientError as e:
            print(f"Error uploading {image_type} image to S3: {e}")
            return None
    
    def upload_answer_image(self, file_content: bytes, file_extension: str, subject_id: int, question_no: str, index: int) -> Optional[str]:
        """
        Upload an answer schema image to S3 and return the URL
        
        Args:
            file_content: Image file content as bytes
            file_extension: File extension (e.g., '.png')
            subject_id: Subject ID
            question_no: Question number
            index: Image index for this question
        """
        if not self.is_available:
            print("S3 service not available, skipping answer image upload")
            return None
            
        try:
            unique_id = uuid.uuid4()
            file_key = f"answer-images/{subject_id}/q{question_no}_{index}_{unique_id}{file_extension}"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType=self._get_content_type(file_extension)
            )
            
            # Generate URL using the appropriate method
            url = self._generate_url(file_key)
            print(f"✓ Uploaded answer image to S3: {file_key}")
            return url
        except ClientError as e:
            print(f"Error uploading answer image to S3: {e}")
            return None
    
    def upload_evaluation_pdf(self, file_content: bytes, file_extension: str) -> Optional[tuple[str, str]]:
        """
        Upload an evaluation PDF to S3 and return the URL and unique ID
        
        Returns:
            Tuple of (url, unique_id) or (None, None) if upload fails
        """
        if not self.is_available:
            print("S3 service not available, skipping PDF upload")
            return None, None
            
        try:
            unique_id = str(uuid.uuid4())
            file_key = f"evaluation-pdfs/{unique_id}{file_extension}"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType='application/pdf'
            )
            
            # Generate URL using the appropriate method
            url = self._generate_url(file_key)
            print(f"✓ Uploaded evaluation PDF to S3: {file_key}")
            return url, unique_id
        except ClientError as e:
            print(f"Error uploading evaluation PDF to S3: {e}")
            return None, None
    
    def upload_pdf_image(self, file_content: bytes, pdf_id: str, page_number: int) -> Optional[str]:
        """
        Upload a PDF page image to S3 and return the URL
        
        Args:
            file_content: Image file content as bytes
            pdf_id: PDF unique identifier
            page_number: Page number
        """
        if not self.is_available:
            print("S3 service not available, skipping PDF image upload")
            return None
            
        try:
            file_key = f"pdf-images/{pdf_id}/page_{page_number}.png"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType='image/png'
            )
            
            # Generate URL using the appropriate method
            url = self._generate_url(file_key)
            return url
        except ClientError as e:
            print(f"Error uploading PDF image to S3: {e}")
            return None
    
    def upload_cropped_image(self, file_content: bytes) -> Optional[str]:
        """
        Upload a cropped image to S3 and return the URL
        """
        if not self.is_available:
            print("S3 service not available, skipping cropped image upload")
            return None
            
        try:
            unique_id = uuid.uuid4()
            file_key = f"cropped-images/{unique_id}.png"
            
            self.s3_client.put_object(
                Bucket=self.bucket_name,
                Key=file_key,
                Body=file_content,
                ContentType='image/png'
            )
            
            # Generate URL using the appropriate method
            url = self._generate_url(file_key)
            print(f"✓ Uploaded cropped image to S3: {file_key}")
            return url
        except ClientError as e:
            print(f"Error uploading cropped image to S3: {e}")
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
