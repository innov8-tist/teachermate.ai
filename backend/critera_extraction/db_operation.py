import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent.parent))

from db_service.db import SessionLocal
from db_service.db_schema import EvaluationSchema
from sqlalchemy.orm import Session


def insert_answer_schema(
    question_no: str,
    subject_id: int,
    question: str,
    total_mark: int,
    mark_criteria: list,
    answer: str,
    image_explanation: str = ""
) -> EvaluationSchema:
    """Insert evaluation schema (answer key and marking criteria) for a question"""
    db: Session = SessionLocal()
    try:
        evaluation_schema = EvaluationSchema(
            question_no=question_no,
            template_id=subject_id,
            question=question,
            total_mark=total_mark,
            mark_criteria=mark_criteria,
            answer=answer,
            image_explanation=image_explanation if image_explanation else None
        )
        
        db.add(evaluation_schema)
        db.commit()
        db.refresh(evaluation_schema)
        
        print(f"✓ Successfully inserted evaluation schema for question {question_no}")
        return evaluation_schema
        
    except Exception as e:
        db.rollback()
        print(f"✗ Error inserting evaluation schema: {e}")
        raise
    finally:
        db.close()


def get_answer_schema_by_question(question_no: str, subject_id: int) -> EvaluationSchema:
    """Get evaluation schema for a specific question and CO template"""
    db: Session = SessionLocal()
    try:
        return db.query(EvaluationSchema).filter(
            EvaluationSchema.question_no == question_no,
            EvaluationSchema.template_id == subject_id
        ).first()
    finally:
        db.close()


def get_all_answer_schemas_by_subject(subject_id: int) -> list[EvaluationSchema]:
    """Get all evaluation schemas for a CO template"""
    db: Session = SessionLocal()
    try:
        return db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id == subject_id
        ).all()
    finally:
        db.close()
