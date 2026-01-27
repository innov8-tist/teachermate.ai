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
    Convert PDF pages to images and return URLs
    """
    try:
        pdf_path = PDF_STORAGE / f"{pdf_id}.pdf"
        
        print(f"Looking for PDF at: {pdf_path}")
        print(f"PDF exists: {pdf_path.exists()}")
        
        if not pdf_path.exists():
            # List files in directory for debugging
            print(f"Files in {PDF_STORAGE}:")
            if PDF_STORAGE.exists():
                for f in PDF_STORAGE.iterdir():
                    print(f"  - {f.name}")
            raise HTTPException(status_code=404, detail=f"PDF not found at {pdf_path}")
        
        # Check if images already exist
        pdf_images_dir = PDF_IMAGES_STORAGE / pdf_id
        
        if not pdf_images_dir.exists():
            # Convert PDF to images
            print(f"Converting PDF to images, saving to: {pdf_images_dir}")
            pdf_images_dir.mkdir(parents=True, exist_ok=True)
            
            doc = fitz.open(pdf_path)
            image_urls = []
            
            for page_num in range(len(doc)):
                page = doc.load_page(page_num)
                
                # Render at 2x resolution for better quality
                mat = fitz.Matrix(2, 2)
                pix = page.get_pixmap(matrix=mat)
                
                # Save as PNG
                image_filename = f"page_{page_num + 1}.png"
                image_path = pdf_images_dir / image_filename
                pix.save(str(image_path))
                
                image_urls.append(f"/public/pdf_images/{pdf_id}/{image_filename}")
                print(f"  Saved page {page_num + 1} to {image_path}")
            
            doc.close()
            print(f"✅ Converted {len(image_urls)} pages")
        else:
            # Images already exist, just return URLs
            print(f"Using cached images from: {pdf_images_dir}")
            image_urls = []
            for image_file in sorted(pdf_images_dir.glob("page_*.png")):
                image_urls.append(f"/public/pdf_images/{pdf_id}/{image_file.name}")
        
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

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get PDF images: {str(e)}")


@router.post("/upload-schema-pdf")
async def upload_schema_pdf(
    subject: str = Form(...),
    pdf_file: UploadFile = File(...)
):
    """
    Upload answer schema PDF
    """
    try:
        print(f"📤 Uploading PDF for subject: {subject}")
        print(f"📤 Filename: {pdf_file.filename}")
        
        # Generate unique ID
        unique_id = str(uuid.uuid4())
        file_extension = os.path.splitext(pdf_file.filename)[1]
        
        if file_extension.lower() != '.pdf':
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        # Save PDF
        pdf_path = PDF_STORAGE / f"{unique_id}.pdf"
        content = await pdf_file.read()
        
        print(f"📤 Saving PDF to: {pdf_path}")
        print(f"📤 PDF size: {len(content)} bytes")
        
        with open(pdf_path, "wb") as f:
            f.write(content)
        
        print(f"✅ PDF saved successfully")
        
        # Get page count
        doc = fitz.open(pdf_path)
        page_count = len(doc)
        doc.close()
        
        print(f"✅ PDF has {page_count} pages")
        print(f"✅ PDF ID: {unique_id}")
        
        return {
            "success": True,
            "pdf_id": unique_id,
            "pdf_uri": f"/public/evaluation_pdfs/{unique_id}.pdf",
            "page_count": page_count,
            "subject": subject
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
