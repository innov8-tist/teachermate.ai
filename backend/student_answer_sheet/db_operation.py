import sys
from pathlib import Path

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

from db_service.db import SessionLocal
from db_service.db_schema import EvaluationSchema, StudentAnswerEvaluation
from typing import List, Optional


class StudentAnswerService:
    """Service for student answer evaluation database operations"""
    
    def __init__(self):
        self.db = SessionLocal()
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        self.db.close()
    
    def get_answer_schema(self, question_no: str, subject_id: int) -> Optional[EvaluationSchema]:
        """
        Fetch the answer schema for a specific question
        
        Args:
            question_no: Question number (e.g., "1", "2.a")
            subject_id: Subject/Template ID
            
        Returns:
            EvaluationSchema object or None if not found
        """
        return self.db.query(EvaluationSchema).filter(
            EvaluationSchema.question_no == question_no,
            EvaluationSchema.template_id == subject_id
        ).first()
    
    def insert_student_evaluation(
        self,
        question_no: str,
        subject_id: int,
        mark_score: float,
        total_mark: int,
        feedback: List[str],
        student_image_paths: List[str],
        student_reg_no: Optional[str] = None
    ) -> StudentAnswerEvaluation:
        """
        Save student answer evaluation to database
        
        Args:
            question_no: Question number
            subject_id: Subject/Template ID
            mark_score: Marks awarded to student
            total_mark: Total marks for the question
            feedback: List of feedback points
            student_image_paths: Paths to student answer images
            student_reg_no: Student registration number (optional)
            
        Returns:
            Created StudentAnswerEvaluation record
        """
        from datetime import datetime
        
        evaluation = StudentAnswerEvaluation(
            question_no=question_no,
            template_id=subject_id,
            student_reg_no=student_reg_no,
            mark_score=mark_score,
            total_mark=total_mark,
            feedback=feedback,
            student_image_paths=student_image_paths,
            evaluated_at=datetime.now().isoformat()
        )
        
        self.db.add(evaluation)
        self.db.commit()
        self.db.refresh(evaluation)
        
        return evaluation
    
    def get_student_evaluations(
        self,
        subject_id: int,
        student_reg_no: Optional[str] = None
    ) -> List[StudentAnswerEvaluation]:
        """
        Get all evaluations for a subject, optionally filtered by student
        
        Args:
            subject_id: Subject/Template ID
            student_reg_no: Optional student registration number filter
            
        Returns:
            List of StudentAnswerEvaluation records
        """
        query = self.db.query(StudentAnswerEvaluation).filter(
            StudentAnswerEvaluation.template_id == subject_id
        )
        
        if student_reg_no:
            query = query.filter(StudentAnswerEvaluation.student_reg_no == student_reg_no)
        
        return query.all()
    
    def get_evaluation_by_id(self, evaluation_id: int) -> Optional[StudentAnswerEvaluation]:
        """Get a specific evaluation by ID"""
        return self.db.query(StudentAnswerEvaluation).filter(
            StudentAnswerEvaluation.id == evaluation_id
        ).first()
