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

    def create_co_subject(self, subject_name: str, sem: int, ia_number: int, image_path: str, teacher_id: int):
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
            "sem": template.sem
        }

    def get_co_mapped_data_for_excel(self, subject_id: int):
        """Get student marks mapped to COs for Excel export with detailed question breakdown"""
        co_mappings = self.db.query(COMAPPEDQUESTION).filter(
            COMAPPEDQUESTION.subject_id == subject_id
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
            StudentMark.subject_id == subject_id
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