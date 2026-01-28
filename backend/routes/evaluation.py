from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Optional
import uuid
import os
from pathlib import Path
from PIL import Image
import fitz  # PyMuPDF
from pydantic import BaseModel
from auth.dependencies import get_current_teacher
from db_service.db_schema import Teacher

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])

# Storage paths
PDF_STORAGE = Path("public/evaluation_pdfs")
CROPPED_STORAGE = Path("public/evaluation_crops")
PDF_IMAGES_STORAGE = Path("public/pdf_images")
PDF_STORAGE.mkdir(parents=True, exist_ok=True)
CROPPED_STORAGE.mkdir(parents=True, exist_ok=True)
PDF_IMAGES_STORAGE.mkdir(parents=True, exist_ok=True)


class CropRequest(BaseModel):
    pdf_uri: str
    page_number: int
    x: float  # percentage 0-100
    y: float  # percentage 0-100
    width: float  # percentage 0-100
    height: float  # percentage 0-100


@router.get("/pdf-images/{pdf_id}")
async def get_pdf_images(pdf_id: str):
    """
    Convert PDF pages to images (from S3) and return S3 URLs
    """
    from services.s3_service import s3_service
    import tempfile
    from botocore.exceptions import ClientError
    
    try:
        # Download PDF from S3 using boto3 client
        file_key = f"evaluation-pdfs/{pdf_id}.pdf"
        
        print(f"Fetching PDF from S3: {file_key}")
        
        try:
            response = s3_service.s3_client.get_object(
                Bucket=s3_service.bucket_name,
                Key=file_key
            )
            pdf_content = response['Body'].read()
            print(f"✅ Downloaded PDF from S3, size: {len(pdf_content)} bytes")
        except ClientError as e:
            if e.response['Error']['Code'] == 'NoSuchKey':
                raise HTTPException(status_code=404, detail=f"PDF not found in S3: {pdf_id}")
            raise
        
        # Save to temp file for processing
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(pdf_content)
            tmp_path = tmp_file.name
        
        # Convert PDF to images and upload to S3
        doc = fitz.open(tmp_path)
        image_urls = []
        
        for page_num in range(len(doc)):
            page = doc.load_page(page_num)
            
            # Render at 2x resolution for better quality
            mat = fitz.Matrix(2, 2)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to bytes
            img_bytes = pix.tobytes("png")
            
            # Upload to S3
            s3_url = s3_service.upload_pdf_image(img_bytes, pdf_id, page_num + 1)
            
            if s3_url:
                image_urls.append(s3_url)
                print(f"  ✓ Uploaded page {page_num + 1} to S3: {s3_url}")
            else:
                print(f"  ⚠ Failed to upload page {page_num + 1}")
        
        doc.close()
        
        # Clean up temp file
        os.remove(tmp_path)
        
        print(f"✅ Converted and uploaded {len(image_urls)} pages to S3")
        
        return {
            "success": True,
            "pdf_id": pdf_id,
            "images": image_urls,
            "page_count": len(image_urls)
        }
    except HTTPException:
        raise
    except Exception as e:
        print(f"❌ Error in get_pdf_images: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get PDF images: {str(e)}")


