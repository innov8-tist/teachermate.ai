from db_service.db import SessionLocal
from db_service.db_schema import EvaluationSchema
from sqlalchemy.orm import Session


class AnswerSchemaService:
    
    def __init__(self):
        self.db: Session = SessionLocal()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()
    
    def close(self):
        if hasattr(self, 'db') and self.db:
            self.db.close()
    
    def insert_answer_schema(
        self,
        question_no: str,
        subject_id: int,
        question: str,
        total_mark: int,
        mark_criteria: list,
        answer: str,
        image_explanation: str = "",
        image_paths: list = None
    ) -> EvaluationSchema:
        try:
            answer_schema = EvaluationSchema(
                question_no=question_no,
                template_id=subject_id,
                question=question,
                total_mark=total_mark,
                mark_criteria=mark_criteria,
                answer=answer,
                image_explanation=image_explanation if image_explanation else None,
                image_paths=image_paths if image_paths else None
            )
            
            self.db.add(answer_schema)
            self.db.commit()
            self.db.refresh(answer_schema)
            
            print(f"Successfully inserted answer schema for question {question_no}")
            return answer_schema
            
        except Exception as e:
            self.db.rollback()
            print(f"✗ Error inserting answer schema: {e}")
            raise
    
    def get_answer_schema_by_question(self, question_no: str, subject_id: int) -> EvaluationSchema:
        """Get answer schema for a specific question and subject"""
        try:
            return self.db.query(EvaluationSchema).filter(
                EvaluationSchema.question_no == question_no,
                EvaluationSchema.subject_id == subject_id
            ).first()
        except Exception as e:
            print(f"✗ Error fetching answer schema: {e}")
            raise
    
    def get_all_answer_schemas_by_subject(self, subject_id: int) -> list[EvaluationSchema]:
        """Get all answer schemas for a subject"""
        try:
            return self.db.query(EvaluationSchema).filter(
                EvaluationSchema.subject_id == subject_id
            ).all()
        except Exception as e:
            print(f"✗ Error fetching answer schemas: {e}")
            raise
    
    def update_answer_schema(
        self,
        question_no: str,
        subject_id: int,
        **kwargs
    ) -> EvaluationSchema:
        """Update an existing answer schema"""
        try:
            schema = self.get_answer_schema_by_question(question_no, subject_id)
            if not schema:
                raise ValueError(f"Answer schema not found for question {question_no}")
            
            for key, value in kwargs.items():
                if hasattr(schema, key):
                    setattr(schema, key, value)
            
            self.db.commit()
            self.db.refresh(schema)
            
            print(f"✓ Successfully updated answer schema for question {question_no}")
            return schema
            
        except Exception as e:
            self.db.rollback()
            print(f"✗ Error updating answer schema: {e}")
            raise
    
    def delete_answer_schema(self, question_no: str, subject_id: int) -> bool:
        """Delete an answer schema"""
        try:
            schema = self.get_answer_schema_by_question(question_no, subject_id)
            if not schema:
                return False
            
            self.db.delete(schema)
            self.db.commit()
            
            print(f"✓ Successfully deleted answer schema for question {question_no}")
            return True
            
        except Exception as e:
            self.db.rollback()
            print(f"✗ Error deleting answer schema: {e}")
            raise

