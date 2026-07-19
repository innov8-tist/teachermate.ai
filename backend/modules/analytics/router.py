"""
Analytics Router
API endpoints for analytics functionality
"""

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import Optional

from db_service.db import get_db
#from db_service.db_schema import Teacher
from modules.auth.models import Teacher
from modules.auth.dependencies import get_current_teacher

from .service import AnalyticsService
from .schemas import *


router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/contexts", response_model=ContextsResponse)
async def get_available_contexts(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get all available context combinations (semester, IA, branch) for the teacher"""
    try:
        service = AnalyticsService(db)
        return service.get_available_contexts(current_teacher.id)
    except Exception as e:
        print(f"Error in get_available_contexts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary", response_model=SummaryResponse)
async def get_summary(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get summary statistics for dashboard KPIs with optional context filtering"""
    try:
        service = AnalyticsService(db)
        return service.get_summary(current_teacher.id, semester, ia, branch)
    except Exception as e:
        print(f"Error in get_summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance-overview", response_model=PerformanceOverviewResponse)
async def get_performance_overview(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get student performance overview with context filtering"""
    try:
        service = AnalyticsService(db)
        return service.get_performance_overview(
            current_teacher.id, semester, ia, branch
        )
    except Exception as e:
        print(f"Error in get_performance_overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/score-distribution", response_model=ScoreDistributionResponse)
async def get_score_distribution(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get student score distribution by ranges with context filtering"""
    try:
        service = AnalyticsService(db)
        return service.get_score_distribution(
            current_teacher.id, semester, ia, branch
        )
    except Exception as e:
        print(f"Error in get_score_distribution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/question-insights", response_model=QuestionInsightsResponse)
async def get_question_insights(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get question-level performance insights with context filtering"""
    try:
        service = AnalyticsService(db)
        return service.get_question_insights(
            current_teacher.id, semester, ia, branch
        )
    except Exception as e:
        print(f"Error in get_question_insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/co-attainment", response_model=COAttainmentResponse)
async def get_co_attainment(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get CO attainment percentages with context filtering"""
    try:
        service = AnalyticsService(db)
        return service.get_co_attainment(
            current_teacher.id, semester, ia, branch
        )
    except Exception as e:
        print(f"Error in get_co_attainment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/class-performance-trend", response_model=ClassPerformanceTrendResponse)
async def get_class_performance_trend(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get class average performance trend across IAs"""
    try:
        service = AnalyticsService(db)
        return service.get_class_performance_trend(
            current_teacher.id, semester, branch
        )
    except Exception as e:
        print(f"Error in get_class_performance_trend: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documentation-readiness", response_model=DocumentationReadinessResponse)
async def get_documentation_readiness(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get documentation readiness status with context filtering"""
    try:
        service = AnalyticsService(db)
        return service.get_documentation_readiness(
            current_teacher.id, semester, ia, branch
        )
    except Exception as e:
        print(f"Error in get_documentation_readiness: {e}")
        raise HTTPException(status_code=500, detail=str(e))
