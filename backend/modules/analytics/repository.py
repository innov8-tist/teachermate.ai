"""
Analytics Repository
Database access layer for analytics operations
Handles all database queries with optimization
"""

from typing import List, Optional, Dict
from sqlalchemy.orm import Session
from sqlalchemy import func, distinct
from collections import defaultdict

from modules.co_mapper.models import COTemplate, COQuestionMapping
from db_service.db_schema import (
    EvaluationSchema,
    StudentEvaluationProgress,
    StudentAnswerEvaluation
)


class AnalyticsRepository:
    """Repository for analytics data access with optimized queries"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def get_templates_by_teacher(
        self,
        teacher_id: int,
        semester: Optional[str] = None,
        ia: Optional[str] = None,
        branch: Optional[str] = None
    ) -> List[COTemplate]:
        """
        Get CO templates for a teacher with optional filters
        
        Args:
            teacher_id: Teacher ID
            semester: Optional semester filter (e.g., "S3")
            ia: Optional IA filter (e.g., "IA1")
            branch: Optional branch filter (e.g., "CSE")
        
        Returns:
            List of CO templates
        """
        query = self.db.query(COTemplate).filter(COTemplate.teacher_id == teacher_id)
        
        if semester:
            sem_num = int(semester.replace('S', ''))
            query = query.filter(COTemplate.sem == sem_num)
        if ia:
            query = query.filter(COTemplate.ia == ia)
        if branch:
            query = query.filter(COTemplate.branch == branch)
        
        return query.all()
    
    def get_template_ids_by_teacher(
        self,
        teacher_id: int,
        semester: Optional[str] = None,
        ia: Optional[str] = None,
        branch: Optional[str] = None
    ) -> List[int]:
        """Get template IDs for a teacher with optional filters"""
        templates = self.get_templates_by_teacher(teacher_id, semester, ia, branch)
        return [t.id for t in templates]
    
    def get_schemas_by_templates(self, template_ids: List[int]) -> List[EvaluationSchema]:
        """Get evaluation schemas for given template IDs"""
        if not template_ids:
            return []
        
        return self.db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id.in_(template_ids)
        ).all()
    
    def get_schema_ids_by_templates(self, template_ids: List[int]) -> List[int]:
        """Get schema IDs for given template IDs"""
        schemas = self.get_schemas_by_templates(template_ids)
        return [s.id for s in schemas]
    
    def get_progress_by_schemas(
        self,
        teacher_id: int,
        schema_ids: List[int]
    ) -> List[StudentEvaluationProgress]:
        """
        Get student evaluation progress for given schemas
        Optimized query with proper filtering
        """
        if not schema_ids:
            return []
        
        return self.db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.teacher_id == teacher_id,
            StudentEvaluationProgress.schema_id.in_(schema_ids)
        ).all()
    
    def get_evaluations_bulk(
        self,
        progress_ids: List[int]
    ) -> Dict[int, List[StudentAnswerEvaluation]]:
        """
        Bulk fetch evaluations for multiple progress IDs
        Returns dict mapping progress_id -> evaluations
        
        This eliminates N+1 query problem by fetching all at once
        """
        if not progress_ids:
            return {}
        
        evaluations = self.db.query(StudentAnswerEvaluation).filter(
            StudentAnswerEvaluation.progress_id.in_(progress_ids)
        ).all()
        
        # Group by progress_id for O(1) lookup
        result = defaultdict(list)
        for eval in evaluations:
            result[eval.progress_id].append(eval)
        
        return dict(result)
    
    def count_unique_students(
        self,
        teacher_id: int,
        schema_ids: List[int]
    ) -> int:
        """
        Count distinct students evaluated across given schemas
        Optimized with single query
        """
        if not schema_ids:
            return 0
        
        return self.db.query(
            func.count(distinct(StudentAnswerEvaluation.student_reg_no))
        ).join(
            StudentEvaluationProgress,
            StudentAnswerEvaluation.progress_id == StudentEvaluationProgress.id
        ).filter(
            StudentAnswerEvaluation.teacher_id == teacher_id,
            StudentEvaluationProgress.schema_id.in_(schema_ids),
            StudentAnswerEvaluation.student_reg_no.isnot(None)
        ).scalar() or 0
    
    def get_evaluations_with_progress(
        self,
        teacher_id: int,
        schema_ids: List[int]
    ) -> List[StudentAnswerEvaluation]:
        """
        Get all evaluations with progress join for given schemas
        Single optimized query instead of N+1
        """
        if not schema_ids:
            return []
        
        return self.db.query(StudentAnswerEvaluation).join(
            StudentEvaluationProgress,
            StudentAnswerEvaluation.progress_id == StudentEvaluationProgress.id
        ).filter(
            StudentAnswerEvaluation.teacher_id == teacher_id,
            StudentEvaluationProgress.schema_id.in_(schema_ids)
        ).all()
    
    def get_co_mappings_by_templates(
        self,
        template_ids: List[int]
    ) -> List[COQuestionMapping]:
        """Get CO question mappings for given template IDs"""
        if not template_ids:
            return []
        
        return self.db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id.in_(template_ids)
        ).all()
    
    def get_evaluations_by_question(
        self,
        teacher_id: int,
        template_id: int,
        question_no: str
    ) -> List[StudentAnswerEvaluation]:
        """
        Get evaluations for specific question in a template
        Used for CO attainment calculation
        """
        return self.db.query(StudentAnswerEvaluation).join(
            StudentEvaluationProgress,
            StudentAnswerEvaluation.progress_id == StudentEvaluationProgress.id
        ).join(
            EvaluationSchema,
            StudentEvaluationProgress.schema_id == EvaluationSchema.id
        ).filter(
            StudentAnswerEvaluation.question_no == question_no,
            StudentAnswerEvaluation.teacher_id == teacher_id,
            EvaluationSchema.template_id == template_id
        ).all()
