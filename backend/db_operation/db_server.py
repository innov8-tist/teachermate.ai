from db_service import get_db
from db_service import Subject, COTemplate, StudentAnswerMark, COMAPPEDQUESTION, StudentMark
from sqlalchemy.orm import Session

class DBServiceForServer:
    def __init__(self):
        self.db_generator = get_db()
        self.db: Session = next(self.db_generator)

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def close(self):
        if hasattr(self, 'db') and self.db:
            self.db.close()

    def getting_all_subject(self, semester: int):
        """Get all subjects for a given semester"""
        subjects = self.db.query(Subject).filter(Subject.sem == semester).all()
        return [{"name": sub.name} for sub in subjects]

    def create_co_subject(self, subject_name: str, sem: int, ia_number: int, student_count: int, image_path: str, teacher_id: int):
        """Create a new CO template for a subject"""
        try:
            subject = self.db.query(Subject).filter(
                Subject.name == subject_name,
                Subject.sem == sem
            ).first()
            
            if not subject:
                raise ValueError(f"Subject '{subject_name}' not found for semester {sem}")
            
            new_template = COTemplate(
                ia=f"IA{ia_number}",
                name=subject_name,
                branch=subject.branch,
                sem=sem,
                teacher_id=teacher_id,
                student_count=student_count,
                image_path=image_path
            )
            self.db.add(new_template)
            self.db.commit()
            self.db.refresh(new_template)
            
            return new_template
        except Exception as e:
            self.db.rollback()
            raise e

    def get_all_co_by_teacher(self, teacher_id: int):
        """Get all CO templates created by a teacher"""
        templates = self.db.query(COTemplate).filter(COTemplate.teacher_id == teacher_id).all()
        return [{"id": t.id, "ia": t.ia, "name": t.name, "branch": t.branch, "sem": t.sem} for t in templates]

    def get_co_details(self, subject_id: int):
        """Get CO question mappings for a template"""
        from db_service import COQuestionMapping
        questions = self.db.query(COQuestionMapping).filter(COQuestionMapping.template_id == subject_id).all()
        return [{"q_no": q.q_no, "co_no": q.co_no} for q in questions]

    def get_subject_info(self, subject_id: int):
        """Get subject/template information by ID"""
        template = self.db.query(COTemplate).filter(COTemplate.id == subject_id).first()
        if not template:
            return None
        return {
            "name": template.name,
            "ia": template.ia,
            "branch": template.branch,
            "sem": template.sem,
            "student_count": template.student_count
        }
    def get_co_question(self,subject_id:int):
        questions=self.db.query(COMAPPEDQUESTION).filter(COMAPPEDQUESTION.template_id==subject_id)
        all_questions=[]
        for question in questions:
            all_questions.append(question.q_no)
        return {"all_questions":all_questions}
        
    def get_co_mapped_data_for_excel(self, subject_id: int):
        """Get student marks mapped to COs for Excel export with detailed question breakdown"""
        co_mappings = self.db.query(COMAPPEDQUESTION).filter(
            COMAPPEDQUESTION.template_id == subject_id
        ).all()
        question_to_co = {}
        co_structure = {}
        
        for mapping in co_mappings:
            question_to_co[mapping.q_no] = mapping.co_no
            if mapping.co_no not in co_structure:
                co_structure[mapping.co_no] = []
            co_structure[mapping.co_no].append(mapping.q_no)
        co_structure = {co: sorted(questions) for co, questions in sorted(co_structure.items())}

        students_marks = self.db.query(StudentMark).filter(
            StudentMark.template_id == subject_id
        ).all()
        
        student_data = {}
        for mark in students_marks:
            regno = mark.regno
            question_no = mark.question_no
            mark_value = float(mark.mark) if mark.mark else 0
            
            if regno not in student_data:
                student_data[regno] = {}
            
            co = question_to_co.get(question_no)
            if co:
                if co not in student_data[regno]:
                    student_data[regno][co] = {}
                student_data[regno][co][question_no] = mark_value
        
        for regno in student_data:
            for co in student_data[regno]:
                student_data[regno][co]['total'] = sum(student_data[regno][co].values())
        
        students_list = [
            {
                'regno': regno,
                'marks': marks
            }
            for regno, marks in student_data.items()
        ]
        
        return {
            'students': students_list,
            'co_structure': co_structure
        }

    def get_students_by_subject(self, subject_id: int):
        """Get all students who have submitted answers for a CO template"""
        # Get unique registration numbers for this template
        students = self.db.query(StudentAnswerMark.regno).filter(
            StudentAnswerMark.template_id == subject_id
        ).distinct().all()
        
        return [{"regno": student.regno} for student in students]

    def get_student_marks_detail(self, subject_id: int, regno: str):
        """Get detailed marks for a specific student"""
        marks = self.db.query(StudentAnswerMark).filter(
            StudentAnswerMark.template_id == subject_id,
            StudentAnswerMark.regno == regno
        ).all()
        
        return [{
            "question_no": mark.question_no,
            "mark": mark.mark,
            "ia_id": mark.ia_id
        } for mark in marks]

    def delete_student_marks(self, subject_id: int, regno: str):
        """Delete all marks for a specific student"""
        try:
            deleted_count = self.db.query(StudentAnswerMark).filter(
                StudentAnswerMark.template_id == subject_id,
                StudentAnswerMark.regno == regno
            ).delete()
            
            self.db.commit()
            return deleted_count > 0
        except Exception as e:
            self.db.rollback()
            raise e

    def delete_co_subject(self, subject_id: int):
        """Delete a CO template and all associated data"""
        try:
            from db_service import COQuestionMapping
            # Delete related question mappings and student marks
            self.db.query(COQuestionMapping).filter(COQuestionMapping.template_id == subject_id).delete()
            self.db.query(StudentAnswerMark).filter(StudentAnswerMark.template_id == subject_id).delete()
            
            # Delete the template itself
            template = self.db.query(COTemplate).filter(COTemplate.id == subject_id).first()
            if template:
                self.db.delete(template)
                self.db.commit()
                return True
            return False
        except Exception as e:
            self.db.rollback()
            raise e


    def get_co_templates_by_teacher(self, teacher_id: int):
        """Get all CO templates for a teacher"""
        return self.db.query(COTemplate).filter(COTemplate.teacher_id == teacher_id).all()
    
    def get_co_questions_by_template(self, template_id: int):
        """Get all CO question mappings for a template"""
        from db_service.db_schema import COQuestionMapping
        return self.db.query(COQuestionMapping).filter(COQuestionMapping.template_id == template_id).all()
    
    def get_evaluation_schemas_by_template(self, template_id: int):
        """Get all evaluation schemas (completed questions) for a template"""
        from db_service.db_schema import EvaluationSchema
        return self.db.query(EvaluationSchema).filter(EvaluationSchema.template_id == template_id).all()


    def create_evaluation(self, template_id: int, teacher_id: int, pdf_path: str, created_at: str, updated_at: str):
        """Create a new evaluation record"""
        from db_service.db_schema import Evaluation
        evaluation = Evaluation(
            template_id=template_id,
            teacher_id=teacher_id,
            pdf_path=pdf_path,
            status="in_progress",
            created_at=created_at,
            updated_at=updated_at
        )
        self.db.add(evaluation)
        self.db.commit()
        self.db.refresh(evaluation)
        return evaluation


    def get_evaluations_by_teacher(self, teacher_id: int):
        """Get all evaluations for a teacher"""
        from db_service.db_schema import Evaluation
        return self.db.query(Evaluation).filter(Evaluation.teacher_id == teacher_id).all()


    def get_evaluation_by_id(self, evaluation_id: int):
        """Get evaluation by ID"""
        from db_service.db_schema import Evaluation
        return self.db.query(Evaluation).filter(Evaluation.id == evaluation_id).first()

    def create_student_progress(self, evaluation_id: int, student_reg_no: str, teacher_id: int, 
                              total_questions: int, upload_method: str, pdf_id: str = None, 
                              pdf_filename: str = None, created_at: str = None, updated_at: str = None):
        """Create a new student evaluation progress record"""
        from db_service.db_schema import StudentEvaluationProgress
        progress = StudentEvaluationProgress(
            evaluation_id=evaluation_id,
            student_reg_no=student_reg_no,
            teacher_id=teacher_id,
            total_questions=total_questions,
            completed_questions=0,
            upload_method=upload_method,
            pdf_id=pdf_id,
            pdf_filename=pdf_filename,
            status="in_progress",
            created_at=created_at,
            updated_at=updated_at
        )
        self.db.add(progress)
        self.db.commit()
        self.db.refresh(progress)
        return progress

    def get_student_progress(self, evaluation_id: int, student_reg_no: str):
        """Get existing student progress for an evaluation"""
        from db_service.db_schema import StudentEvaluationProgress
        return self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.evaluation_id == evaluation_id,
            StudentEvaluationProgress.student_reg_no == student_reg_no
        ).first()

    def update_student_progress(self, progress_id: int, upload_method: str = None, 
                              pdf_id: str = None, pdf_filename: str = None, updated_at: str = None):
        """Update existing student progress"""
        from db_service.db_schema import StudentEvaluationProgress
        progress = self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.id == progress_id
        ).first()
        
        if progress:
            if upload_method:
                progress.upload_method = upload_method
            if pdf_id:
                progress.pdf_id = pdf_id
            if pdf_filename:
                progress.pdf_filename = pdf_filename
            if updated_at:
                progress.updated_at = updated_at
            
            self.db.commit()
            self.db.refresh(progress)
        
        return progress

    def get_recent_student_progress(self, evaluation_id: int, teacher_id: int, limit: int = 10):
        """Get recent student progress for an evaluation"""
        from db_service.db_schema import StudentEvaluationProgress
        return self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.evaluation_id == evaluation_id,
            StudentEvaluationProgress.teacher_id == teacher_id
        ).order_by(StudentEvaluationProgress.updated_at.desc()).limit(limit).all()

    def search_students_with_progress(self, evaluation_id: int, teacher_id: int, query: str):
        """Search students by registration number and return with progress info"""
        from db_service.db_schema import StudentEvaluationProgress, STUDENTINFO
        from sqlalchemy import or_, distinct
        
        student_list = []
        
        # First, search in STUDENTINFO table for students that match the query
        students_query = self.db.query(STUDENTINFO).filter(
            or_(
                STUDENTINFO.reg_no.ilike(f"%{query}%"),
                STUDENTINFO.name.ilike(f"%{query}%")
            )
        ).limit(20)  # Limit search results
        
        students = students_query.all()
        processed_reg_nos = set()
        
        # Process students from STUDENTINFO
        for student in students:
            processed_reg_nos.add(student.reg_no)
            progress = self.db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.evaluation_id == evaluation_id,
                StudentEvaluationProgress.student_reg_no == student.reg_no,
                StudentEvaluationProgress.teacher_id == teacher_id
            ).first()
            
            if progress:
                student_data = {
                    "student_reg_no": student.reg_no,
                    "student_name": student.name,
                    "completed_questions": progress.completed_questions,
                    "total_questions": progress.total_questions,
                    "upload_method": progress.upload_method,
                    "pdf_id": progress.pdf_id,  # Include PDF ID for resuming
                    "status": progress.status,
                    "progress_percentage": round((progress.completed_questions / progress.total_questions) * 100) if progress.total_questions > 0 else 0,
                    "updated_at": progress.updated_at
                }
            else:
                student_data = {
                    "student_reg_no": student.reg_no,
                    "student_name": student.name,
                    "completed_questions": 0,
                    "total_questions": 0,
                    "upload_method": "",
                    "pdf_id": None,
                    "status": "not_started",
                    "progress_percentage": 0,
                    "updated_at": ""
                }
            
            student_list.append(student_data)
        
        # Also search in StudentEvaluationProgress for students who have started evaluations
        # but might not be in STUDENTINFO table
        progress_query = self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.evaluation_id == evaluation_id,
            StudentEvaluationProgress.teacher_id == teacher_id,
            StudentEvaluationProgress.student_reg_no.ilike(f"%{query}%")
        ).limit(20)
        
        progress_students = progress_query.all()
        
        for progress in progress_students:
            if progress.student_reg_no not in processed_reg_nos:
                # Try to get student name from STUDENTINFO
                student_info = self.db.query(STUDENTINFO).filter(
                    STUDENTINFO.reg_no == progress.student_reg_no
                ).first()
                
                student_name = student_info.name if student_info else progress.student_reg_no
                
                student_data = {
                    "student_reg_no": progress.student_reg_no,
                    "student_name": student_name,
                    "completed_questions": progress.completed_questions,
                    "total_questions": progress.total_questions,
                    "upload_method": progress.upload_method,
                    "pdf_id": progress.pdf_id,
                    "status": progress.status,
                    "progress_percentage": round((progress.completed_questions / progress.total_questions) * 100) if progress.total_questions > 0 else 0,
                    "updated_at": progress.updated_at
                }
                
                student_list.append(student_data)
                processed_reg_nos.add(progress.student_reg_no)
        
        return student_list

    def complete_question_progress(self, progress_id: int, question_no: str, updated_at: str):
        """Mark a question as completed and increment progress"""
        from db_service.db_schema import StudentEvaluationProgress
        progress = self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.id == progress_id
        ).first()
        
        if progress:
            progress.completed_questions += 1
            progress.last_question_completed = question_no
            progress.updated_at = updated_at
            
            self.db.commit()
            self.db.refresh(progress)
        
        return progress

    def update_progress_status(self, progress_id: int, status: str, updated_at: str):
        """Update the status of student progress"""
        from db_service.db_schema import StudentEvaluationProgress
        progress = self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.id == progress_id
        ).first()
        
        if progress:
            progress.status = status
            progress.updated_at = updated_at
            self.db.commit()
            self.db.refresh(progress)
        
        return progress

    def get_evaluation_questions(self, evaluation_id: int):
        """Get questions for an evaluation (from CO question mappings)"""
        # First get the evaluation to find the template_id
        evaluation = self.get_evaluation_by_id(evaluation_id)
        if not evaluation:
            return []
        
        # Get questions from CO mappings
        from db_service.db_schema import COQuestionMapping
        questions = self.db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id == evaluation.template_id
        ).all()
        
        return [{"id": q.q_no, "label": f"Question {q.q_no}"} for q in questions]
    def get_student_completed_evaluations(self, evaluation_id: int, student_reg_no: str, teacher_id: int):
        """Get completed evaluations for a specific student"""
        from db_service.db_schema import StudentAnswerEvaluation, Evaluation
        
        # First get the evaluation to find the template_id
        evaluation = self.db.query(Evaluation).filter(
            Evaluation.id == evaluation_id,
            Evaluation.teacher_id == teacher_id
        ).first()
        
        if not evaluation:
            return []
        
        # Get completed evaluations for this student and template
        evaluations = self.db.query(StudentAnswerEvaluation).filter(
            StudentAnswerEvaluation.template_id == evaluation.template_id,
            StudentAnswerEvaluation.student_reg_no == student_reg_no
        ).all()
        
        return evaluations