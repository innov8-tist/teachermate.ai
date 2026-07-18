from fastapi import FastAPI, Depends, File, UploadFile, Form, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from fastapi.staticfiles import StaticFiles
from typing import Optional
import uvicorn
import os
import uuid
import tempfile
import asyncio
from pathlib import Path
from io import BytesIO
from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from models.pydanticmodel import CoCreationModel
from db_operation.db_server import DBServiceForServer
from comapping.teacher_co_processing.extracting import main_func
from routes.auth import router as auth_router
from routes.analytics import router as analytics_router
from auth.dependencies import get_current_teacher
from db_service.db_schema import Teacher
from services.s3_service import s3_service
from comapping.answer_sheet_processing.cutting import ImageProcess
from comapping.answer_sheet_processing.extraction_pipeline import ExtractionPipeline
from datetime import datetime
from db_service import COTemplate
from db_service.db_schema import StudentAnswerEvaluation, STUDENTINFO, StudentAnswerMark
from db_service.db_schema import EvaluationSchema, StudentEvaluationProgress
from llm_gateway.lite_llm_config import LiteLLMConfig
from llm_gateway.schemas_prompts import GEMINI_PROMPT,GROQ_PROMPT
import requests
import sys
import traceback
import fitz
import tempfile
import os
import shutil
app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],  
)
app.include_router(auth_router)
app.include_router(analytics_router)
app.mount("/public", StaticFiles(directory="public"), name="public")

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

@app.get("/health")
def health_check():
    """
    Health check endpoint for monitoring and load balancers
    Returns service status, environment info, and database connectivity
    """
    try:
        # Get environment
        environment = os.getenv("ENVIRONMENT", "development")

        # Check database connectivity
        db_service = DBServiceForServer()
        try:
            # Simple query to test DB connection
            from sqlalchemy import text
            db_service.db.execute(text("SELECT 1"))
            db_status = "healthy"
            db_message = "Database connection successful"
        except Exception as e:
            db_status = "unhealthy"
            db_message = f"Database error: {str(e)}"
        finally:
            db_service.close()

        # Check S3 availability
        s3_status = "available" if s3_service.is_available else "unavailable"

        return {
            "status": "healthy" if db_status == "healthy" else "degraded",
            "message": "Service is running",
            "environment": environment,
            "timestamp": datetime.now().isoformat(),
            "version": "1.0.2",
            "services": {
                "database": {
                    "status": db_status,
                    "message": db_message
                },
                "s3": {
                    "status": s3_status
                }
            }
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "message": f"Health check failed: {str(e)}",
            "environment": os.getenv("ENVIRONMENT", "unknown"),
            "timestamp": datetime.now().isoformat()
        }


@app.get("/subject_fetch/{semester}")
def fetching_all_subject(semester: int, db_service: DBServiceForServer = Depends(get_db_service)):
    subjects = db_service.getting_all_subject(semester)
    return subjects

