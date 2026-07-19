from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from typing import Optional
from modules.auth.models import Teacher
from modules.auth.dependencies import get_current_teacher
from dependencies import get_db_service
from db_operation.db_server import DBServiceForServer
from .service import EvaluationService

router = APIRouter(prefix="/api/evaluation", tags=["evaluations"])
router_no_prefix = APIRouter(tags=["evaluations"])

# --- Prefix Routes ---

@router.get("/{evaluation_id}/questions")
async def get_evaluation_questions(
    evaluation_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return service.get_evaluation_questions(evaluation_id, current_teacher)

@router.get("/{evaluation_id}/results")
async def get_evaluation_results(
    evaluation_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return service.get_evaluation_results(evaluation_id, current_teacher)

@router.get("/{evaluation_id}/student/{student_reg_no}/details")
async def get_student_evaluation_details(
    evaluation_id: int,
    student_reg_no: str,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return service.get_student_evaluation_details(evaluation_id, student_reg_no, current_teacher)

@router.delete("/{evaluation_id}/student/{student_reg_no}")
async def delete_student_evaluation_results(
    evaluation_id: int,
    student_reg_no: str,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return service.delete_student_evaluation_results(evaluation_id, student_reg_no, current_teacher)

@router.delete("/{evaluation_id}")
async def delete_evaluation_schema(
    evaluation_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return service.delete_evaluation_schema(evaluation_id, current_teacher)

@router.get("/student-progress/{schema_id}")
async def get_student_progress(
    schema_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return service.get_student_progress(schema_id, current_teacher.id)

@router.get("/search-students/{schema_id}")
async def search_students(
    schema_id: int,
    query: str,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return service.search_students(schema_id, current_teacher.id, query)

@router.post("/upload-pdf")
async def upload_student_pdf_for_evaluation(
    pdf_file: UploadFile = File(...),
    evaluation_id: Optional[int] = Form(default=None),
    student_reg_no: Optional[str] = Form(default=None),
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return await service.upload_student_pdf_for_evaluation(pdf_file, evaluation_id, student_reg_no, current_teacher)

@router.post("/start-evaluation/{progress_id}")
async def start_evaluation(
    progress_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return await service.start_evaluation(progress_id, current_teacher)

# --- No-Prefix Routes ---

@router_no_prefix.get("/evaluations/{teacher_id}")
async def get_evaluations(
    teacher_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return service.get_evaluations(teacher_id, current_teacher)

@router_no_prefix.get("/evaluation/{evaluation_id}")
async def get_evaluation_details(
    evaluation_id: int,
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return service.get_evaluation_details(evaluation_id, current_teacher)

@router_no_prefix.post("/upload_evaluation_pdf")
async def upload_evaluation_pdf(
    template_id: int = Form(...),
    answer_key_pdf: UploadFile = File(...),
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
    service = EvaluationService(db_service)
    return await service.upload_evaluation_pdf(template_id, answer_key_pdf, current_teacher)
