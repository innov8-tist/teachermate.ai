from fastapi import FastAPI, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import os
import uuid
import tempfile
from pathlib import Path
from models.pydanticmodel import CoCreationModel
from db_operation.db_server import DBServiceForServer
from comapping.teacher_co_processing.extracting import main_func
from routes.auth import router as auth_router
from auth.dependencies import get_current_teacher
from db_service.db_schema import Teacher
from services.s3_service import s3_service

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)

app.include_router(auth_router)

# Temp folder for processing images before uploading to S3
TEMP_FOLDER = Path(tempfile.gettempdir()) / "co_images"
TEMP_FOLDER.mkdir(parents=True, exist_ok=True)

def get_db_service():
    db_service = DBServiceForServer()
    try:
        yield db_service
    finally:
        db_service.close()

@app.get("/")
def read_root():
    return {"message": "Hello, FastAPI!"}

@app.get("/subject_fetch/{semester}")
def fetching_all_subject(semester: int, db_service: DBServiceForServer = Depends(get_db_service)):
    subjects = db_service.getting_all_subject(semester)
    return subjects

@app.post("/co_creation")
async def co_creation(
    subject_name: str = Form(...),
    sem: int = Form(...),
    ia_number: int = Form(...),
    co_image: UploadFile = File(...),
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    co_data = CoCreationModel(
        subject_name=subject_name,
        sem=sem,
        ia_number=ia_number
    )
    
    unique_id = str(uuid.uuid4())
    file_extension = os.path.splitext(co_image.filename)[1]
    
    # Read file content
    file_content = await co_image.read()
    
    # Upload to S3
    s3_url = None
    if s3_service.is_available:
        s3_url = s3_service.upload_co_image(file_content, file_extension)
        print(f"✓ Uploaded CO image to S3: {s3_url}")
    
    # Save to temp folder for processing
    temp_filename = f"{unique_id}{file_extension}"
    temp_path = TEMP_FOLDER / temp_filename
    with open(temp_path, "wb") as buffer:
        buffer.write(file_content)
    
    print("=" * 50)
    print("CO Creation Details:")
    print(f"Teacher ID: {current_teacher.id}")
    print(f"Teacher Name: {current_teacher.name}")
    print(f"Subject Name: {co_data.subject_name}")
    print(f"Semester: {co_data.sem}")
    print(f"IA Number: {co_data.ia_number}")
    print(f"Image Unique ID: {unique_id}")
    print(f"S3 URL: {s3_url or 'S3 not available'}")
    print(f"Temp Path: {temp_path}")
    print("=" * 50)
    
    try:
        created_subject = db_service.create_co_subject(
            subject_name=co_data.subject_name,
            sem=co_data.sem,
            ia_number=co_data.ia_number,
            teacher_id=current_teacher.id,
            image_path=s3_url or str(temp_path)  # Use S3 URL if available, else temp path
        )
        
        # Process the image from temp path
        main_func(image_path=str(temp_path), subject_id=created_subject.id)
        
        # Clean up temp file after processing
        try:
            os.remove(temp_path)
            print(f"✓ Cleaned up temp file: {temp_path}")
        except Exception as e:
            print(f"⚠ Failed to clean up temp file: {e}")
        
        return {
            "status": "success",
            "message": "CO created successfully",
            "data": {
                "id": created_subject.id,
                "subject_name": created_subject.name,
                "branch": created_subject.branch,
                "semester": created_subject.sem,
                "ia": created_subject.ia,
                "image_id": unique_id,
                "image_path": created_subject.image_path
            }
        }
    except ValueError as e:
        # Clean up temp file on error
        if temp_path.exists():
            os.remove(temp_path)
        return {
            "status": "error",
            "message": str(e)
        }
    except Exception as e:
        # Clean up temp file on error
        if temp_path.exists():
            os.remove(temp_path)
        return {
            "status": "error",
            "message": f"Failed to create CO: {str(e)}"
        }

@app.get("/co_fetch/{teacher_id}")
def all_co_of_teacher(teacher_id: int, db_service: DBServiceForServer = Depends(get_db_service)):
    all_co = db_service.get_all_co_by_teacher(teacher_id)
    return all_co

@app.get("/co_fetch_details/{subject_id}")
def co_details(subject_id: int, db_service: DBServiceForServer = Depends(get_db_service)):
    details = db_service.get_co_details(subject_id)
    return details

@app.delete("/co_delete/{subject_id}")
def delete_co(subject_id: int, db_service: DBServiceForServer = Depends(get_db_service)):
    success = db_service.delete_co_subject(subject_id)
    if success:
        return {"status": "success", "message": "CO deleted successfully"}
    else:
        return {"status": "error", "message": "CO not found"}

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)