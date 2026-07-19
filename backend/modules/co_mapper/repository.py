"""
CO Mapper Repository
Database access layer for CO mapper operations
All database queries related to CO templates, mappings, and student marks
"""

from sqlalchemy.orm import Session
from typing import List, Dict, Optional
from .models import (
    COTemplate,
    COQuestionMapping,
    StudentAnswerMark,
    Subject
)
from db_service.db_schema import (
    EvaluationSchema,
    StudentEvaluationProgress,
    StudentAnswerEvaluation,
    STUDENTINFO
)
from sqlalchemy import or_
from datetime import datetime


class CoMapperRepository:
    """Repository for CO mapper data access"""
    
    def __init__(self, db: Session):
        self.db = db
    
    # ========== Subject Catalog Operations ==========
    
    def get_subjects_by_semester(self, semester: int):
        """Get all subjects for a given semester from catalog"""
        subjects = self.db.query(Subject).filter(Subject.sem == semester).all()
        return [{"name": sub.name} for sub in subjects]
    
    def get_subject_by_name_and_semester(self, subject_name: str, semester: int):
        """Get subject from catalog by name and semester"""
        return self.db.query(Subject).filter(
            Subject.name == subject_name,
            Subject.sem == semester
        ).first()
    
    # ========== CO Template Operations ==========
    
    def create_co_template(self, subject_name: str, sem: int, ia_number: int, 
                          student_count: int, image_path: str, teacher_id: int):
        """Create a new CO template for a subject"""
        try:
            subject = self.get_subject_by_name_and_semester(subject_name, sem)
            
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
    
    def get_templates_by_teacher(self, teacher_id: int):
        """Get all CO templates created by a teacher"""
        templates = self.db.query(COTemplate).filter(COTemplate.teacher_id == teacher_id).all()
        return [{"id": t.id, "ia": t.ia, "name": t.name, "branch": t.branch, "sem": t.sem} for t in templates]
    
    def get_template_by_id(self, template_id: int):
        """Get CO template by ID"""
        return self.db.query(COTemplate).filter(COTemplate.id == template_id).first()
    
    def get_template_info(self, template_id: int):
        """Get subject/template information by ID"""
        template = self.get_template_by_id(template_id)
        if not template:
            return None
        return {
            "name": template.name,
            "ia": template.ia,
            "branch": template.branch,
            "sem": template.sem,
            "student_count": template.student_count
        }
    
    def delete_template(self, template_id: int):
        """Delete a CO template (without cascading - use service layer for full deletion)"""
        template = self.get_template_by_id(template_id)
        if template:
            self.db.delete(template)
            self.db.commit()
            return True
        return False
    
    # ========== CO Question Mapping Operations ==========
    
    def get_co_mappings_by_template(self, template_id: int):
        """Get CO question mappings for a template"""
        return self.db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id == template_id
        ).all()
    
    def get_co_details(self, template_id: int):
        """Get CO question mappings as list of dicts"""
        questions = self.get_co_mappings_by_template(template_id)
        return [{"q_no": q.q_no, "co_no": q.co_no} for q in questions]
    
    def get_questions_list(self, template_id: int):
        """Get all question numbers for a template"""
        questions = self.get_co_mappings_by_template(template_id)
        return [question.q_no for question in questions]
    
    def delete_mappings_by_template(self, template_id: int):
        """Delete all CO question mappings for a template"""
        self.db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id == template_id
        ).delete()
        self.db.commit()
    
    # ========== Student Marks Operations ==========
    
    def get_students_by_template(self, template_id: int):
        """Get all students who have submitted answers for a CO template"""
        students = self.db.query(StudentAnswerMark.regno).filter(
            StudentAnswerMark.template_id == template_id
        ).distinct().all()
        
        return [{"regno": student.regno} for student in students]
    
    def get_student_marks(self, template_id: int, regno: str):
        """Get detailed marks for a specific student"""
        marks = self.db.query(StudentAnswerMark).filter(
            StudentAnswerMark.template_id == template_id,
            StudentAnswerMark.regno == regno
        ).all()
        
        return [{
            "question_no": mark.question_no,
            "mark": mark.mark,
            "ia_id": mark.ia_id
        } for mark in marks]
    
    def get_all_student_marks_by_template(self, template_id: int):
        """Get all student marks for a template"""
        return self.db.query(StudentAnswerMark).filter(
            StudentAnswerMark.template_id == template_id
        ).all()
    
    def get_student_marks_for_sync(self, template_id: int, regno: str, ia_id: int):
        """Get CO mapper marks for reverse sync to evaluation"""
        return self.db.query(StudentAnswerMark).filter(
            StudentAnswerMark.template_id == template_id,
            StudentAnswerMark.regno == regno,
            StudentAnswerMark.ia_id == ia_id
        ).all()
    
    def delete_student_marks_by_template_and_regno(self, template_id: int, regno: str):
        """Delete all marks for a specific student"""
        deleted_count = self.db.query(StudentAnswerMark).filter(
            StudentAnswerMark.template_id == template_id,
            StudentAnswerMark.regno == regno
        ).delete()
        self.db.commit()
        return deleted_count
    
    def delete_marks_by_template(self, template_id: int):
        """Delete all student marks for a template"""
        self.db.query(StudentAnswerMark).filter(
            StudentAnswerMark.template_id == template_id
        ).delete()
        self.db.commit()
    
    def delete_student_marks_for_sync(self, template_id: int, regno: str, ia_id: int):
        """Delete existing marks before sync (to avoid duplicates)"""
        self.db.query(StudentAnswerMark).filter(
            StudentAnswerMark.template_id == template_id,
            StudentAnswerMark.regno == regno,
            StudentAnswerMark.ia_id == ia_id
        ).delete()
        self.db.commit()
    
    def create_student_mark(self, question_no: str, mark: str, regno: str, template_id: int, ia_id: int):
        """Create a single student mark record"""
        mark_record = StudentAnswerMark(
            question_no=question_no,
            mark=mark,
            regno=regno,
            template_id=template_id,
            ia_id=ia_id
        )
        self.db.add(mark_record)
        return mark_record
    
    def bulk_create_student_marks(self, marks_data: List[Dict]):
        """Bulk create student mark records"""
        mark_records = [
            StudentAnswerMark(**data) for data in marks_data
        ]
        self.db.bulk_save_objects(mark_records)
        self.db.commit()
    
    # ========== Excel Export Data Operations ==========
    
    def get_co_mapped_data_for_excel(self, template_id: int):
        """Get student marks mapped to COs for Excel export with detailed question breakdown"""
        co_mappings = self.get_co_mappings_by_template(template_id)
        
        if not co_mappings:
            print(f"⚠️ Warning: No CO question mappings found for template {template_id}")
            return {
                'students': [],
                'co_structure': {}
            }
        
        question_to_co = {}
        co_structure = {}
        
        for mapping in co_mappings:
            question_to_co[mapping.q_no] = mapping.co_no
            if mapping.co_no not in co_structure:
                co_structure[mapping.co_no] = []
            co_structure[mapping.co_no].append(mapping.q_no)
        
        def sort_question_key(q):
            """Sort questions naturally: 1, 2, 3, 6.a, 6.b, 7.a, 7.b, 8"""
            try:
                parts = str(q).split('.')
                if len(parts) == 1:
                    return (int(parts[0]), '')
                else:
                    return (int(parts[0]), parts[1])
            except:
                return (0, str(q))
        
        co_structure = {
            co: sorted(questions, key=sort_question_key) 
            for co, questions in sorted(co_structure.items())
        }
        
        print(f"\n{'='*60}")
        print(f"CO Structure for template {template_id}:")
        for co, questions in co_structure.items():
            print(f"  {co}: {questions}")
        print(f"{'='*60}\n")
        
        students_marks = self.get_all_student_marks_by_template(template_id)
        
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
            else:
                print(f"⚠️ Warning: Question {question_no} not found in CO mappings for student {regno}")
        
        for regno in student_data:
            for co in student_data[regno]:
                student_data[regno][co]['total'] = sum(
                    v for k, v in student_data[regno][co].items() if k != 'total'
                )
        
        students_list = []
        for regno, marks in student_data.items():
            student_info = self.db.query(STUDENTINFO).filter(STUDENTINFO.reg_no == regno).first()
            student_name = student_info.name if student_info else ""
            
            students_list.append({
                'regno': regno,
                'name': student_name,
                'marks': marks
            })
        
        students_list.sort(key=lambda x: x['regno'])
        
        return {
            'students': students_list,
            'co_structure': co_structure
        }
    
    # ========== Evaluation System Integration ==========
    
    def get_evaluation_schemas_by_template(self, template_id: int):
        """Get all evaluation schemas for a template"""
        return self.db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id == template_id
        ).all()
    
    def get_evaluation_schema_by_template(self, template_id: int):
        """Get first evaluation schema for a template (for reverse sync)"""
        return self.db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id == template_id
        ).first()
    
    def get_student_progress_by_schema_and_regno(self, schema_id: int, regno: str):
        """Check if student progress exists"""
        return self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == schema_id,
            StudentEvaluationProgress.student_reg_no == regno
        ).first()
    
    def get_progress_records_by_schema_and_regno(self, schema_id: int, regno: str):
        """Get all progress records for a student in a schema"""
        return self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.schema_id == schema_id,
            StudentEvaluationProgress.student_reg_no == regno
        ).all()
    
    def delete_evaluation_records_by_progress(self, progress_id: int):
        """Delete evaluation records for a progress record"""
        deleted_count = self.db.query(StudentAnswerEvaluation).filter(
            StudentAnswerEvaluation.progress_id == progress_id
        ).delete()
        return deleted_count
    
    def delete_progress_record(self, progress: StudentEvaluationProgress):
        """Delete a progress record"""
        self.db.delete(progress)
    
    def create_student_progress(self, schema_id: int, teacher_id: int, regno: str, 
                               total_questions: int, upload_method: str, timestamp: str):
        """Create student evaluation progress record"""
        progress = StudentEvaluationProgress(
            schema_id=schema_id,
            teacher_id=teacher_id,
            student_reg_no=regno,
            upload_method=upload_method,
            student_pdf_path=None,
            total_questions=total_questions,
            created_at=timestamp,
            updated_at=timestamp
        )
        self.db.add(progress)
        self.db.flush()
        return progress
    
    def create_student_evaluation(self, progress_id: int, teacher_id: int, regno: str,
                                  question_no: str, mark_score: float, total_mark: int, 
                                  feedback: list, timestamp: str):
        """Create student answer evaluation record"""
        evaluation = StudentAnswerEvaluation(
            progress_id=progress_id,
            teacher_id=teacher_id,
            student_reg_no=regno,
            question_no=question_no,
            mark_score=mark_score,
            total_mark=total_mark,
            feedback=feedback,
            evaluated_at=timestamp
        )
        self.db.add(evaluation)
        return evaluation
    
    def commit(self):
        """Commit transaction"""
        self.db.commit()
    
    def rollback(self):
        """Rollback transaction"""
        self.db.rollback()
