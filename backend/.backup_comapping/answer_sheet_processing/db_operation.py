
from db_service import get_db, StudentAnswerMark, COQuestionMapping
from sqlalchemy.orm import Session

class DBOperationAnswerSheetProcessing:
    def __init__(self):
        self.db: Session = next(get_db())

    def insert_student_marks(self, final_output, regno, subject_id, ia_id):
        """Insert student marks for each question mapped to COs"""
        # Get all question-CO mappings for this template
        mapped_questions = self.db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id == subject_id
        ).all()

        for q in mapped_questions:
            question_no = q.q_no
            mark = final_output.get(question_no, 0)
            
            # Check if mark already exists
            exists = self.db.query(StudentAnswerMark).filter(
                StudentAnswerMark.question_no == question_no,
                StudentAnswerMark.regno == regno,
                StudentAnswerMark.template_id == subject_id,
                StudentAnswerMark.ia_id == ia_id
            ).first()

            if not exists:
                student_mark = StudentAnswerMark(
                    question_no=question_no,
                    mark=str(mark),
                    regno=regno,
                    template_id=subject_id,
                    ia_id=ia_id
                )
                self.db.add(student_mark)

        self.db.commit()
        print("Student marks inserted successfully")