@app.post("/co_creation")
async def co_creation(
    subject_name: str = Form(...),
    sem: int = Form(...),
    ia_number: int = Form(...),
    student_count: int = Form(...),
    co_image: UploadFile = File(...),
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    print(f"Received Form Data:")
    print(f"subject_name: {subject_name} (type: {type(subject_name)})")
    print(f"sem: {sem} (type: {type(sem)})")
    print(f"ia_number: {ia_number} (type: {type(ia_number)})")
    print(f"student_count: {student_count} (type: {type(student_count)})")
    
    co_data = CoCreationModel(
        subject_name=subject_name,
        sem=sem,
        ia_number=ia_number,
        student_count=student_count
    )
    
    unique_id = str(uuid.uuid4())
    file_extension = os.path.splitext(co_image.filename)[1]
    
    file_content = await co_image.read()
    

    s3_url = None
    if s3_service.is_available:
        s3_url = s3_service.upload_co_image(file_content, file_extension)
        print(f"Uploaded CO image to S3: {s3_url}")
    
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
    print(f"Student Count: {co_data.student_count}")
    print(f"Image Unique ID: {unique_id}")
    print(f"S3 URL: {s3_url or 'S3 not available'}")
    print(f"Temp Path: {temp_path}")
    print("=" * 50)
    
    try:
        created_subject = db_service.create_co_subject(
            subject_name=co_data.subject_name,
            sem=co_data.sem,
            ia_number=co_data.ia_number,
            student_count=co_data.student_count,
            teacher_id=current_teacher.id,
            image_path=s3_url or str(temp_path)  
        )
        
        main_func(image_path=str(temp_path), subject_id=created_subject.id)
        
        try:
            os.remove(temp_path)
            print(f"Cleaned up temp file: {temp_path}")
        except Exception as e:
            print(f"Failed to clean up temp file: {e}")
        
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
    
        if temp_path.exists():
            os.remove(temp_path)
        return {
            "status": "error",
            "message": str(e)
        }
    except Exception as e:
  
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
        
        # Calculate total columns needed
        total_cols = 2  # Registration Number + Name columns
        for co, questions in data['co_structure'].items():
            total_cols += len(questions) + 1  # questions + total column
        
        # ROW 1: Title row (merged across all columns)
        # Set value BEFORE merging
        title_cell = ws.cell(row=1, column=1)
        title_cell.value = f"{subject_info['name']} - {subject_info['ia']} - CO Mapping"
        title_cell.font = Font(bold=True, size=14)
        title_cell.alignment = Alignment(horizontal='center', vertical='center')
        ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=total_cols)
        
        # ROW 2 & 3: Headers
        # Column A: Registration Number (merged rows 2-3)
        cell = ws.cell(row=2, column=1)
        cell.value = "Register Number"
        cell.font = Font(bold=True, size=11)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border
        ws.merge_cells(start_row=2, start_column=1, end_row=3, end_column=1)
        
        # Column B: Student Name (merged rows 2-3)
        cell = ws.cell(row=2, column=2)
        cell.value = "Student Name"
        cell.font = Font(bold=True, size=11)
        cell.alignment = Alignment(horizontal='center', vertical='center')
        cell.border = border
        ws.merge_cells(start_row=2, start_column=2, end_row=3, end_column=2)
        
        # CO Headers (row 2) and Question numbers (row 3)
        col_idx = 3  # Start after Name column
        
        for co, questions in data['co_structure'].items():
            start_col = col_idx
            end_col = col_idx + len(questions)  # Include total column
            
            # Set CO name BEFORE merging
            cell = ws.cell(row=2, column=start_col)
            cell.value = co
            cell.font = Font(bold=True, size=10)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = border
            ws.merge_cells(start_row=2, start_column=start_col, end_row=2, end_column=end_col)
            
            # Add borders to merged cells in row 2
            for c in range(start_col, end_col + 1):
                ws.cell(row=2, column=c).border = border
            
            # Question numbers in row 3
            for question in questions:
                cell = ws.cell(row=3, column=col_idx)
                cell.value = question
                cell.font = Font(bold=True, size=9)
                cell.alignment = Alignment(horizontal='center', vertical='center')
                cell.border = border
                # Set column width
                col_letter = ws.cell(row=3, column=col_idx).column_letter
                ws.column_dimensions[col_letter].width = 8
                col_idx += 1
            
            # Total column for this CO
            cell = ws.cell(row=3, column=col_idx)
            cell.value = f"Total {co}"
            cell.font = Font(bold=True, size=9)
            cell.alignment = Alignment(horizontal='center', vertical='center')
            cell.border = border
            col_letter = ws.cell(row=3, column=col_idx).column_letter
            ws.column_dimensions[col_letter].width = 10
            col_idx += 1
        
        # Data rows with student information
        for row_idx, student in enumerate(data['students'], start=4):
            col_idx = 1
            
            # Registration number
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.value = student['regno']
            cell.border = border
            cell.alignment = Alignment(horizontal='center', vertical='center')
            col_idx += 1
            
            # Student name
            cell = ws.cell(row=row_idx, column=col_idx)
            cell.value = student.get('name', '')
            cell.border = border
            cell.alignment = Alignment(horizontal='left', vertical='center')
            col_idx += 1
            
            # Marks for each CO
            for co, questions in data['co_structure'].items():
                student_co_marks = student['marks'].get(co, {})
                
                # Individual question marks
                for question in questions:
                    cell = ws.cell(row=row_idx, column=col_idx)
                    cell.value = student_co_marks.get(question, 0)
                    cell.border = border
                    cell.alignment = Alignment(horizontal='center', vertical='center')
                    col_idx += 1
                
                # Total for this CO
                cell = ws.cell(row=row_idx, column=col_idx)
                cell.value = student_co_marks.get('total', 0)
                cell.border = border
                cell.alignment = Alignment(horizontal='center', vertical='center')
                cell.font = Font(bold=True)
                col_idx += 1
        
        # Adjust column widths
        ws.column_dimensions['A'].width = 18  # Registration Number
        ws.column_dimensions['B'].width = 25  # Student Name
        
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
        traceback.print_exc()
        return {"status": "error", "message": f"Failed to generate Excel: {str(e)}"}

