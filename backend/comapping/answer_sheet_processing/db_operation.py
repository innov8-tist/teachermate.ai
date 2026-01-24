
from db_service import get_db, StudentMark, COMAPPEDQUESTION
from sqlalchemy.orm import Session

class DBOperationAnswerSheetProcessing:
    def __init__(self):
        self.db: Session = next(get_db())

    def insert_student_marks(self, final_output, regno, subject_id, ia_id):
        mapped_questions = self.db.query(COMAPPEDQUESTION).filter(
            COMAPPEDQUESTION.subject_id == subject_id
        ).all()

        for q in mapped_questions:
            question_no = q.q_no
            mark = final_output.get(question_no, 0)
            exists = self.db.query(StudentMark).filter(
                StudentMark.question_no == question_no,
                StudentMark.regno == regno,
                StudentMark.subject_id == subject_id,
                StudentMark.ia_id == ia_id
            ).first()

            if not exists:
                student_mark = StudentMark(
                    question_no=question_no,
                    mark=str(mark),
                    regno=regno,
                    subject_id=subject_id,
                    ia_id=ia_id
                )
                self.db.add(student_mark)

        self.db.commit()
        print("Student marks inserted successfully")