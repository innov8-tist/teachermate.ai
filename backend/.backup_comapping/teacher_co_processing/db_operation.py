from db_service import get_db
from db_service import COQuestionMapping
from sqlalchemy.orm import Session

class DBOperationTeacherCoProcessing:
    def __init__(self):
        self.db: Session = get_db()
        self.db = next(self.db)

    def insert_question_co_map(self, my_list, subject_id: int):
        """Insert question to CO mappings from teacher's uploaded template"""
        mappings = []
        for item in my_list:
            co_code = item["co"].upper()
            q_no = item["qno"]
            mappings.append(
                COQuestionMapping(
                    q_no=q_no,
                    co_no=co_code,
                    template_id=subject_id
                )
            )
        self.db.add_all(mappings)
        self.db.commit()
        print("Question-CO mapping inserted")
