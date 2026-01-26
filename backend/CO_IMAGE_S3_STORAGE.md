# CO Image S3 Storage Implementation

## Overview
All CO-related images (student answer sheets and processed images) are now stored in AWS S3 using LocalStack, similar to the profile picture implementation.

## Changes Made

### 1. S3 Service Updates (`backend/services/s3_service.py`)

Added three new methods to handle CO-related images:

- **`upload_student_sheet()`**: Uploads original student answer sheet images
  - Stored in: `co-student-images/{subject_id}_{unique_id}{extension}`
  
- **`upload_processed_image()`**: Uploads processed top/bottom images
  - Stored in: `co-processed-images/{subject_id}_{unique_id}_{type}{extension}`
  - Types: `top` or `bot`

### 2. Image Processing Updates (`backend/comapping/answer_sheet_processing/cutting.py`)

Modified `process_student_image()` method:
- Now returns processed images as **bytes** instead of saving to disk
- Creates temporary files only for processing
- Returns both bytes and temp file paths for flexibility
- Includes cleanup method for temporary files

### 3. Server Endpoint Updates (`backend/server.py`)

Updated `/student_sheet_upload` endpoint:
- Uploads original image to S3
- Processes image using temporary files
- Uploads processed top/bottom images to S3
- Cleans up all temporary files after processing
- Returns S3 URLs in response

Removed local storage folders:
- ~~`public/co_student_image`~~ → Now in S3
- ~~`public/co_top_bottom`~~ → Now in S3

## S3 Bucket Structure

```
teacher-pfp-bucket/
├── teacher-pfp/              # Profile pictures
├── co-images/                # CO mapping schema images
├── co-student-images/        # Original student answer sheets
└── co-processed-images/      # Processed top/bottom images
```

## Image Flow

1. **Upload**: Student answer sheet uploaded via API
2. **S3 Storage**: Original image stored in S3 (`co-student-images/`)
3. **Processing**: Image saved to temp file for processing
4. **Split & Enhance**: Image split into top/bottom, cropped, and enhanced
5. **S3 Upload**: Processed images uploaded to S3 (`co-processed-images/`)
6. **Extraction**: LLM extracts data from temp files
7. **Cleanup**: All temporary files deleted
8. **Response**: Returns S3 URLs for all images

## Benefits

- **Scalability**: No local disk storage needed
- **Consistency**: Same storage approach as profile pictures
- **Mobile Access**: Images accessible via `10.0.2.2:4566` endpoint
- **Clean Architecture**: Temporary files cleaned up automatically
- **Fallback Support**: Works even if S3 is unavailable (logs warnings)

## API Response Example

```json
{
  "status": "success",
  "message": "Student answer sheet uploaded, processed, extracted, and saved to database successfully",
  "data": {
    "subject_id": 8,
    "ia_number": 1,
    "image_id": "2067dd4e-b501-4775-9b66-759c7e2ae2c1",
    "original_image_url": "http://10.0.2.2:4566/teacher-pfp-bucket/co-student-images/8_2067dd4e-b501-4775-9b66-759c7e2ae2c1.jpeg",
    "top_image_url": "http://10.0.2.2:4566/teacher-pfp-bucket/co-processed-images/8_2067dd4e-b501-4775-9b66-759c7e2ae2c1_top.png",
    "bot_image_url": "http://10.0.2.2:4566/teacher-pfp-bucket/co-processed-images/8_2067dd4e-b501-4775-9b66-759c7e2ae2c1_bot.png",
    "regno": "TOC22IT083",
    "marks": {...}
  }
}
```

## Testing

Ensure LocalStack is running:
```bash
docker-compose up -d
```

The S3 service will automatically:
- Create the bucket if it doesn't exist
- Log warnings if S3 is unavailable
- Continue operation without S3 (fallback mode)

## Notes

- Temporary files are stored in system temp directory during processing
- All temp files are cleaned up after successful upload or on error
- S3 URLs use `PUBLIC_ENDPOINT_URL` (10.0.2.2:4566) for mobile app access
- Original local folders can be safely deleted as they're no longer used
