from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from typing import List, Optional
import uuid
import os
from pathlib import Path
from pydantic import BaseModel
from auth.dependencies import get_current_teacher
from db_service.db_schema import Teacher

router = APIRouter(prefix="/api/evaluation", tags=["evaluation"])

# Storage paths
PDF_STORAGE = Path("public/evaluation_pdfs")
PDF_STORAGE.mkdir(parents=True, exist_ok=True)


@router.post("/upload-pdf")
async def upload_student_pdf(
    pdf_file: UploadFile = File(...),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Upload student answer sheet PDF to S3 for cropping
    """
    from services.s3_service import s3_service
    
    try:
        print(f"📤 Uploading student PDF: {pdf_file.filename}")
        print(f"📤 Teacher ID: {current_teacher.id}")
        
        file_extension = os.path.splitext(pdf_file.filename)[1]
        
        if file_extension.lower() != '.pdf':
            raise HTTPException(status_code=400, detail="Only PDF files are allowed")
        
        content = await pdf_file.read()
        print(f"📤 PDF size: {len(content)} bytes")
        
        # Upload to S3
        s3_url, unique_id = s3_service.upload_evaluation_pdf(content, file_extension)
        
        if not s3_url or not unique_id:
            raise HTTPException(status_code=500, detail="Failed to upload PDF to S3")
        
        print(f"✅ Student PDF uploaded to S3: {s3_url}")
        
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
        
        print(f"✅ Student PDF has {page_count} pages")
        print(f"✅ PDF ID: {unique_id}")
        
        return {
            "success": True,
            "pdf_id": unique_id,
            "pdf_uri": s3_url,  # Return S3 URL
            "page_count": page_count,
            "filename": pdf_file.filename
        }
    
    except Exception as e:
        print(f"❌ Student PDF upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")


@router.post("/upload-schema-pdf")
async def upload_schema_pdf(
    subject: str = Form(...),
    subject_id: int = Form(...),
    pdf_file: UploadFile = File(...),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Upload answer schema PDF to S3 and create Evaluation and EvaluationSchema records
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
        
        # Create EvaluationSchema record in database
        db_service = DBServiceForServer()
        try:
            timestamp = datetime.now().isoformat()
            
            # Create EvaluationSchema record
            evaluation_schema = db_service.create_evaluation_schema(
                template_id=subject_id,
                teacher_id=current_teacher.id,
                pdf_path=s3_url,  # Store S3 URL of complete PDF
                created_at=timestamp,
                updated_at=timestamp
            )
            print(f"✅ EvaluationSchema record created with ID: {evaluation_schema.id}")
            
            # Store ID before closing the session
            evaluation_schema_id = evaluation_schema.id
            
        finally:
            db_service.close()
        
        print(f"✅ PDF ID: {unique_id}")
        
        return {
            "success": True,
            "evaluation_schema_id": evaluation_schema_id,
            "pdf_id": unique_id,
            "pdf_uri": s3_url,  # Return S3 URL
            "subject": subject,
            "subject_id": subject_id
        }
    
    except Exception as e:
        print(f"❌ Upload error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")


@router.post("/submit-student-answer")
async def submit_student_answer(
    evaluation_id: int = Form(...),
    question_id: str = Form(...),
    roll_number: str = Form(...),
    answer_images: List[UploadFile] = File(...),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Submit student answer images for a specific question
    """
    from services.s3_service import s3_service
    
    try:
        print(f"📤 Submitting answer for student {roll_number}, question {question_id}")
        print(f"📤 Evaluation ID: {evaluation_id}")
        print(f"📤 Number of images: {len(answer_images)}")
        
        # Upload each image to S3
        uploaded_urls = []
        for i, img_file in enumerate(answer_images):
            content = await img_file.read()
            
            # Generate unique filename
            file_extension = os.path.splitext(img_file.filename)[1] or '.png'
            unique_filename = f"student-answers/{roll_number}/q{question_id}_{i}{file_extension}"
            
            # Upload to S3 using cropped image upload method
            s3_url = s3_service.upload_cropped_image(content)
            
            if s3_url:
                uploaded_urls.append(s3_url)
                print(f"  ✓ Uploaded image {i + 1}: {s3_url}")
            else:
                print(f"  ⚠ Failed to upload image {i + 1}")
        
        # Here you would typically save to database:
        # - Create student_answer record
        # - Link to evaluation and question
        # - Store image URLs
        
        print(f"✅ Submitted {len(uploaded_urls)} images for student {roll_number}")
        
        return {
            "success": True,
            "message": f"Answer submitted for question {question_id}",
            "student_roll": roll_number,
            "question_id": question_id,
            "images_uploaded": len(uploaded_urls),
            "image_urls": uploaded_urls
        }
    
    except Exception as e:
        print(f"❌ Student answer submission error: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to submit student answer: {str(e)}")


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


@router.post("/student-progress")
async def create_student_progress(
    evaluation_id: int = Form(...),
    student_reg_no: str = Form(...),
    upload_method: str = Form(...),  # 'pdf' or 'camera'
    pdf_id: Optional[str] = Form(None),
    pdf_filename: Optional[str] = Form(None),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Create or update student evaluation progress
    """
    from datetime import datetime
    from db_operation.db_server import DBServiceForServer
    
    try:
        print(f"📝 Creating progress for student {student_reg_no} in evaluation {evaluation_id}")
        print(f"📝 Upload method: {upload_method}")
        print(f"📝 PDF ID: {pdf_id}")
        print(f"📝 PDF filename: {pdf_filename}")
        print(f"📝 Teacher ID: {current_teacher.id}")
        
        db_service = DBServiceForServer()
        try:
            # Get total questions for this evaluation
            questions = db_service.get_evaluation_questions(evaluation_id)
            total_questions = len(questions) if questions else 0
            print(f"📝 Total questions in evaluation: {total_questions}")

            timestamp = datetime.now().isoformat()
            
            # Check if progress already exists
            existing_progress = db_service.get_student_progress(evaluation_id, student_reg_no)
            
            if existing_progress:
                print(f"📝 Updating existing progress (ID: {existing_progress.id})")
                # Update existing progress
                progress = db_service.update_student_progress(
                    progress_id=existing_progress.id,
                    upload_method=upload_method,
                    pdf_id=pdf_id,
                    pdf_filename=pdf_filename,
                    updated_at=timestamp
                )
                print(f"✅ Updated existing progress for student {student_reg_no}")
            else:
                print(f"📝 Creating new progress record")
                # Create new progress
                progress = db_service.create_student_progress(
                    evaluation_id=evaluation_id,
                    student_reg_no=student_reg_no,
                    teacher_id=current_teacher.id,
                    total_questions=total_questions,
                    upload_method=upload_method,
                    pdf_id=pdf_id,
                    pdf_filename=pdf_filename,
                    created_at=timestamp,
                    updated_at=timestamp
                )
                print(f"✅ Created new progress for student {student_reg_no} (ID: {progress.id})")
            
            return {
                "success": True,
                "progress_id": progress.id,
                "student_reg_no": student_reg_no,
                "total_questions": total_questions,
                "completed_questions": progress.completed_questions
            }
        finally:
            db_service.close()
    
    except Exception as e:
        print(f"❌ Error creating student progress: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create student progress: {str(e)}")


@router.post("/create-sample-students")
async def create_sample_students(
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Create sample students for testing (development only)
    """
    from db_operation.db_server import DBServiceForServer
    
    try:
        print("📝 Creating sample students for testing...")
        
        db_service = DBServiceForServer()
        try:
            from db_service.db_schema import STUDENTINFO
            
            # Sample students
            sample_students = [
                {"reg_no": "21CSE001", "name": "John Doe"},
                {"reg_no": "21CSE002", "name": "Jane Smith"},
                {"reg_no": "21CSE003", "name": "Bob Johnson"},
                {"reg_no": "21CSE004", "name": "Alice Brown"},
                {"reg_no": "21CSE005", "name": "Charlie Wilson"},
                {"reg_no": "22CSE001", "name": "David Lee"},
                {"reg_no": "22CSE002", "name": "Emma Davis"},
                {"reg_no": "22CSE003", "name": "Frank Miller"},
                {"reg_no": "22CSE004", "name": "Grace Taylor"},
                {"reg_no": "22CSE005", "name": "Henry Anderson"},
            ]
            
            created_count = 0
            for student_data in sample_students:
                # Check if student already exists
                existing = db_service.db.query(STUDENTINFO).filter(
                    STUDENTINFO.reg_no == student_data["reg_no"]
                ).first()
                
                if not existing:
                    student = STUDENTINFO(
                        reg_no=student_data["reg_no"],
                        name=student_data["name"]
                    )
                    db_service.db.add(student)
                    created_count += 1
            
            db_service.db.commit()
            print(f"✅ Created {created_count} sample students")
            
            return {
                "success": True,
                "message": f"Created {created_count} sample students",
                "students": sample_students
            }
        finally:
            db_service.close()
    
    except Exception as e:
        print(f"❌ Error creating sample students: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to create sample students: {str(e)}")


@router.get("/student-progress/{evaluation_id}")
async def get_recent_student_progress(
    evaluation_id: int,
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Get recent student evaluation progress for an evaluation
    """
    from db_operation.db_server import DBServiceForServer
    
    try:
        print(f"📊 Getting recent progress for evaluation {evaluation_id}")
        
        db_service = DBServiceForServer()
        try:
            # Get recent progress entries (last 10)
            recent_progress = db_service.get_recent_student_progress(evaluation_id, current_teacher.id, limit=10)
            
            progress_list = []
            for progress in recent_progress:
                progress_list.append({
                    "id": progress.id,
                    "student_reg_no": progress.student_reg_no,
                    "completed_questions": progress.completed_questions,
                    "total_questions": progress.total_questions,
                    "upload_method": progress.upload_method,
                    "pdf_id": progress.pdf_id,  # Include PDF ID for resuming
                    "pdf_filename": progress.pdf_filename,
                    "status": progress.status,
                    "created_at": progress.created_at,
                    "updated_at": progress.updated_at,
                    "progress_percentage": round((progress.completed_questions / progress.total_questions) * 100) if progress.total_questions > 0 else 0
                })
            
            print(f"✅ Found {len(progress_list)} recent progress entries")
            
            return {
                "success": True,
                "recent_progress": progress_list
            }
        finally:
            db_service.close()
    
    except Exception as e:
        print(f"❌ Error getting student progress: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get student progress: {str(e)}")


@router.get("/search-students/{evaluation_id}")
async def search_students(
    evaluation_id: int,
    query: str,
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Search for students by registration number with progress info
    """
    from db_operation.db_server import DBServiceForServer
    
    try:
        print(f"🔍 Searching students for query: '{query}' in evaluation {evaluation_id}")
        print(f"🔍 Teacher ID: {current_teacher.id}")
        
        db_service = DBServiceForServer()
        try:
            # Search students and get their progress
            students = db_service.search_students_with_progress(evaluation_id, current_teacher.id, query)
            
            print(f"🔍 Found {len(students)} students matching query '{query}'")
            
            student_list = []
            for student_data in students:
                student_list.append({
                    "student_reg_no": student_data["student_reg_no"],
                    "student_name": student_data.get("student_name", ""),
                    "completed_questions": student_data.get("completed_questions", 0),
                    "total_questions": student_data.get("total_questions", 0),
                    "upload_method": student_data.get("upload_method", ""),
                    "pdf_id": student_data.get("pdf_id"),  # Include PDF ID for resuming
                    "status": student_data.get("status", "not_started"),
                    "progress_percentage": student_data.get("progress_percentage", 0),
                    "last_updated": student_data.get("updated_at", "")
                })
            
            print(f"✅ Returning {len(student_list)} students in response")
            for student in student_list:
                print(f"  - {student['student_reg_no']}: {student['student_name']} ({student['status']})")
            
            return {
                "success": True,
                "students": student_list
            }
        finally:
            db_service.close()
    
    except Exception as e:
        print(f"❌ Error searching students: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to search students: {str(e)}")


@router.put("/student-progress/{progress_id}/complete-question")
async def complete_question(
    progress_id: int,
    question_no: str = Form(...),
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Mark a question as completed for a student
    """
    from datetime import datetime
    from db_operation.db_server import DBServiceForServer
    
    try:
        print(f"✅ Marking question {question_no} as completed for progress {progress_id}")
        
        db_service = DBServiceForServer()
        try:
            timestamp = datetime.now().isoformat()
            
            # Update progress
            progress = db_service.complete_question_progress(
                progress_id=progress_id,
                question_no=question_no,
                updated_at=timestamp
            )
            
            if not progress:
                raise HTTPException(status_code=404, detail="Progress not found")
            
            # Check if all questions are completed
            if progress.completed_questions >= progress.total_questions:
                db_service.update_progress_status(progress_id, "completed", timestamp)
                print(f"🎉 All questions completed for student {progress.student_reg_no}")
            
            return {
                "success": True,
                "progress_id": progress_id,
                "completed_questions": progress.completed_questions,
                "total_questions": progress.total_questions,
                "is_completed": progress.completed_questions >= progress.total_questions
            }
        finally:
            db_service.close()
    
    except Exception as e:
        print(f"❌ Error completing question: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to complete question: {str(e)}")

@router.get("/student-evaluations/{evaluation_id}/{student_reg_no}")
async def get_student_evaluations(
    evaluation_id: int,
    student_reg_no: str,
    current_teacher: Teacher = Depends(get_current_teacher)
):
    """
    Get completed evaluations for a specific student in an evaluation
    """
    from db_operation.db_server import DBServiceForServer
    
    try:
        print(f"📊 Getting evaluations for student {student_reg_no} in evaluation {evaluation_id}")
        
        db_service = DBServiceForServer()
        try:
            # Get completed evaluations for this student
            completed_evaluations = db_service.get_student_completed_evaluations(
                evaluation_id, student_reg_no, current_teacher.id
            )
            
            evaluation_list = []
            for evaluation in completed_evaluations:
                # Parse student_image_paths if it's JSON
                image_paths = evaluation.student_image_paths
                if isinstance(image_paths, str):
                    import json
                    try:
                        image_paths = json.loads(image_paths)
                    except:
                        image_paths = []
                
                evaluation_list.append({
                    "question_no": evaluation.question_no,
                    "mark_score": evaluation.mark_score,
                    "total_mark": evaluation.total_mark,
                    "feedback": evaluation.feedback,
                    "student_image_paths": image_paths,
                    "evaluated_at": evaluation.evaluated_at
                })
            
            print(f"✅ Found {len(evaluation_list)} completed evaluations")
            
            return {
                "success": True,
                "evaluations": evaluation_list
            }
        finally:
            db_service.close()
    
    except Exception as e:
        print(f"❌ Error getting student evaluations: {str(e)}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Failed to get student evaluations: {str(e)}")