@app.delete("/co_delete/{subject_id}")
def delete_co(subject_id: int, db_service: DBServiceForServer = Depends(get_db_service)):
    success = db_service.delete_co_subject(subject_id)
    if success:
        return {"status": "success", "message": "CO deleted successfully"}
    else:
        return {"status": "error", "message": "CO not found"}


@app.post("/upload_evaluation_pdf")
async def upload_evaluation_pdf(
    template_id: int = Form(...),
    answer_key_pdf: UploadFile = File(...),
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Upload answer key PDF for evaluation
    Teacher selects a CO subject and uploads the answer key PDF
    """
    try:
        if not answer_key_pdf.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        template = db_service.get_subject_info(template_id)
        if not template:
            raise HTTPException(status_code=404, detail="Subject not found")
        
        file_content = await answer_key_pdf.read()
        
        # S3 is required for evaluation
        if not s3_service.is_available:
            raise HTTPException(
                status_code=503, 
                detail="S3 storage is required for PDF evaluation but is not available. Please check S3 configuration."
            )

        pdf_s3_url = s3_service.upload_evaluation_pdf(
            file_content=file_content,
            template_id=template_id,
            teacher_id=current_teacher.id,
            filename=answer_key_pdf.filename
        )
        
        if not pdf_s3_url:
            raise HTTPException(
                status_code=500, 
                detail="Failed to upload PDF to S3. Please try again."
            )
        
        print(f"Uploaded answer key PDF to S3: {pdf_s3_url}")
        
        
        timestamp = datetime.now().isoformat()
        
        evaluation_schema = db_service.create_evaluation_schema(
            template_id=template_id,
            teacher_id=current_teacher.id,
            pdf_path=pdf_s3_url,
            created_at=timestamp,
            updated_at=timestamp
        )
        
        print("=" * 50)
        print("Evaluation PDF Upload:")
        print(f"Teacher ID: {current_teacher.id}")
        print(f"Template ID: {template_id}")
        print(f"Subject: {template['name']}")
        print(f"PDF Path: {pdf_s3_url}")
        print(f"Schema ID: {evaluation_schema.id}")
        print("=" * 50)
        
        return {
            "status": "success",
            "message": "Answer key PDF uploaded successfully",
            "data": {
                "schema_id": evaluation_schema.id,
                "template_id": template_id,
                "subject_name": template['name'],
                "pdf_path": pdf_s3_url,
                "created_at": timestamp
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error uploading evaluation PDF: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")


@app.get("/api/evaluation/student-progress/{schema_id}")
async def get_student_progress(
    schema_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Get recent student evaluation progress for an evaluation schema
    """
    try:

        recent_progress = db_service.get_recent_student_progress(schema_id, current_teacher.id, limit=10)
        
        progress_list = []
        for progress in recent_progress:
            progress_list.append({
                "id": progress.id,
                "student_reg_no": progress.student_reg_no,
                "total_questions": progress.total_questions,
                "upload_method": progress.upload_method,
                "pdf_id": progress.student_pdf_path,
                "created_at": progress.created_at,
                "updated_at": progress.updated_at
            })
        
        print(f"Found {len(progress_list)} recent progress entries")
        
        return {
            "success": True,
            "recent_progress": progress_list
        }
    
    except Exception as e:
        print(f"Error getting student progress: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get student progress: {str(e)}")


@app.get("/api/evaluation/search-students/{schema_id}")
async def search_students(
    schema_id: int,
    query: str,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Search for students by registration number with progress info
    """
    try:
        print(f"Searching students for query: '{query}' in schema {schema_id}")
        print(f"Teacher ID: {current_teacher.id}")
        

        students = db_service.search_students_with_progress(schema_id, current_teacher.id, query)
        
        print(f"Found {len(students)} students matching query '{query}'")
        
        student_list = []
        for student_data in students:
            student_list.append({
                "student_reg_no": student_data["student_reg_no"],
                "student_name": student_data.get("student_name", ""),
                "total_questions": student_data.get("total_questions", 0),
                "upload_method": student_data.get("upload_method", ""),
                "pdf_id": student_data.get("student_pdf_path"),
                "last_updated": student_data.get("updated_at", ""),
                "progress_id": student_data.get("progress_id")  
            })
        
        print(f"Returning {len(student_list)} students in response")
        for student in student_list:
            print(f"  - {student['student_reg_no']}: {student['student_name']}")
        
        return {
            "success": True,
            "students": student_list
        }
    
    except Exception as e:
        print(f"Error searching students: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to search students: {str(e)}")


@app.post("/api/evaluation/upload-pdf")
async def upload_student_pdf_for_evaluation(
    pdf_file: UploadFile = File(...),
    evaluation_id: Optional[int] = Form(default=None),
    student_reg_no: Optional[str] = Form(default=None),
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Upload student answer sheet PDF to S3 for evaluation
    If evaluation_id and student_reg_no are provided, also saves to student_evaluation_progress
    """
    try:
        print(f"Uploading student PDF: {pdf_file.filename}")
        print(f"Teacher ID: {current_teacher.id}")
        print(f"Evaluation ID: {evaluation_id}")
        print(f"Student Reg No: {student_reg_no}")
        
        file_extension = os.path.splitext(pdf_file.filename)[1]
        
        if file_extension.lower() != '.pdf':
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        content = await pdf_file.read()
        print(f"PDF size: {len(content)} bytes")
        
        unique_id = str(uuid.uuid4())
        
        # S3 is required for evaluation
        if not s3_service.is_available:
            raise HTTPException(
                status_code=503, 
                detail="S3 storage is required for PDF evaluation but is not available. Please check S3 configuration."
            )
   
        s3_url = s3_service.upload_student_pdf(
            file_content=content,
            teacher_id=current_teacher.id,
            filename=pdf_file.filename,
            unique_id=unique_id
        )
        
        if not s3_url:
            raise HTTPException(
                status_code=500, 
                detail="Failed to upload student PDF to S3. Please try again."
            )
        
        print(f"Student PDF uploaded to S3: {s3_url}")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix='.pdf') as tmp_file:
            tmp_file.write(content)
            tmp_path = tmp_file.name
        
        try:
            doc = fitz.open(tmp_path)
            page_count = len(doc)
            doc.close()
        finally:
            
            if os.path.exists(tmp_path):
                os.remove(tmp_path)
        
        print(f"Student PDF has {page_count} pages")
        print(f"PDF ID: {unique_id}")
        

        progress_id = None
        if evaluation_id and student_reg_no:
            print(f"Saving to student_evaluation_progress...")
            
            
            timestamp = datetime.now().isoformat()
            

            questions = db_service.get_evaluation_questions(evaluation_id)
            total_questions = len(questions) if questions else 0
            
     
            existing_progress = db_service.get_student_progress(evaluation_id, student_reg_no)
            
            if existing_progress:
                print(f"Updating existing progress (ID: {existing_progress.id})")
                progress = db_service.update_student_progress(
                    progress_id=existing_progress.id,
                    upload_method='pdf',
                    student_pdf_path=s3_url,
                    updated_at=timestamp
                )
                progress_id = existing_progress.id
                print(f"Updated progress for student {student_reg_no}")
            else:
                print(f"Creating new progress record")
                progress = db_service.create_student_progress(
                    schema_id=evaluation_id,
                    student_reg_no=student_reg_no,
                    teacher_id=current_teacher.id,
                    total_questions=total_questions,
                    upload_method='pdf',
                    student_pdf_path=s3_url,
                    created_at=timestamp,
                    updated_at=timestamp
                )
                progress_id = progress.id
                print(f"Created progress for student {student_reg_no} (ID: {progress_id})")
        
        return {
            "success": True,
            "pdf_id": unique_id,
            "pdf_uri": s3_url,
            "page_count": page_count,
            "filename": pdf_file.filename,
            "progress_id": progress_id
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Student PDF upload error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")


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
    """
    Delete student marks from CO Mapper
    Also removes corresponding evaluation records
    """
    success = db_service.delete_student_marks(subject_id, regno)
    if success:
        return {
            "status": "success", 
            "message": "Student marks and evaluation records deleted successfully"
        }
    else:
        return {
            "status": "error", 
            "message": "Student marks not found"
        }

@app.post("/student_sheet_upload")
async def student_sheet_upload(
    subject_id: int = Form(...),
    student_image: UploadFile = File(...),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    try:
        unique_id = str(uuid.uuid4())
        file_extension = os.path.splitext(student_image.filename)[1]
        file_content = await student_image.read()
        original_s3_url = None
        if s3_service.is_available:
            original_s3_url = s3_service.upload_student_sheet(
                file_content=file_content,
                file_extension=file_extension,
                subject_id=subject_id,
                unique_id=unique_id
            )
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
        
        
        template = db_service.db.query(COTemplate).filter(COTemplate.id == subject_id).first()
        if not template:
            if temp_path.exists():
                os.remove(temp_path)
            return {"status": "error", "message": "CO template not found"}
        ia_number = int(template.ia.replace("IA", ""))

        image_processor = ImageProcess()
        processed_images = image_processor.process_student_image(
            image_path=str(temp_path),
            subject_id=subject_id,
            unique_id=unique_id,
            output_dir=None  
        )
        
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
        
        # Reverse sync to Evaluation system
        print("\n" + "=" * 50)
        print("ATTEMPTING REVERSE SYNC TO EVALUATION...")
        print("=" * 50)
        reverse_sync_success = db_service.sync_co_mapper_to_evaluation(
            template_id=subject_id,
            student_reg_no=extracted_data['regno'],
            ia_number=ia_number
        )
        if reverse_sync_success:
            print("✅ Successfully synced CO Mapper data to Evaluation system")
        else:
            print("⚠️ Reverse sync skipped (evaluation schema not found or already exists)")
        
        try:
            if temp_path.exists():
                os.remove(temp_path)
            image_processor.cleanup_temp_files(
                processed_images['top_image_path'],
                processed_images['bot_image_path']
            )
            print("All temporary files cleaned up")
        except Exception as e:
            print(f"Failed to clean up some temp files: {e}")
        
        return {
            "status": "success",
            "message": "Student answer sheet uploaded, processed, extracted, and saved to database successfully",
            "evaluation_synced": reverse_sync_success,
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

@app.get("/evaluations/{teacher_id}")
async def get_evaluations(
    teacher_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Get all evaluation schemas for a teacher with their completion status
    """
    try:
        if current_teacher.id != teacher_id:
            raise HTTPException(status_code=403, detail="Access denied")
        evaluation_schemas = db_service.get_evaluation_schemas_by_teacher(teacher_id)
        
        evaluations = []
        for schema in evaluation_schemas:
            template = db_service.get_subject_info(schema.template_id)
            if not template:
                continue
            questions = db_service.get_co_questions_by_template(schema.template_id)
            total_students_in_class = template.get('student_count', 0)
            completed_students = db_service.count_completed_students(schema.id)
            
            evaluation = {
                "evaluation_id": schema.id, 
                "subject_id": schema.template_id,
                "subject_name": template['name'],
                "subject_code": f"{template['branch']}-{template['sem']}",
                "semester": str(template['sem']),
                "branch": template['branch'],
                "ia": template.get('ia', ''),
                "total_questions": len(questions),
                "completed_questions": len(questions),  
                "total_students": total_students_in_class,
                "completed_students": completed_students,  
                "status": schema.status,
                "created_at": schema.created_at,
                "updated_at": schema.updated_at
            }
            evaluations.append(evaluation)
        
        return {
            "success": True,
            "evaluations": evaluations
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching evaluations: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/evaluation/{evaluation_id}")
async def get_evaluation_details(
    evaluation_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Get details of a specific evaluation
    """
    try:
        evaluation = db_service.get_evaluation_schema_by_id(evaluation_id)
        
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        if evaluation.teacher_id != current_teacher.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        template = db_service.get_subject_info(evaluation.template_id)
        
        pdf_path = evaluation.pdf_path
        if pdf_path.startswith('http'):
            pdf_id = pdf_path.split('/')[-1].replace('.pdf', '')
        else:
            
            pdf_filename = os.path.basename(pdf_path)
            pdf_id = os.path.splitext(pdf_filename)[0]
        
        return {
            "success": True,
            "evaluation": {
                "id": evaluation.id,
                "template_id": evaluation.template_id,
                "subject_name": template['name'] if template else "Unknown",
                "pdf_id": pdf_id,
                "pdf_uri": evaluation.pdf_path,  
                "status": evaluation.status,
                "created_at": evaluation.created_at,
                "updated_at": evaluation.updated_at
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching evaluation details: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/evaluation/{evaluation_id}/questions")
async def get_evaluation_questions(
    evaluation_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Get all questions for an evaluation with their completion status
    """
    try:
        evaluation = db_service.get_evaluation_schema_by_id(evaluation_id)
        
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        if evaluation.teacher_id != current_teacher.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        questions = db_service.get_co_questions_by_template(evaluation.template_id)
        all_question_nos = sorted(set(q.q_no for q in questions))
        
        questions_data = []
        for q_no in all_question_nos:
            question_data = {
                "id": q_no,
                "label": f"Question {q_no}",
                "is_completed": True, 
                "images": [],
                "croppedSections": []
            }
            
            questions_data.append(question_data)
        
        return {
            "success": True,
            "questions": questions_data
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching evaluation questions: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/evaluation/{evaluation_id}/results")
async def get_evaluation_results(
    evaluation_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Get evaluation results summary for all students
    """
    try:
        evaluation = db_service.get_evaluation_schema_by_id(evaluation_id)
        
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        if evaluation.teacher_id != current_teacher.id:
            raise HTTPException(status_code=403, detail="Access denied")
        

        progress_records = db_service.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == evaluation_id,
            StudentEvaluationProgress.teacher_id == current_teacher.id
        ).all()
        
        students = []
        for progress in progress_records:
            evaluations = db_service.db.query(StudentAnswerEvaluation).filter(
                StudentAnswerEvaluation.progress_id == progress.id
            ).all()
            
            if not evaluations:
                continue
            
            total_marks_obtained = sum(e.mark_score for e in evaluations)
            total_marks_possible = sum(e.total_mark for e in evaluations)
            
            students.append({
                'student_reg_no': progress.student_reg_no,
                'completed_questions': len(evaluations),
                'total_questions': progress.total_questions,
                'total_marks': total_marks_obtained,
                'max_possible_marks': total_marks_possible
            })
        
        return {
            "students": students
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching evaluation results: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/evaluation/{evaluation_id}/student/{student_reg_no}/details")
async def get_student_evaluation_details(
    evaluation_id: int,
    student_reg_no: str,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Get detailed evaluation results for a specific student
    """
    try:
        evaluation = db_service.get_evaluation_schema_by_id(evaluation_id)
        
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        if evaluation.teacher_id != current_teacher.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        
        
        progress = db_service.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == evaluation_id,
            StudentEvaluationProgress.student_reg_no == student_reg_no,
            StudentEvaluationProgress.teacher_id == current_teacher.id
        ).first()
        
        if not progress:
            raise HTTPException(status_code=404, detail="Student evaluation not found")
        
        evaluations = db_service.db.query(StudentAnswerEvaluation).filter(
            StudentAnswerEvaluation.progress_id == progress.id
        ).order_by(StudentAnswerEvaluation.question_no).all()
        
        results = []
        for evaluation in evaluations:
            results.append({
                'question_no': evaluation.question_no,
                'mark_score': evaluation.mark_score,
                'total_mark': evaluation.total_mark,
                'feedback': evaluation.feedback if evaluation.feedback else []
            })
        
        return {
            "results": results
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error fetching student evaluation details: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/evaluation/{evaluation_id}/student/{student_reg_no}")
async def delete_student_evaluation_results(
    evaluation_id: int,
    student_reg_no: str,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Delete all evaluation results for a specific student
    Also removes corresponding CO mapper entries
    """
    try:
        evaluation = db_service.get_evaluation_schema_by_id(evaluation_id)
        
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")
        
        if evaluation.teacher_id != current_teacher.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        # Find student progress record
        progress = db_service.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == evaluation_id,
            StudentEvaluationProgress.student_reg_no == student_reg_no,
            StudentEvaluationProgress.teacher_id == current_teacher.id
        ).first()
        
        if not progress:
            raise HTTPException(status_code=404, detail="Student evaluation not found")
        
        print(f"\n{'='*60}")
        print(f"DELETING STUDENT EVALUATION")
        print(f"Student: {student_reg_no}")
        print(f"Evaluation ID: {evaluation_id}")
        print(f"Template ID: {evaluation.template_id}")
        print(f"{'='*60}\n")
        
        # Delete evaluation records
        deleted_evaluations = db_service.db.query(StudentAnswerEvaluation).filter(
            StudentAnswerEvaluation.progress_id == progress.id
        ).delete()
        
        print(f"✓ Deleted {deleted_evaluations} evaluation records")
        
        # Delete progress record
        db_service.db.delete(progress)
        print(f"✓ Deleted progress record")
        
        # Initialize deleted_co_marks
        deleted_co_marks = 0
        
        # Also delete from CO Mapper (StudentAnswerMark table)
        # Get template info to find IA number
        template = db_service.db.query(COTemplate).filter(
            COTemplate.id == evaluation.template_id
        ).first()
        
        if template:
            ia_number = int(template.ia.replace("IA", ""))
            
            deleted_co_marks = db_service.db.query(StudentAnswerMark).filter(
                StudentAnswerMark.template_id == evaluation.template_id,
                StudentAnswerMark.regno == student_reg_no,
                StudentAnswerMark.ia_id == ia_number
            ).delete()
            
            print(f"✓ Deleted {deleted_co_marks} CO mapper entries")
            print(f"\n{'='*60}")
            print(f"✅ DELETION COMPLETE")
            print(f"Evaluation records: {deleted_evaluations}")
            print(f"CO mapper entries: {deleted_co_marks}")
            print(f"{'='*60}\n")
        else:
            print(f"⚠️ Warning: Template not found, CO mapper entries not deleted")
            print(f"\n{'='*60}")
            print(f"✅ DELETION COMPLETE (Evaluation only)")
            print(f"Evaluation records: {deleted_evaluations}")
            print(f"CO mapper entries: 0 (template not found)")
            print(f"{'='*60}\n")
        
        db_service.db.commit()
        
        return {
            "success": True,
            "message": "Student evaluation and CO mapper entries deleted successfully",
            "deleted": {
                "evaluation_records": deleted_evaluations,
                "co_mapper_entries": deleted_co_marks
            }
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting student evaluation results: {e}")
        traceback.print_exc()
        db_service.db.rollback()
        raise HTTPException(status_code=500, detail=str(e))
        
        service = StudentAnswerService()
        
        student_evaluations = service.get_student_evaluations(
            evaluation.template_id, 
            student_reg_no
        )
        
        deleted_count = 0
        for eval_record in student_evaluations:
            service.db.delete(eval_record)
            deleted_count += 1
        
        service.db.commit()
        
        return {
            "message": f"Deleted {deleted_count} evaluation records for student {student_reg_no}",
            "deleted_count": deleted_count
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f"Error deleting student evaluation results: {e}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/api/evaluation/{evaluation_id}")
async def delete_evaluation_schema(
    evaluation_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Delete an entire evaluation schema and all associated student progress and evaluations
    """
    try:
        

        evaluation = db_service.db.query(EvaluationSchema).filter(
            EvaluationSchema.id == evaluation_id
        ).first()
        
        if not evaluation:
            raise HTTPException(status_code=404, detail="Evaluation not found")

        if evaluation.teacher_id != current_teacher.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        print(f"Deleting evaluation schema {evaluation_id}...")
        
        progress_records = db_service.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == evaluation_id
        ).all()
        
        for progress in progress_records:
            db_service.db.query(StudentAnswerEvaluation).filter(
                StudentAnswerEvaluation.progress_id == progress.id
            ).delete()
        
        db_service.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == evaluation_id
        ).delete()
        
        db_service.db.delete(evaluation)
        db_service.db.commit()
        
        print(f"Deleted evaluation schema {evaluation_id} and all associated data")
        
        return {
            "success": True,
            "message": "Evaluation deleted successfully"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        print(f" Error deleting evaluation schema: {e}")
        traceback.print_exc()
        db_service.db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete evaluation: {str(e)}")


@app.post("/api/evaluation/start-evaluation/{progress_id}")
async def start_evaluation(
    progress_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    """
    Start AI evaluation for a student's answer sheet
    Downloads PDFs, runs Gemini evaluation, structures with Groq, and saves to database
    """
    try:
        print("=" * 60)
        print(f"Starting evaluation for progress_id: {progress_id}")
        print("=" * 60)
        
        progress = db_service.get_student_progress_by_id(progress_id)
        if not progress:
            raise HTTPException(status_code=404, detail="Progress record not found")
        
        if progress.teacher_id != current_teacher.id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        evaluation_schema = db_service.get_evaluation_schema_by_id(progress.schema_id)
        if not evaluation_schema:
            raise HTTPException(status_code=404, detail="Evaluation schema not found")
        
        print(f"Answer Key PDF: {evaluation_schema.pdf_path}")
        print(f"Student PDF: {progress.student_pdf_path}")
        print(f"Student: {progress.student_reg_no}")
        
        # Validate that both PDFs are S3 URLs (start with http/https)
        if not evaluation_schema.pdf_path.startswith("http"):
            raise HTTPException(
                status_code=400, 
                detail="Answer key PDF must be uploaded to S3. Local paths are not supported for evaluation."
            )
        
        if not progress.student_pdf_path.startswith("http"):
            raise HTTPException(
                status_code=400, 
                detail="Student PDF must be uploaded to S3. Local paths are not supported for evaluation."
            )
        
        answer_key_url = evaluation_schema.pdf_path
        student_pdf_url = progress.student_pdf_path
        
        print(f"Using S3 URLs directly:")
        print(f"  Answer Key: {answer_key_url}")
        print(f"  Student PDF: {student_pdf_url}")
        
        print("\nLiteLLM OBJ Creation....")
        
        obj = LiteLLMConfig(GEMINI_PROMPT=GEMINI_PROMPT, GROQ_PROMPT=GROQ_PROMPT)
        
        print("\nRunning Gemini evaluation with S3 URLs...")
        
        raw_evaluation = await obj.gemini(answer_key_url, student_pdf_url)
        
        print("\nRaw evaluation received, structuring with Groq...")
        structured_result = await obj.groq(raw_evaluation)
        
        print(f"\nStructured {len(structured_result.results)} question evaluations")

        timestamp = datetime.now().isoformat()
        evaluations_data = []
        
        for result in structured_result.results:
            eval_data = {
                "progress_id": progress_id,
                "teacher_id": current_teacher.id,
                "student_reg_no": progress.student_reg_no,
                "question_no": result.question_no,
                "mark_score": result.mark_score,
                "total_mark": int(result.total_marks),
                "feedback": result.feedback,
                "evaluated_at": timestamp
            }
            evaluations_data.append(eval_data)
        
        print(f"\nSaving {len(evaluations_data)} evaluations to database...")
        success = db_service.create_student_answer_evaluations(evaluations_data)
        
        if not success:
            raise HTTPException(status_code=500, detail="Failed to save evaluations to database")

        # Automatically sync evaluation results to CO Mapper
        print("\n" + "=" * 60)
        print("SYNCING EVALUATION TO CO MAPPER...")
        print("=" * 60)
        sync_success = db_service.sync_evaluation_to_co_mapper(progress_id)
        if sync_success:
            print("✅ Successfully synced evaluation results to CO Mapper")
        else:
            print("⚠️ Warning: Failed to sync to CO Mapper (evaluation still saved)")
        
        total_marks_obtained = sum(e['mark_score'] for e in evaluations_data)
        total_marks_possible = sum(e['total_mark'] for e in evaluations_data)
        
        print("\n" + "=" * 60)
        print("EVALUATION COMPLETED SUCCESSFULLY")
        print(f"Total Questions: {len(evaluations_data)}")
        print(f"Marks: {total_marks_obtained}/{total_marks_possible}")
        print(f"Percentage: {(total_marks_obtained/total_marks_possible)*100:.2f}%")
        print(f"CO Mapper: {'✅ Synced' if sync_success else '⚠️ Not synced'}")
        print("=" * 60)
        
        return {
            "status": "success",
            "message": "Evaluation completed successfully",
            "co_mapper_synced": sync_success,
            "data": {
                "progress_id": progress_id,
                "student_reg_no": progress.student_reg_no,
                "total_questions": len(evaluations_data),
                "total_marks_obtained": total_marks_obtained,
                "total_marks_possible": total_marks_possible,
                "percentage": round((total_marks_obtained/total_marks_possible)*100, 2),
                "evaluations": [
                    {
                        "question_no": e['question_no'],
                        "mark_score": e['mark_score'],
                        "total_mark": e['total_mark'],
                        "feedback": e['feedback']
                    }
                    for e in evaluations_data
                ],
                "evaluated_at": timestamp
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        print(f"\nEvaluation error: {str(e)}")
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
