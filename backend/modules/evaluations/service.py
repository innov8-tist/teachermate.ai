from typing import List, Optional
from db_operation.db_server import DBServiceForServer
from modules.auth.models import Teacher
from fastapi import HTTPException, UploadFile, File, Form
import os
import traceback
import uuid
import tempfile
import fitz
from datetime import datetime
from services.s3_service import s3_service
from llm_gateway.lite_llm_config import LiteLLMConfig
from llm_gateway.schemas_prompts import GEMINI_PROMPT, GROQ_PROMPT
from db_service.db_schema import StudentAnswerEvaluation, StudentEvaluationProgress, EvaluationSchema
from modules.co_mapper.models import StudentAnswerMark, COTemplate

class EvaluationService:
    def __init__(self, db_service: DBServiceForServer):
        self.db_service = db_service

    def get_evaluations(self, teacher_id: int, current_teacher: Teacher):
        if current_teacher.id != teacher_id:
            raise HTTPException(status_code=403, detail="Access denied")
        
        try:
            evaluation_schemas = self.db_service.get_evaluation_schemas_by_teacher(teacher_id)
            
            evaluations = []
            for schema in evaluation_schemas:
                template = self.db_service.get_subject_info(schema.template_id)
                if not template:
                    continue
                questions = self.db_service.get_co_questions_by_template(schema.template_id)
                total_students_in_class = template.get('student_count', 0)
                completed_students = self.db_service.count_completed_students(schema.id)
                
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
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_evaluation_details(self, evaluation_id: int, current_teacher: Teacher):
        try:
            evaluation = self.db_service.get_evaluation_schema_by_id(evaluation_id)
            if not evaluation:
                raise HTTPException(status_code=404, detail="Evaluation not found")
            if evaluation.teacher_id != current_teacher.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            template = self.db_service.get_subject_info(evaluation.template_id)
            
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
            raise HTTPException(status_code=500, detail=str(e))

    def get_evaluation_questions(self, evaluation_id: int, current_teacher: Teacher):
        try:
            evaluation = self.db_service.get_evaluation_schema_by_id(evaluation_id)
            if not evaluation:
                raise HTTPException(status_code=404, detail="Evaluation not found")
            if evaluation.teacher_id != current_teacher.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            questions = self.db_service.get_co_questions_by_template(evaluation.template_id)
            return {
                "success": True,
                "questions": questions
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    def get_evaluation_results(self, evaluation_id: int, current_teacher: Teacher):
        try:
            evaluation = self.db_service.get_evaluation_schema_by_id(evaluation_id)
            
            if not evaluation:
                raise HTTPException(status_code=404, detail="Evaluation not found")
            
            if evaluation.teacher_id != current_teacher.id:
                raise HTTPException(status_code=403, detail="Access denied")
            

            progress_records = self.db_service.db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.schema_id == evaluation_id,
                StudentEvaluationProgress.teacher_id == current_teacher.id
            ).all()
            
            students = []
            for progress in progress_records:
                evaluations = self.db_service.db.query(StudentAnswerEvaluation).filter(
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
            raise HTTPException(status_code=500, detail=str(e))

    def get_student_evaluation_details(self, evaluation_id: int, student_reg_no: str, current_teacher: Teacher):
        try:
            evaluation = self.db_service.get_evaluation_schema_by_id(evaluation_id)
            
            if not evaluation:
                raise HTTPException(status_code=404, detail="Evaluation not found")
            
            if evaluation.teacher_id != current_teacher.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            progress = self.db_service.db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.schema_id == evaluation_id,
                StudentEvaluationProgress.student_reg_no == student_reg_no,
                StudentEvaluationProgress.teacher_id == current_teacher.id
            ).first()
            
            if not progress:
                raise HTTPException(status_code=404, detail="Student evaluation not found")
            
            evaluations = self.db_service.db.query(StudentAnswerEvaluation).filter(
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
            raise HTTPException(status_code=500, detail=str(e))

    def delete_student_evaluation_results(self, evaluation_id: int, student_reg_no: str, current_teacher: Teacher):
        try:
            evaluation = self.db_service.get_evaluation_schema_by_id(evaluation_id)
            
            if not evaluation:
                raise HTTPException(status_code=404, detail="Evaluation not found")
            
            if evaluation.teacher_id != current_teacher.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            progress = self.db_service.db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.schema_id == evaluation_id,
                StudentEvaluationProgress.student_reg_no == student_reg_no,
                StudentEvaluationProgress.teacher_id == current_teacher.id
            ).first()
            
            if not progress:
                raise HTTPException(status_code=404, detail="Student evaluation not found")
            
            deleted_evaluations = self.db_service.db.query(StudentAnswerEvaluation).filter(
                StudentAnswerEvaluation.progress_id == progress.id
            ).delete()
            
            self.db_service.db.delete(progress)
            
            deleted_co_marks = 0
            
            template = self.db_service.db.query(COTemplate).filter(
                COTemplate.id == evaluation.template_id
            ).first()
            
            if template:
                ia_number = int(template.ia.replace("IA", ""))
                
                deleted_co_marks = self.db_service.db.query(StudentAnswerMark).filter(
                    StudentAnswerMark.template_id == evaluation.template_id,
                    StudentAnswerMark.regno == student_reg_no,
                    StudentAnswerMark.ia_id == ia_number
                ).delete()
            
            self.db_service.db.commit()
            
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
            self.db_service.db.rollback()
            raise HTTPException(status_code=500, detail=str(e))

    def delete_evaluation_schema(self, evaluation_id: int, current_teacher: Teacher):
        try:
            evaluation = self.db_service.db.query(EvaluationSchema).filter(
                EvaluationSchema.id == evaluation_id
            ).first()
            
            if not evaluation:
                raise HTTPException(status_code=404, detail="Evaluation not found")

            if evaluation.teacher_id != current_teacher.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            progress_records = self.db_service.db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.schema_id == evaluation_id
            ).all()
            
            for progress in progress_records:
                self.db_service.db.query(StudentAnswerEvaluation).filter(
                    StudentAnswerEvaluation.progress_id == progress.id
                ).delete()
            
            self.db_service.db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.schema_id == evaluation_id
            ).delete()
            
            self.db_service.db.delete(evaluation)
            self.db_service.db.commit()
            
            return {
                "success": True,
                "message": "Evaluation deleted successfully"
            }
        
        except HTTPException:
            raise
        except Exception as e:
            self.db_service.db.rollback()
            raise HTTPException(status_code=500, detail=f"Failed to delete evaluation: {str(e)}")

    async def upload_evaluation_pdf(self, template_id: int, answer_key_pdf: UploadFile, current_teacher: Teacher):
        try:
            if not answer_key_pdf.filename.endswith('.pdf'):
                raise HTTPException(status_code=400, detail="Only PDF files are allowed")
            
            template = self.db_service.get_subject_info(template_id)
            if not template:
                raise HTTPException(status_code=404, detail="Subject not found")
            
            file_content = await answer_key_pdf.read()
            
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
            
            timestamp = datetime.now().isoformat()
            evaluation_schema = self.db_service.create_evaluation_schema(
                template_id=template_id,
                teacher_id=current_teacher.id,
                pdf_path=pdf_s3_url,
                created_at=timestamp,
                updated_at=timestamp
            )
            
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
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")

    def get_student_progress(self, schema_id: int, teacher_id: int):
        try:
            recent_progress = self.db_service.get_recent_student_progress(schema_id, teacher_id, limit=10)
            
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
            
            return {
                "success": True,
                "recent_progress": progress_list
            }
        
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to get student progress: {str(e)}")

    def search_students(self, schema_id: int, teacher_id: int, query: str):
        try:
            students = self.db_service.search_students_with_progress(schema_id, teacher_id, query)
            
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
            
            return {
                "success": True,
                "students": student_list
            }
        
        except Exception as e:
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to search students: {str(e)}")

    async def upload_student_pdf_for_evaluation(self, pdf_file: UploadFile, evaluation_id: Optional[int], student_reg_no: Optional[str], current_teacher: Teacher):
        try:
            file_extension = os.path.splitext(pdf_file.filename)[1]
            
            if file_extension.lower() != '.pdf':
                raise HTTPException(status_code=400, detail="Only PDF files are allowed")
            
            content = await pdf_file.read()
            
            unique_id = str(uuid.uuid4())
            
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
            
            progress_id = None
            if evaluation_id and student_reg_no:
                timestamp = datetime.now().isoformat()
                
                questions = self.db_service.get_evaluation_questions(evaluation_id)
                total_questions = len(questions) if questions else 0
         
                existing_progress = self.db_service.get_student_progress(evaluation_id, student_reg_no)
                
                if existing_progress:
                    self.db_service.update_student_progress(
                        progress_id=existing_progress.id,
                        upload_method='pdf',
                        student_pdf_path=s3_url,
                        updated_at=timestamp
                    )
                    progress_id = existing_progress.id
                else:
                    progress = self.db_service.create_student_progress(
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
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Failed to upload PDF: {str(e)}")

    async def start_evaluation(self, progress_id: int, current_teacher: Teacher):
        try:
            progress = self.db_service.get_student_progress_by_id(progress_id)
            if not progress:
                raise HTTPException(status_code=404, detail="Progress record not found")
            
            if progress.teacher_id != current_teacher.id:
                raise HTTPException(status_code=403, detail="Access denied")
            
            evaluation_schema = self.db_service.get_evaluation_schema_by_id(progress.schema_id)
            if not evaluation_schema:
                raise HTTPException(status_code=404, detail="Evaluation schema not found")
            
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
            
            obj = LiteLLMConfig(GEMINI_PROMPT=GEMINI_PROMPT, GROQ_PROMPT=GROQ_PROMPT)
            
            raw_evaluation = await obj.gemini(answer_key_url, student_pdf_url)
            
            structured_result = await obj.groq(raw_evaluation)
            
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
            
            success = self.db_service.create_student_answer_evaluations(evaluations_data)
            
            if not success:
                raise HTTPException(status_code=500, detail="Failed to save evaluations to database")

            sync_success = self.db_service.sync_evaluation_to_co_mapper(progress_id)
            
            total_marks_obtained = sum(e['mark_score'] for e in evaluations_data)
            total_marks_possible = sum(e['total_mark'] for e in evaluations_data)
            
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
            traceback.print_exc()
            raise HTTPException(status_code=500, detail=f"Evaluation failed: {str(e)}")
