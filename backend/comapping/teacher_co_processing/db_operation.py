from db_service import get_db
from db_service import COMAPPEDQUESTION
from sqlalchemy.orm import Session
class DBOperationTeacherCoProcessing:
    def __init__(self):
        self.db:Session=get_db()
        self.db=next(self.db)

    def insert_question_co_map(self, my_list, subject_id: int):
        mappings = []
        for item in my_list:
            co_code = item["co"].upper()
            q_no = item["qno"]
            mappings.append(
                COMAPPEDQUESTION(
                    q_no=q_no,
                    co_no=co_code,
                    subject_id=subject_id
                )
            )
        self.db.add_all(mappings)
        self.db.commit()
        print("Question-CO mapping inserted")


