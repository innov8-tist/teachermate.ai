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
            
            # Sort by page number (not alphabetically)
            image_files = list(pdf_images_dir.glob("page_*.png"))
            image_files.sort(key=lambda x: int(x.stem.split('_')[1]))
            
            for image_file in image_files:
                image_urls.append(f"/public/pdf_images/{pdf_id}/{image_file.name}")
                print(f"  Found page: {image_file.name}")
        
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


@router.post("/crop-pdf-multi-page")
async def crop_pdf_multi_page(request: dict):
    """
    Crop sections from multiple PDF pages and stitch them together
    """
    try:
        pdf_uri = request.get('pdf_uri')
        crops = request.get('crops', [])
        
        print(f"🎯 Multi-page crop request:")
        print(f"  PDF URI: {pdf_uri}")
        print(f"  Pages: {len(crops)}")
        
        # Extract PDF ID from URI
        pdf_id = pdf_uri.split('/')[-1].replace('.pdf', '')
        pdf_path = PDF_STORAGE / f"{pdf_id}.pdf"
        
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="PDF not found")
        
        # Open PDF
        doc = fitz.open(pdf_path)
        cropped_images = []
        
        # Crop each page section
        for crop_data in crops:
            page_num = crop_data['page_number']
            x_percent = crop_data['x']
            y_percent = crop_data['y']
            width_percent = crop_data['width']
            height_percent = crop_data['height']
            
            print(f"  Page {page_num}: x={x_percent:.1f}%, y={y_percent:.1f}%, w={width_percent:.1f}%, h={height_percent:.1f}%")
            
            page = doc.load_page(page_num - 1)
            
            # Render at 300 DPI
            mat = fitz.Matrix(300/72, 300/72)
            pix = page.get_pixmap(matrix=mat)
            
            # Convert to PIL Image
            img_data = pix.tobytes("png")
            from io import BytesIO
            img = Image.open(BytesIO(img_data))
            
            # Calculate crop coordinates
            img_width, img_height = img.size
            crop_x = int((x_percent / 100) * img_width)
            crop_y = int((y_percent / 100) * img_height)
            crop_width = int((width_percent / 100) * img_width)
            crop_height = int((height_percent / 100) * img_height)
            
            # Crop this section
            cropped = img.crop((
                crop_x,
                crop_y,
                crop_x + crop_width,
                crop_y + crop_height
            ))
            
            cropped_images.append(cropped)
            print(f"    Cropped: {cropped.size}")
        
        doc.close()
        
        # Stitch images vertically
        total_height = sum(img.height for img in cropped_images)
        max_width = max(img.width for img in cropped_images)
        
        # Create new image
        stitched = Image.new('RGB', (max_width, total_height), 'white')
        
        # Paste each cropped section
        y_offset = 0
        for img in cropped_images:
            stitched.paste(img, (0, y_offset))
            y_offset += img.height
        
        print(f"✅ Stitched image size: {stitched.size}")
        
        # Save stitched image
        crop_id = str(uuid.uuid4())
        crop_filename = f"{crop_id}.png"
        crop_path = CROPPED_STORAGE / crop_filename
        stitched.save(crop_path, "PNG")
        
        print(f"💾 Saved to: {crop_path}")
        
        return {
            "success": True,
            "crop_id": crop_id,
            "crop_uri": f"/public/evaluation_crops/{crop_filename}",
            "width": stitched.width,
            "height": stitched.height,
            "pages": len(crops)
        }
    
    except Exception as e:
        print(f"❌ Multi-page crop error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to crop PDF: {str(e)}")


@router.post("/crop-pdf-section")
async def crop_pdf_section(crop_request: CropRequest):
    """
    Crop a section from a PDF page based on percentage coordinates
    Returns the cropped image
    """
    try:
        print(f"🎯 Crop request received:")
        print(f"  PDF URI: {crop_request.pdf_uri}")
        print(f"  Page: {crop_request.page_number}")
        print(f"  Crop %: x={crop_request.x:.1f}, y={crop_request.y:.1f}, w={crop_request.width:.1f}, h={crop_request.height:.1f}")
        
        # Extract PDF ID from URI
        pdf_id = crop_request.pdf_uri.split('/')[-1].replace('.pdf', '')
        pdf_path = PDF_STORAGE / f"{pdf_id}.pdf"
        
        print(f"📄 Looking for PDF: {pdf_path}")
        
        if not pdf_path.exists():
            raise HTTPException(status_code=404, detail="PDF not found")
        
        # Open PDF and get page
        doc = fitz.open(pdf_path)
        
        if crop_request.page_number < 1 or crop_request.page_number > len(doc):
            raise HTTPException(status_code=400, detail="Invalid page number")
        
        page = doc.load_page(crop_request.page_number - 1)  # 0-indexed
        print(f"📖 Loaded page {crop_request.page_number} (0-indexed: {crop_request.page_number - 1})")
        
        # Render page at high resolution (300 DPI)
        mat = fitz.Matrix(300/72, 300/72)  # 72 is default DPI
        pix = page.get_pixmap(matrix=mat)
        
        # Convert to PIL Image
        img_data = pix.tobytes("png")
        from io import BytesIO
        img = Image.open(BytesIO(img_data))
        
        # Calculate crop coordinates from percentages
        img_width, img_height = img.size
        print(f"📐 Rendered page size: {img_width} x {img_height}")
        
        crop_x = int((crop_request.x / 100) * img_width)
        crop_y = int((crop_request.y / 100) * img_height)
        crop_width = int((crop_request.width / 100) * img_width)
        crop_height = int((crop_request.height / 100) * img_height)
        
        print(f"✂️ Crop coordinates (pixels): x={crop_x}, y={crop_y}, w={crop_width}, h={crop_height}")
        
        # Crop image
        cropped_img = img.crop((
            crop_x,
            crop_y,
            crop_x + crop_width,
            crop_y + crop_height
        ))
        
        print(f"✅ Cropped image size: {cropped_img.size}")
        
        # Save cropped image
        crop_id = str(uuid.uuid4())
        crop_filename = f"{crop_id}.png"
        crop_path = CROPPED_STORAGE / crop_filename
        cropped_img.save(crop_path, "PNG")
        
        print(f"💾 Saved to: {crop_path}")
        
        doc.close()
        
        return {
            "success": True,
            "crop_id": crop_id,
            "crop_uri": f"/public/evaluation_crops/{crop_filename}",
            "width": crop_width,
            "height": crop_height
        }
    
    except Exception as e:
        print(f"❌ Crop error: {str(e)}")
        import traceback
        traceback.print_exc()
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
