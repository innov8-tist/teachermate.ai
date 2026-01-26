from db_service import get_db
from db_service import AllSubject, Subject, StudentMark
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
        subjects = self.db.query(AllSubject).filter(AllSubject.sem == semester).all()
        return [{"name": sub.name} for sub in subjects]

    def create_co_subject(self, subject_name: str, sem: int, ia_number: int, image_path: str, teacher_id: int):
        try:
            subject = self.db.query(AllSubject).filter(
                AllSubject.name == subject_name,
                AllSubject.sem == sem
            ).first()
            
            if not subject:
                raise ValueError(f"Subject '{subject_name}' not found for semester {sem}")
            
            new_subject = Subject(
                ia=f"IA{ia_number}",
                name=subject_name,
                branch=subject.branch,
                sem=sem,
                teacher_id=teacher_id,
                image_path=image_path
            )
            self.db.add(new_subject)
            self.db.commit()
            self.db.refresh(new_subject)
            
            return new_subject
        except Exception as e:
            self.db.rollback()
            raise e

    def get_all_co_by_teacher(self, teacher_id: int):
        subjects = self.db.query(Subject).filter(Subject.teacher_id == teacher_id).all()
        return [{"id": sub.id, "ia": sub.ia, "name": sub.name, "branch": sub.branch, "sem": sub.sem} for sub in subjects]

    def get_co_details(self, subject_id: int):
        from db_service import COMAPPEDQUESTION
        questions = self.db.query(COMAPPEDQUESTION).filter(COMAPPEDQUESTION.subject_id == subject_id).all()
        return [{"q_no": q.q_no, "co_no": q.co_no} for q in questions]

    def get_students_by_subject(self, subject_id: int):
        from db_service import StudentMark
        # Get unique registration numbers for this subject
        students = self.db.query(StudentMark.regno).filter(
            StudentMark.subject_id == subject_id
        ).distinct().all()
        
        return [{"regno": student.regno} for student in students]

    def get_student_marks_detail(self, subject_id: int, regno: str):
        
        marks = self.db.query(StudentMark).filter(
            StudentMark.subject_id == subject_id,
            StudentMark.regno == regno
        ).all()
        
        return [{
            "question_no": mark.question_no,
            "mark": mark.mark,
            "ia_id": mark.ia_id
        } for mark in marks]

    def delete_student_marks(self, subject_id: int, regno: str):
        try:
            deleted_count = self.db.query(StudentMark).filter(
                StudentMark.subject_id == subject_id,
                StudentMark.regno == regno
            ).delete()
            
            self.db.commit()
            return deleted_count > 0
        except Exception as e:
            self.db.rollback()
            raise e

    def delete_co_subject(self, subject_id: int):
        try:
            from db_service import COMAPPEDQUESTION, StudentMark
            self.db.query(COMAPPEDQUESTION).filter(COMAPPEDQUESTION.subject_id == subject_id).delete()
            self.db.query(StudentMark).filter(StudentMark.subject_id == subject_id).delete()
            subject = self.db.query(Subject).filter(Subject.id == subject_id).first()
            if subject:
                self.db.delete(subject)
                self.db.commit()
                return True
            return False
        except Exception as e:
            self.db.rollback()
            raise e