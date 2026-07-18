# Evaluation System - S3 URL Direct Usage

## Changes Made

### Problem
The Gemini model was receiving local file paths instead of S3 URLs, causing the error:
```
litellm.BadRequestError: Unable to determine mime type for file: /tmp/evaluation_pdfs/answer_key_1.pdf
```

### Solution
Modified the evaluation flow to use S3 URLs directly without downloading PDFs locally.

## Modified Files

### 1. `/backend/server.py` - `start_evaluation` endpoint

**Changes:**
- ✅ Removed local file download logic
- ✅ Added validation to ensure PDFs are S3 URLs
- ✅ Pass S3 URLs directly to Gemini model
- ✅ Removed temporary file cleanup (no longer needed)

**Before:**
```python
# Download PDFs to temp directory
temp_dir = Path(tempfile.gettempdir()) / "evaluation_pdfs"
answer_key_path = temp_dir / f"answer_key_{progress.schema_id}.pdf"
# ... download logic ...
raw_evaluation = await obj.gemini(str(answer_key_path), str(student_pdf_path))
```

**After:**
```python
# Validate S3 URLs
if not evaluation_schema.pdf_path.startswith("http"):
    raise HTTPException(status_code=400, detail="Answer key PDF must be uploaded to S3")
if not progress.student_pdf_path.startswith("http"):
    raise HTTPException(status_code=400, detail="Student PDF must be uploaded to S3")

# Use S3 URLs directly
answer_key_url = evaluation_schema.pdf_path
student_pdf_url = progress.student_pdf_path
raw_evaluation = await obj.gemini(answer_key_url, student_pdf_url)
```

### 2. `/backend/server.py` - `upload_evaluation_pdf` endpoint

**Changes:**
- ✅ Made S3 upload mandatory (no fallback to local storage)
- ✅ Added clear error messages if S3 is unavailable
- ✅ Removed local file fallback logic

**Before:**
```python
if s3_service.is_available:
    pdf_s3_url = s3_service.upload_evaluation_pdf(...)
else:
    # Save locally as fallback
    local_dir = Path("public/evaluation_pdfs")
    ...
```

**After:**
```python
if not s3_service.is_available:
    raise HTTPException(status_code=503, detail="S3 storage is required for PDF evaluation")

pdf_s3_url = s3_service.upload_evaluation_pdf(...)
if not pdf_s3_url:
    raise HTTPException(status_code=500, detail="Failed to upload PDF to S3")
```

### 3. `/backend/server.py` - `upload_student_pdf_for_evaluation` endpoint

**Changes:**
- ✅ Made S3 upload mandatory (no fallback to local storage)
- ✅ Added clear error messages if S3 is unavailable
- ✅ Removed local file fallback logic

## Environment Configuration

### Required Environment Variables (`.env`):
```env
# AWS S3 Configuration
AWS_ACCESS_KEY_ID=<your-access-key>
AWS_SECRET_ACCESS_KEY=<your-secret-key>
AWS_DEFAULT_REGION=ap-south-1
S3_BUCKET_NAME=teachermate
USE_LOCALSTACK=false
```

### S3 Service Status:
The S3 service automatically checks availability on startup and sets `s3_service.is_available` flag.

## Testing

### Verify S3 URLs are being used:
1. Upload answer key PDF → Check logs for "Uploaded answer key PDF to S3: https://..."
2. Upload student PDF → Check logs for "Student PDF uploaded to S3: https://..."
3. Start evaluation → Check logs for "Using S3 URLs directly:"

### Expected Log Output:
```
Answer Key PDF: https://teachermate.s3.ap-south-1.amazonaws.com/...
Student PDF: https://teachermate.s3.ap-south-1.amazonaws.com/...
Using S3 URLs directly:
  Answer Key: https://...
  Student PDF: https://...
Running Gemini evaluation with S3 URLs...
```

## Benefits

1. **✅ Gemini model compatibility** - Can process S3 URLs directly
2. **✅ No temporary files** - Cleaner, no cleanup needed
3. **✅ Better performance** - No download/upload cycles
4. **✅ Scalability** - Works in distributed/serverless environments
5. **✅ Clear error messages** - Users know if S3 is not configured

## Error Handling

### If S3 is not available:
- Upload endpoints will return HTTP 503 with clear message
- Users are informed to check S3 configuration

### If PDF is not uploaded to S3:
- Evaluation endpoint returns HTTP 400 with message about S3 requirement
- Prevents evaluation from failing mid-process

## Migration Notes

For existing data with local paths:
- Re-upload PDFs through the API to generate S3 URLs
- Or manually migrate existing PDFs to S3 and update database paths
