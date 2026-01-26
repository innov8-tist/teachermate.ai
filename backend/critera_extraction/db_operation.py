import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from db_service.db import SessionLocal
from db_service.db_schema import AnswerSchema
from sqlalchemy.orm import Session


def insert_answer_schema(
    question_no: str,
    subject_id: int,
    question: str,
    total_mark: int,
    mark_criteria: list,
    answer: str,
    image_explanation: str = ""
) -> AnswerSchema:
    db: Session = SessionLocal()
    try:
        answer_schema = AnswerSchema(
            question_no=question_no,
            subject_id=subject_id,
            question=question,
            total_mark=total_mark,
            mark_criteria=mark_criteria,
            answer=answer,
            image_explanation=image_explanation if image_explanation else None
        )
        
        db.add(answer_schema)
        db.commit()
        db.refresh(answer_schema)
        
        print(f"✓ Successfully inserted answer schema for question {question_no}")
        return answer_schema
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error inserting answer schema: {e}")
        raise
    finally:
        db.close()


def get_answer_schema_by_question(question_no: str, subject_id: int) -> AnswerSchema:
    """Get answer schema for a specific question and subject"""
    db: Session = SessionLocal()
    try:
        return db.query(AnswerSchema).filter(
            AnswerSchema.question_no == question_no,
            AnswerSchema.subject_id == subject_id
        ).first()
    finally:
        db.close()


def get_all_answer_schemas_by_subject(subject_id: int) -> list[AnswerSchema]:
    """Get all answer schemas for a subject"""
    db: Session = SessionLocal()
    try:
        return db.query(AnswerSchema).filter(
            AnswerSchema.subject_id == subject_id
        ).all()
    finally:
        db.close()