@router.post("/upload-schema-pdf")
async def upload_schema_pdf(
    subject: str = Form(...),
    subject_id: int = Form(...),
    pdf_file: UploadFile = File(...),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Upload answer schema PDF to S3 and create Evaluation record
    """
    from datetime import datetime
    from db_operation.db_server import DBServiceForServer
    from services.s3_service import s3_service
    
    try:
        print(f"📤 Uploading PDF for subject: {subject} (ID: {subject_id})")
        print(f"📤 Teacher ID: {current_teacher.id}")
        print(f"📤 Filename: {pdf_file.filename}")
        
        file_extension = os.path.splitext(pdf_file.filename)[1]
        
        if file_extension.lower() != '.pdf':
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        content = await pdf_file.read()
        print(f"📤 PDF size: {len(content)} bytes")
        
        # Upload to S3
        s3_url, unique_id = s3_service.upload_evaluation_pdf(content, file_extension)
        
        if not s3_url or not unique_id:
            raise HTTPException(status_code=500, detail="Failed to upload PDF to S3")
        
        print(f"✅ PDF uploaded to S3: {s3_url}")
        
        # Get page count (need to save temporarily for PyMuPDF)
        import tempfile
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        doc = fitz.open(tmp_path)
        page_count = len(doc)
        doc.close()
        
        # Clean up temp file
        os.remove(tmp_path)
        
        # Create Evaluation record in database
        db_service = DBServiceForServer()
        try:
            timestamp = datetime.now().isoformat()
            evaluation = db_service.create_evaluation(
                template_id=subject_id,
                teacher_id=current_teacher.id,
                pdf_path=s3_url,  # Store S3 URL instead of local path
                created_at=timestamp,
                updated_at=timestamp
            )
            print(f"✅ Evaluation record created with ID: {evaluation.id}")
        finally:
            db_service.close()
        
        print(f"✅ PDF has {page_count} pages")
        print(f"✅ PDF ID: {unique_id}")
        
        return {
            "success": True,
            "pdf_id": unique_id,
            "evaluation_id": evaluation.id,
            "pdf_uri": s3_url,  # Return S3 URL
            "page_count": page_count,
            "subject": subject,
            "subject_id": subject_id
        }
    
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")


@router.post("/crop-pdf-section")
async def crop_pdf_section(crop_request: CropRequest):
    """
    Crop a section from a PDF page based on percentage coordinates
    Returns the cropped image
    """
    try:
        # Extract PDF ID from URI
        pdf_id = crop_request.pdf_uri.split('/')[-1].replace('.pdf', '')
        pdf_path = PDF_STORAGE / f"{pdf_id}.pdf"
        
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="PDF not found")
        
        # Open PDF and get page
        doc = fitz.open(pdf_path)
        
        if crop_request.page_number < 1 or crop_request.page_number > len(doc):
            raise HTTPException(status_code=400, detail="Invalid page number")
        
        page = doc.load_page(crop_request.page_number - 1)  # 0-indexed
        
        # Render page at high resolution (300 DPI)
        mat = fitz.Matrix(300/72, 300/72)  # 72 is default DPI
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image
        img_data = pix.tobytes("png")
        from io import BytesIO
        img = Image.open(BytesIO(img_data))
        
        # Calculate crop coordinates from percentages
        img_width, img_height = img.size
        crop_x = int((crop_request.x / 100) * img_width)
        crop_y = int((crop_request.y / 100) * img_height)
        crop_width = int((crop_request.width / 100) * img_width)
        crop_height = int((crop_request.height / 100) * img_height)
        
        # Crop image
        cropped_img = img.crop((
            crop_x,
            crop_y,
            crop_x + crop_width,
            crop_y + crop_height
        ))
        
        # Save cropped image
        crop_id = str(uuid.uuid4())
        crop_filename = f"{crop_id}.png"
        crop_path = CROPPED_STORAGE / crop_filename
        cropped_img.save(crop_path, "PNG")
        
        doc.close()
        
        return {
            "success": True,
            "crop_id": crop_id,
            "crop_uri": f"/public/evaluation_crops/{crop_filename}",
            "width": crop_width,
            "height": crop_height
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to crop PDF: {str(e)}")


@router.post("/submit-answer-schema")
async def submit_answer_schema(
    subject: str = Form(...),
    pdf_id: str = Form(...),
    questions_data: str = Form(...)  # JSON string of questions with crop data
):
    """
    Submit complete answer schema with all cropped sections
    """
    import json
    
    try:
        questions = json.loads(questions_data)
        
        # Here you would:
        # 1. Create evaluation_schema record in database
        # 2. Create evaluation_question records for each question
        # 3. Store crop metadata for each question
        # 4. Link to teacher
        
        # For now, just return success
        return {
            "success": True,
            "message": "Answer schema submitted successfully",
            "schema_id": str(uuid.uuid4()),
            "subject": subject,
            "question_count": len(questions)
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to submit schema: {str(e)}")


@router.post("/stitch-images")
async def stitch_images(image_files: List[UploadFile] = File(...)):
    """
    Stitch multiple images together vertically
    Used for multi-page crops
    """
    try:
        print(f"🔗 Stitching {len(image_files)} images together")
        
        # Load all images
        images = []
        for img_file in image_files:
            content = await img_file.read()
            from io import BytesIO
            img = Image.open(BytesIO(content))
            images.append(img)
            print(f"  Loaded image: {img.size}")
        
        # Calculate total height and max width
        total_height = sum(img.height for img in images)
        max_width = max(img.width for img in images)
        
        print(f"📐 Stitched size: {max_width}x{total_height}")
        
        # Create new image with combined height
        stitched = Image.new('RGB', (max_width, total_height), (255, 255, 255))
        
        # Paste images vertically
        y_offset = 0
        for img in images:
            # Center horizontally if image is narrower
            x_offset = (max_width - img.width) // 2
            stitched.paste(img, (x_offset, y_offset))
            y_offset += img.height
            print(f"  Pasted at y={y_offset - img.height}")
        
        # Save stitched image
        stitched_id = str(uuid.uuid4())
        stitched_path = CROPPED_STORAGE / f"{stitched_id}.png"
        stitched.save(stitched_path, 'PNG')
        
        print(f"✅ Stitched image saved: {stitched_path}")
        
        return {
            "success": True,
            "stitched_uri": f"/public/evaluation_crops/{stitched_id}.png",
            "width": max_width,
            "height": total_height
        }
    
    except Exception as e:
        print(f"❌ Stitch error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to stitch images: {str(e)}")
