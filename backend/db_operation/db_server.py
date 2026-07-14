from db_service import get_db
from sqlalchemy.orm import Session
from db_service import Subject, COTemplate, StudentAnswerMark, COMAPPEDQUESTION, StudentMark
from db_service.db_schema import EvaluationSchema, StudentAnswerEvaluation  
from db_service.db_schema import COQuestionMapping
from db_service.db_schema import StudentEvaluationProgress, STUDENTINFO
from sqlalchemy import or_, distinct
from datetime import datetime

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
        questions = self.db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id == subject_id
        ).all()
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
        # Get CO question mappings from database
        co_mappings = self.db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id == subject_id
        ).all()
        
        if not co_mappings:
            print(f"⚠️ Warning: No CO question mappings found for template {subject_id}")
            return {
                'students': [],
                'co_structure': {}
            }
        
        question_to_co = {}
        co_structure = {}
        
        # Build CO structure from database mappings
        for mapping in co_mappings:
            question_to_co[mapping.q_no] = mapping.co_no
            if mapping.co_no not in co_structure:
                co_structure[mapping.co_no] = []
            co_structure[mapping.co_no].append(mapping.q_no)
        
        # Custom sort function for question numbers (handles 1, 2, 6.a, 6.b, 7.a, etc.)
        def sort_question_key(q):
            """Sort questions naturally: 1, 2, 3, 6.a, 6.b, 7.a, 7.b, 8"""
            try:
                # Split on '.' to handle sub-questions
                parts = str(q).split('.')
                if len(parts) == 1:
                    # Simple number like "1", "2", "3"
                    return (int(parts[0]), '')
                else:
                    # Sub-question like "6.a", "7.b"
                    return (int(parts[0]), parts[1])
            except:
                # Fallback for any unexpected format
                return (0, str(q))
        
        # Sort questions within each CO and sort COs
        co_structure = {
            co: sorted(questions, key=sort_question_key) 
            for co, questions in sorted(co_structure.items())
        }
        
        print(f"\n{'='*60}")
        print(f"CO Structure for template {subject_id}:")
        for co, questions in co_structure.items():
            print(f"  {co}: {questions}")
        print(f"{'='*60}\n")

        # Get student marks
        students_marks = self.db.query(StudentAnswerMark).filter(
            StudentAnswerMark.template_id == subject_id
        ).all()
        
        student_data = {}
        for mark in students_marks:
            regno = mark.regno
            question_no = mark.question_no
            mark_value = float(mark.mark) if mark.mark else 0
            
            if regno not in student_data:
                student_data[regno] = {}
            
            # Map question to CO using database mappings
            co = question_to_co.get(question_no)
            if co:
                if co not in student_data[regno]:
                    student_data[regno][co] = {}
                student_data[regno][co][question_no] = mark_value
            else:
                print(f"⚠️ Warning: Question {question_no} not found in CO mappings for student {regno}")
        
        # Calculate totals for each CO
        for regno in student_data:
            for co in student_data[regno]:
                student_data[regno][co]['total'] = sum(
                    v for k, v in student_data[regno][co].items() if k != 'total'
                )
        
        # Get student names from STUDENTINFO table
        students_list = []
        for regno, marks in student_data.items():
            student_info = self.db.query(STUDENTINFO).filter(STUDENTINFO.reg_no == regno).first()
            student_name = student_info.name if student_info else ""
            
            students_list.append({
                'regno': regno,
                'name': student_name,
                'marks': marks
            })
        
        # Sort by registration number
        students_list.sort(key=lambda x: x['regno'])
        
        return {
            'students': students_list,
            'co_structure': co_structure
        }

    def get_students_by_subject(self, subject_id: int):
        """Get all students who have submitted answers for a CO template"""
 
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
        """
        Delete all marks for a specific student from CO Mapper
        Also deletes corresponding evaluation records
        """
        try:
            print(f"\n{'='*60}")
            print(f"DELETING STUDENT MARKS FROM CO MAPPER")
            print(f"Student: {regno}")
            print(f"Template ID: {subject_id}")
            print(f"{'='*60}\n")
            
            # Delete CO mapper marks
            deleted_marks = self.db.query(StudentAnswerMark).filter(
                StudentAnswerMark.template_id == subject_id,
                StudentAnswerMark.regno == regno
            ).delete()
            
            print(f"✓ Deleted {deleted_marks} CO mapper marks")
            
            # Also delete from Evaluation system
            # Find all evaluation schemas for this template
            evaluation_schemas = self.db.query(EvaluationSchema).filter(
                EvaluationSchema.template_id == subject_id
            ).all()
            
            total_deleted_evaluations = 0
            total_deleted_progress = 0
            
            for schema in evaluation_schemas:
                # Find progress records for this student
                progress_records = self.db.query(StudentEvaluationProgress).filter(
                    StudentEvaluationProgress.schema_id == schema.id,
                    StudentEvaluationProgress.student_reg_no == regno
                ).all()
                
                for progress in progress_records:
                    # Delete evaluation records
                    deleted_evals = self.db.query(StudentAnswerEvaluation).filter(
                        StudentAnswerEvaluation.progress_id == progress.id
                    ).delete()
                    total_deleted_evaluations += deleted_evals
                    
                    # Delete progress record
                    self.db.delete(progress)
                    total_deleted_progress += 1
            
            self.db.commit()
            
            print(f"✓ Deleted {total_deleted_evaluations} evaluation records")
            print(f"✓ Deleted {total_deleted_progress} progress records")
            print(f"\n{'='*60}")
            print(f"✅ DELETION COMPLETE")
            print(f"CO mapper marks: {deleted_marks}")
            print(f"Evaluation records: {total_deleted_evaluations}")
            print(f"Progress records: {total_deleted_progress}")
            print(f"{'='*60}\n")
            
            return deleted_marks > 0
        except Exception as e:
            self.db.rollback()
            print(f"Error deleting student marks: {e}")
            raise e

    def delete_co_subject(self, subject_id: int):
        """Delete a CO template and all associated data"""
        try:

            print(f" Deleting CO template {subject_id} and all associated data...")
            
            evaluation_schemas = self.db.query(EvaluationSchema).filter(
                EvaluationSchema.template_id == subject_id
            ).all()
            
            print(f"  Found {len(evaluation_schemas)} evaluation schemas to delete")
            
 
            for schema in evaluation_schemas:
              
                progress_records = self.db.query(StudentEvaluationProgress).filter(
                    StudentEvaluationProgress.schema_id == schema.id
                ).all()
                
                print(f"  Schema {schema.id}: Found {len(progress_records)} progress records")
                
              
                for progress in progress_records:
                    self.db.query(StudentAnswerEvaluation).filter(
                        StudentAnswerEvaluation.progress_id == progress.id
                    ).delete()
                
             
                self.db.query(StudentEvaluationProgress).filter(
                    StudentEvaluationProgress.schema_id == schema.id
                ).delete()
                
        
                self.db.delete(schema)
            
   
            self.db.query(COQuestionMapping).filter(COQuestionMapping.template_id == subject_id).delete()
            self.db.query(StudentAnswerMark).filter(StudentAnswerMark.template_id == subject_id).delete()
            
            template = self.db.query(COTemplate).filter(COTemplate.id == subject_id).first()
            if template:
                self.db.delete(template)
                self.db.commit()
                print(f"Successfully deleted CO template {subject_id} and all associated data")
                return True
            return False
        except Exception as e:
            self.db.rollback()
            print(f"Error deleting CO template: {e}")
            raise e


    def get_co_questions_by_template(self, template_id: int):
        """Get all CO question mappings for a template"""
        
        return self.db.query(COQuestionMapping).filter(COQuestionMapping.template_id == template_id).all()

    def get_evaluation_schemas_by_teacher(self, teacher_id: int):
        """Get all evaluation schemas for a teacher"""
        
        return self.db.query(EvaluationSchema).filter(EvaluationSchema.teacher_id == teacher_id).all()

    def get_evaluation_schema_by_id(self, schema_id: int):
        """Get evaluation schema by ID"""
        
        return self.db.query(EvaluationSchema).filter(EvaluationSchema.id == schema_id).first()

    def create_student_progress(self, schema_id: int, student_reg_no: str, teacher_id: int, 
                              total_questions: int, upload_method: str, student_pdf_path: str = None, 
                              created_at: str = None, updated_at: str = None):
        """Create a new student evaluation progress record"""
        
        progress = StudentEvaluationProgress(
            schema_id=schema_id,
            student_reg_no=student_reg_no,
            teacher_id=teacher_id,
            total_questions=total_questions,
            upload_method=upload_method,
            student_pdf_path=student_pdf_path,
            created_at=created_at,
            updated_at=updated_at
        )
        self.db.add(progress)
        self.db.commit()
        self.db.refresh(progress)
        return progress

    def get_student_progress(self, schema_id: int, student_reg_no: str):
        """Get existing student progress for an evaluation schema"""
        
        return self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == schema_id,
            StudentEvaluationProgress.student_reg_no == student_reg_no
        ).first()

    def update_student_progress(self, progress_id: int, upload_method: str = None, 
                              student_pdf_path: str = None, updated_at: str = None):
        """Update existing student progress"""
        
        progress = self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.id == progress_id
        ).first()
        
        if progress:
            if upload_method:
                progress.upload_method = upload_method
            if student_pdf_path:
                progress.student_pdf_path = student_pdf_path
            if updated_at:
                progress.updated_at = updated_at
            
            self.db.commit()
            self.db.refresh(progress)
        
        return progress

    def get_recent_student_progress(self, schema_id: int, teacher_id: int, limit: int = 10):
        """Get recent student progress for an evaluation schema"""
        
        return self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == schema_id,
            StudentEvaluationProgress.teacher_id == teacher_id
        ).order_by(StudentEvaluationProgress.updated_at.desc()).limit(limit).all()

    def search_students_with_progress(self, schema_id: int, teacher_id: int, query: str):
        """Search students by registration number and return with progress info - OPTIMIZED"""
        from sqlalchemy import or_
        from db_service.db_schema import StudentEvaluationProgress, STUDENTINFO
        
        # Normalize query for better matching
        query = query.strip().upper()
        
        if len(query) < 2:
            return []
        
        print(f"🔍 Searching for: '{query}' in schema {schema_id}")
        
        # Single optimized query using LEFT JOIN
        # This gets all students matching the query AND their progress in one go
        results = self.db.query(
            STUDENTINFO.reg_no,
            STUDENTINFO.name,
            StudentEvaluationProgress.id.label('progress_id'),
            StudentEvaluationProgress.total_questions,
            StudentEvaluationProgress.upload_method,
            StudentEvaluationProgress.student_pdf_path,
            StudentEvaluationProgress.updated_at
        ).outerjoin(
            StudentEvaluationProgress,
            (STUDENTINFO.reg_no == StudentEvaluationProgress.student_reg_no) &
            (StudentEvaluationProgress.schema_id == schema_id) &
            (StudentEvaluationProgress.teacher_id == teacher_id)
        ).filter(
            or_(
                STUDENTINFO.reg_no.ilike(f"%{query}%"),
                STUDENTINFO.name.ilike(f"%{query}%")
            )
        ).limit(20).all()
        
        student_list = []
        for row in results:
            student_data = {
                "student_reg_no": row.reg_no,
                "student_name": row.name,
                "total_questions": row.total_questions or 0,
                "upload_method": row.upload_method or "",
                "student_pdf_path": row.student_pdf_path,
                "updated_at": row.updated_at or "",
                "progress_id": row.progress_id
            }
            student_list.append(student_data)
            
            if row.progress_id:
                print(f"  ✅ {row.reg_no}: HAS PROGRESS (ID: {row.progress_id})")
            else:
                print(f"  ⚪ {row.reg_no}: NO PROGRESS")
        
        print(f"🔍 Returning {len(student_list)} students")
        return student_list

    def get_evaluation_questions(self, schema_id: int):
        """Get questions for an evaluation schema (from CO question mappings)"""
        schema = self.get_evaluation_schema_by_id(schema_id)
        if not schema:
            return []
 
        
        questions = self.db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id == schema.template_id
        ).all()
        
        return [{"id": q.q_no, "label": f"Question {q.q_no}"} for q in questions]
    def create_evaluation_schema(self, template_id: int, teacher_id: int, pdf_path: str, created_at: str, updated_at: str):
        """Create a new evaluation schema record"""
        
        evaluation_schema = EvaluationSchema(
            template_id=template_id,
            teacher_id=teacher_id,
            pdf_path=pdf_path,
            status="active",
            created_at=created_at,
            updated_at=updated_at
        )
        self.db.add(evaluation_schema)
        self.db.commit()
        self.db.refresh(evaluation_schema)
        return evaluation_schema

    def create_student_answer_evaluations(self, evaluations_data: list):
        """
        Bulk create student answer evaluations
        
        Args:
            evaluations_data: List of dicts with keys:
                - progress_id
                - teacher_id
                - student_reg_no
                - question_no
                - mark_score
                - total_mark
                - feedback (list)
                - evaluated_at
        """
        try:
            
            
            evaluation_records = []
            for eval_data in evaluations_data:
                evaluation = StudentAnswerEvaluation(
                    progress_id=eval_data['progress_id'],
                    teacher_id=eval_data['teacher_id'],
                    student_reg_no=eval_data['student_reg_no'],
                    question_no=eval_data['question_no'],
                    mark_score=eval_data['mark_score'],
                    total_mark=eval_data['total_mark'],
                    feedback=eval_data['feedback'],
                    evaluated_at=eval_data['evaluated_at']
                )
                evaluation_records.append(evaluation)
            
            self.db.bulk_save_objects(evaluation_records)
            self.db.commit()
            
            print(f"Created {len(evaluation_records)} evaluation records")
            return True
            
        except Exception as e:
            self.db.rollback()
            print(f"Error creating student answer evaluations: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def sync_evaluation_to_co_mapper(self, progress_id: int):
        """
        Sync evaluation results to CO mapper (StudentAnswerMark table)
        This automatically creates CO mapper entries when evaluation is completed
        """
        try:
            # Get progress record to find schema and template
            progress = self.get_student_progress_by_id(progress_id)
            if not progress:
                print(f"Progress {progress_id} not found")
                return False
            
            # Get evaluation schema to find template_id
            schema = self.get_evaluation_schema_by_id(progress.schema_id)
            if not schema:
                print(f"Schema {progress.schema_id} not found")
                return False
            
            template_id = schema.template_id
            student_reg_no = progress.student_reg_no
            
            # Get template to find IA number
            template = self.db.query(COTemplate).filter(COTemplate.id == template_id).first()
            if not template:
                print(f"Template {template_id} not found")
                return False
            
            ia_number = int(template.ia.replace("IA", ""))
            
            # Get all evaluations for this progress
            evaluations = self.db.query(StudentAnswerEvaluation).filter(
                StudentAnswerEvaluation.progress_id == progress_id
            ).all()
            
            if not evaluations:
                print(f"No evaluations found for progress {progress_id}")
                return False
            
            print(f"\n{'='*60}")
            print(f"SYNCING EVALUATION TO CO MAPPER")
            print(f"Progress ID: {progress_id}")
            print(f"Student: {student_reg_no}")
            print(f"Template ID: {template_id}")
            print(f"IA Number: {ia_number}")
            print(f"Questions to sync: {len(evaluations)}")
            print(f"{'='*60}\n")
            
            # Delete existing marks for this student and template (to avoid duplicates)
            self.db.query(StudentAnswerMark).filter(
                StudentAnswerMark.template_id == template_id,
                StudentAnswerMark.regno == student_reg_no,
                StudentAnswerMark.ia_id == ia_number
            ).delete()
            
            # Create StudentAnswerMark records from evaluations
            marks_created = 0
            for evaluation in evaluations:
                mark_record = StudentAnswerMark(
                    question_no=evaluation.question_no,
                    mark=str(evaluation.mark_score),  # Convert to string as per schema
                    regno=student_reg_no,
                    template_id=template_id,
                    ia_id=ia_number
                )
                self.db.add(mark_record)
                marks_created += 1
                print(f"  ✓ Q{evaluation.question_no}: {evaluation.mark_score}/{evaluation.total_mark} marks")
            
            self.db.commit()
            
            print(f"\n{'='*60}")
            print(f"✅ SYNC COMPLETED: {marks_created} marks added to CO Mapper")
            print(f"{'='*60}\n")
            
            return True
            
        except Exception as e:
            self.db.rollback()
            print(f"Error syncing evaluation to CO mapper: {str(e)}")
            import traceback
            traceback.print_exc()
            return False

    def sync_co_mapper_to_evaluation(self, template_id: int, student_reg_no: str, ia_number: int):
        """
        Reverse sync: Create evaluation records from CO mapper data
        This is called when student answer sheet is uploaded directly to CO Mapper
        """
        try:
            print(f"\n{'='*60}")
            print(f"REVERSE SYNC: CO MAPPER → EVALUATION")
            print(f"Student: {student_reg_no}")
            print(f"Template ID: {template_id}")
            print(f"IA Number: {ia_number}")
            print(f"{'='*60}\n")
            
            # Get CO mapper marks for this student
            co_marks = self.db.query(StudentAnswerMark).filter(
                StudentAnswerMark.template_id == template_id,
                StudentAnswerMark.regno == student_reg_no,
                StudentAnswerMark.ia_id == ia_number
            ).all()
            
            if not co_marks:
                print(f"⚠️ No CO mapper marks found for student {student_reg_no}")
                return False
            
            print(f"Found {len(co_marks)} CO mapper marks")
            
            # Find evaluation schema for this template
            evaluation_schema = self.db.query(EvaluationSchema).filter(
                EvaluationSchema.template_id == template_id
            ).first()
            
            if not evaluation_schema:
                print(f"⚠️ No evaluation schema found for template {template_id}")
                print(f"   Student marks saved to CO Mapper only")
                return False
            
            print(f"Found evaluation schema: {evaluation_schema.id}")
            
            # Check if progress record already exists
            existing_progress = self.db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.schema_id == evaluation_schema.id,
                StudentEvaluationProgress.student_reg_no == student_reg_no
            ).first()
            
            if existing_progress:
                print(f"⚠️ Evaluation progress already exists for student {student_reg_no}")
                print(f"   Skipping reverse sync to avoid duplicates")
                return False
            
            # Create progress record
            timestamp = datetime.now().isoformat()
            progress = StudentEvaluationProgress(
                schema_id=evaluation_schema.id,
                teacher_id=evaluation_schema.teacher_id,
                student_reg_no=student_reg_no,
                upload_method='co_mapper',  # Special marker for CO mapper uploads
                student_pdf_path=None,  # No PDF for CO mapper uploads
                total_questions=len(co_marks),
                created_at=timestamp,
                updated_at=timestamp
            )
            self.db.add(progress)
            self.db.flush()  # Get progress.id
            
            print(f"✓ Created progress record (ID: {progress.id})")
            
            # Create evaluation records from CO mapper marks
            evaluations_created = 0
            for mark in co_marks:
                evaluation = StudentAnswerEvaluation(
                    progress_id=progress.id,
                    teacher_id=evaluation_schema.teacher_id,
                    student_reg_no=student_reg_no,
                    question_no=mark.question_no,
                    mark_score=float(mark.mark),
                    total_mark=int(float(mark.mark)),  # Assuming full marks for CO mapper
                    feedback=[],  # No feedback for CO mapper uploads
                    evaluated_at=timestamp
                )
                self.db.add(evaluation)
                evaluations_created += 1
                print(f"  ✓ Q{mark.question_no}: {mark.mark} marks")
            
            self.db.commit()
            
            print(f"\n{'='*60}")
            print(f"✅ REVERSE SYNC COMPLETED")
            print(f"Progress record created: 1")
            print(f"Evaluation records created: {evaluations_created}")
            print(f"{'='*60}\n")
            
            return True
            
        except Exception as e:
            self.db.rollback()
            print(f"Error in reverse sync: {str(e)}")
            import traceback
            traceback.print_exc()
            return False
    
    def get_student_progress_by_id(self, progress_id: int):
        """Get student evaluation progress by ID"""
        
        return self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.id == progress_id
        ).first()
    
    def count_completed_students(self, schema_id: int):
        """Count the number of students who have completed evaluations for a schema"""
        

        count = self.db.query(StudentEvaluationProgress.student_reg_no).filter(
            StudentEvaluationProgress.schema_id == schema_id
        ).distinct().count()
        
        return count
