from fastapi import FastAPI, Depends, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
import uvicorn
import os
import uuid
import tempfile
from pathlib import Path
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from models.pydanticmodel import CoCreationModel
from db_operation.db_server import DBServiceForServer
from comapping.teacher_co_processing.extracting import main_func
from routes.auth import router as auth_router
from auth.dependencies import get_current_teacher
from db_service.db_schema import Teacher
from services.s3_service import s3_service
from comapping.answer_sheet_processing.cutting import ImageProcess
from comapping.answer_sheet_processing.extraction_pipeline import ExtractionPipeline
from critera_extraction.answer_schema import main as extract_main

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
@app.get('/co_questions/{subject_id}')
def co_questions(subject_id:int,db_service:DBServiceForServer=Depends(get_db_service)):
    details=db_service.get_co_question(subject_id)
    return details

@app.get("/co_fetch_details/{subject_id}")
def co_details(subject_id: int, db_service: DBServiceForServer = Depends(get_db_service)):
    details = db_service.get_co_details(subject_id)
    return details

@app.get("/co_subject_info/{subject_id}")
def co_subject_info(subject_id: int, db_service: DBServiceForServer = Depends(get_db_service)):
    subject_info = db_service.get_subject_info(subject_id)
    return subject_info

@app.get("/co_download_excel/{subject_id}")
def download_co_excel(subject_id: int, db_service: DBServiceForServer = Depends(get_db_service)):
    """
    Generate and download Excel file with student marks mapped to COs with question breakdown
    Format: Register Number | CO1 (Q1, Q2, Total) | CO2 (Q3, Q4, Total) | ...
    """
    try:
        subject_info = db_service.get_subject_info(subject_id)
        if not subject_info:
            return {"status": "error", "message": "Subject not found"}
        data = db_service.get_co_mapped_data_for_excel(subject_id)
        wb = Workbook()
        ws = wb.active
        ws.title = "CO Mapping"


        border = Border(
            left=Side(style='thin'),
            right=Side(style='thin'),
            top=Side(style='thin'),
            bottom=Side(style='thin')
        )
        
        total_cols = 1  
        for co, questions in data['co_structure'].items():
            total_cols += len(questions) + 1  
        
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_cols)
        title_cell = ws.cell(row=1, column=1)
        title_cell.value = f"{subject_info['name']} - {subject_info['ia']} - CO Mapping"
        title_cell.font = Font(bold=True, size=14)
        title_cell.alignment = Alignment(horizontal='center', vertical='center')
        
        col_idx = 1
        cell = ws.cell(row=2, column=col_idx)
        cell.value = "Register Number"
        cell.font = Font(bold=True, size=11)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border
        ws.merge_cells(start_row=2, start_column=col_idx, end_row=3, end_column=col_idx)
        col_idx += 1
        
 
        for co, questions in data['co_structure'].items():
            start_col = col_idx
            end_col = col_idx + len(questions)  
            
            ws.merge_cells(start_row=2, start_column=start_col, end_row=2, end_column=end_col)
            cell = ws.cell(row=2, column=start_col)
            cell.value = co
            cell.font = Font(bold=True, size=10)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = border
            
            col_idx = end_col + 1
        
        col_idx = 2  
        
        for co, questions in data['co_structure'].items():
            for question in questions:
                cell = ws.cell(row=3, column=col_idx)
                cell.value = question
                cell.font = Font(bold=True, size=9)
                cell.alignment = Alignment(horizontal='center', vertical='center')
                cell.border = border
                ws.column_dimensions[chr(64 + col_idx)].width = 8
                col_idx += 1
            
            cell = ws.cell(row=3, column=col_idx)
            cell.value = f"Total {co}"
            cell.font = Font(bold=True, size=9)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = border
            ws.column_dimensions[chr(64 + col_idx)].width = 10
            col_idx += 1
        
        for row_idx, student in enumerate(data['students'], start=4):
            col_idx = 1
            
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.value = student['regno']
            cell.border = border
            cell.alignment = Alignment(horizontal='center', vertical='center')
            col_idx += 1
            
            for co, questions in data['co_structure'].items():
                student_co_marks = student['marks'].get(co, {})
                
                for question in questions:
                    cell = ws.cell(row=row_idx, column=col_idx)
                    cell.value = student_co_marks.get(question, 0)
                    cell.border = border
                    cell.alignment = Alignment(horizontal='center', vertical='center')
                    col_idx += 1
                
                cell = ws.cell(row=row_idx, column=col_idx)
                cell.value = student_co_marks.get('total', 0)
                cell.border = border
                cell.alignment = Alignment(horizontal='center', vertical='center')
                cell.font = Font(bold=True)
                col_idx += 1
  
        ws.column_dimensions['A'].width = 18
        
        excel_file = BytesIO()
        wb.save(excel_file)
        excel_file.seek(0)
        
        filename = f"{subject_info['name']}_{subject_info['ia']}_CO_Mapping.xlsx"
        
        return StreamingResponse(
            excel_file,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except Exception as e:
        print(f"Error generating Excel: {str(e)}")
        import traceback
        traceback.print_exc()
        return {"status": "error", "message": f"Failed to generate Excel: {str(e)}"}

@app.delete("/co_delete/{subject_id}")
def delete_co(subject_id: int, db_service: DBServiceForServer = Depends(get_db_service)):
    success = db_service.delete_co_subject(subject_id)
    if success:
        return {"status": "success", "message": "CO deleted successfully"}
    else:
        return {"status": "error", "message": "CO not found"}

@app.get("/students_by_subject/{subject_id}")
def get_students(subject_id: int, db_service: DBServiceForServer = Depends(get_db_service)):
    students = db_service.get_students_by_subject(subject_id)
    return students

@app.get("/student_marks/{subject_id}/{regno}")
def get_student_marks(subject_id: int, regno: str, db_service: DBServiceForServer = Depends(get_db_service)):
    marks = db_service.get_student_marks_detail(subject_id, regno)
    return marks

@app.delete("/student_marks/{subject_id}/{regno}")
def delete_student_marks(subject_id: int, regno: str, db_service: DBServiceForServer = Depends(get_db_service)):
    success = db_service.delete_student_marks(subject_id, regno)
    if success:
        return {"status": "success", "message": "Student marks deleted successfully"}
    else:
        return {"status": "error", "message": "Student marks not found"}

@app.post("/student_sheet_upload")
async def student_sheet_upload(
    subject_id: int = Form(...),
    student_image: UploadFile = File(...),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    try:
        unique_id = str(uuid.uuid4())
        file_extension = os.path.splitext(student_image.filename)[1]
        
        # Read file content
        file_content = await student_image.read()
        
        # Upload original image to S3
        original_s3_url = None
        if s3_service.is_available:
            original_s3_url = s3_service.upload_student_sheet(
                file_content=file_content,
                file_extension=file_extension,
                subject_id=subject_id,
                unique_id=unique_id
            )
        
        # Save to temp file for processing
        temp_filename = f"{subject_id}_{unique_id}{file_extension}"
        temp_path = TEMP_FOLDER / temp_filename
        with open(temp_path, "wb") as buffer:
            buffer.write(file_content)
        
        print("=" * 50)
        print("Student Sheet Upload Details:")
        print(f"Subject ID: {subject_id}")
        print(f"Image Unique ID: {unique_id}")
        print(f"Original S3 URL: {original_s3_url or 'S3 not available'}")
        print(f"Temp Path: {temp_path}")
        print("=" * 50)
        
        from db_service import COTemplate
        template = db_service.db.query(COTemplate).filter(COTemplate.id == subject_id).first()
        if not template:
            # Clean up temp file
            if temp_path.exists():
                os.remove(temp_path)
            return {"status": "error", "message": "CO template not found"}
        ia_number = int(template.ia.replace("IA", ""))
    
        # Process the image
        image_processor = ImageProcess()
        processed_images = image_processor.process_student_image(
            image_path=str(temp_path),
            subject_id=subject_id,
            unique_id=unique_id,
            output_dir=None  # Don't save locally, we'll upload to S3
        )
        
        # Upload processed images to S3
        top_s3_url = None
        bot_s3_url = None
        if s3_service.is_available:
            top_s3_url = s3_service.upload_processed_image(
                file_content=processed_images['top_image_bytes'],
                file_extension='.png',
                subject_id=subject_id,
                unique_id=unique_id,
                image_type='top'
            )
            bot_s3_url = s3_service.upload_processed_image(
                file_content=processed_images['bot_image_bytes'],
                file_extension='.png',
                subject_id=subject_id,
                unique_id=unique_id,
                image_type='bot'
            )
        
        print("=" * 50)
        print("Processed Images:")
        print(f"Top S3 URL: {top_s3_url or 'S3 not available'}")
        print(f"Bottom S3 URL: {bot_s3_url or 'S3 not available'}")
        print("=" * 50)
        
        # Extract data using temporary files
        extraction_pipeline = ExtractionPipeline()
        extracted_data = extraction_pipeline.process_student_sheet(
            top_image_path=processed_images['top_image_path'],
            bottom_image_path=processed_images['bot_image_path'],
            subject_id=subject_id,
            ia_id=ia_number,
            save_to_db=True
        )
        
        print("=" * 50)
        print("Extracted Data:")
        print(f"Registration No: {extracted_data['regno']}")
        print(f"Marks: {extracted_data['marks']}")
        print(f"IA Number: {ia_number}")
        print("Data saved to database!")
        print("=" * 50)
        
        # Clean up all temporary files
        try:
            if temp_path.exists():
                os.remove(temp_path)
            image_processor.cleanup_temp_files(
                processed_images['top_image_path'],
                processed_images['bot_image_path']
            )
            print("✓ All temporary files cleaned up")
        except Exception as e:
            print(f"⚠ Failed to clean up some temp files: {e}")
        
        return {
            "status": "success",
            "message": "Student answer sheet uploaded, processed, extracted, and saved to database successfully",
            "data": {
                "subject_id": subject_id,
                "ia_number": ia_number,
                "image_id": unique_id,
                "original_image_url": original_s3_url,
                "top_image_url": top_s3_url,
                "bot_image_url": bot_s3_url,
                "regno": extracted_data['regno'],
                "marks": extracted_data['marks']
            }
        }
    except Exception as e:
        print(f"Error: {str(e)}")
        # Clean up temp files on error
        try:
            if 'temp_path' in locals() and temp_path.exists():
                os.remove(temp_path)
            if 'processed_images' in locals():
                image_processor.cleanup_temp_files(
                    processed_images.get('top_image_path'),
                    processed_images.get('bot_image_path')
                )
        except:
            pass
        return {
            "status": "error",
            "message": f"Failed to upload: {str(e)}"
        }


@app.post("/extract_answer_schema")
async def extract_answer_schema(
    question_no: str = Form(...),
    subject_id: int = Form(...),
    answer_images: list[UploadFile] = File(...),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    try:
        temp_image_paths = []
        temp_dir = Path(tempfile.gettempdir()) / "answer_extraction"
        temp_dir.mkdir(parents=True, exist_ok=True)
        
        for idx, image in enumerate(answer_images):
            file_extension = os.path.splitext(image.filename)[1]
            temp_filename = f"{subject_id}_{question_no}_{idx}_{uuid.uuid4()}{file_extension}"
            temp_path = temp_dir / temp_filename
            
            content = await image.read()
            with open(temp_path, "wb") as f:
                f.write(content)
            
            temp_image_paths.append(str(temp_path))
        
        print(f"Saved {len(temp_image_paths)} images for extraction")
        
        
        result = extract_main(
            image_path=temp_image_paths,
            QUESTION_NO=question_no,
            SUBJECT_ID=subject_id
        )
        
        for temp_path in temp_image_paths:
            try:
                os.remove(temp_path)
            except Exception as e:
                print(f"Warning: Could not delete temp file {temp_path}: {e}")
        
        return {
            "status": "success",
            "message": "Answer schema extracted and saved successfully",
            "data": result
        }
        
    except Exception as e:
        for temp_path in temp_image_paths:
            try:
                if os.path.exists(temp_path):
                    os.remove(temp_path)
            except:
                pass
        
        print(f"Error extracting answer schema: {str(e)}")
        import traceback
        traceback.print_exc()
        
        return {
            "status": "error",
            "message": f"Failed to extract answer schema: {str(e)}"
        }


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
