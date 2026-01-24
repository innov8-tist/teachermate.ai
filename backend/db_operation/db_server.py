from db_service import get_db
from db_service import AllSubject, Subject
from sqlalchemy.orm import Session
class DBServiceForServer:
    def __init__(self):
        self.db:Session=get_db()
        self.db=next(self.db)

    def getting_all_subject(self, semester: int):
        subjects = self.db.query(AllSubject).filter(AllSubject.sem == semester).all()
        return [{"name": sub.name} for sub in subjects]

    def create_co_subject(self, subject_name: str, sem: int, ia_number: int, image_path: str,teacher_id:int):
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

    def get_all_co_by_teacher(self, teacher_id: int):
        subjects = self.db.query(Subject).filter(Subject.teacher_id == teacher_id).all()
        return [{"id": sub.id, "ia": sub.ia, "name": sub.name, "branch": sub.branch, "sem": sub.sem} for sub in subjects]

    def get_co_details(self, subject_id: int):
        from db_service import COMAPPEDQUESTION
        questions = self.db.query(COMAPPEDQUESTION).filter(COMAPPEDQUESTION.subject_id == subject_id).all()
        return [{"q_no": q.q_no, "co_no": q.co_no} for q in questions]

    def delete_co_subject(self, subject_id: int):
        from db_service import COMAPPEDQUESTION, StudentMark
        self.db.query(COMAPPEDQUESTION).filter(COMAPPEDQUESTION.subject_id == subject_id).delete()
        self.db.query(StudentMark).filter(StudentMark.subject_id == subject_id).delete()
        subject = self.db.query(Subject).filter(Subject.id == subject_id).first()
        if subject:
            self.db.delete(subject)
            self.db.commit()
            return True
        return False

    
    