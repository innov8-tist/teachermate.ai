from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
from db_service.db import get_db
from db_service.db_schema import Evaluation, EvaluationSchema, StudentAnswerEvaluation, Teacher
from auth.dependencies import get_current_teacher
from typing import Dict, List

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/summary")
async def get_summary(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get summary statistics for dashboard KPIs"""
    try:
        # Total evaluations
        total_evaluations = db.query(Evaluation).filter(
            Evaluation.teacher_id == current_teacher.id
        ).count()
        
        # Completed evaluations
        completed_evaluations = db.query(Evaluation).filter(
            and_(
                Evaluation.teacher_id == current_teacher.id,
                Evaluation.status == "completed"
            )
        ).count()
        
        # Pending evaluations
        pending_evaluations = total_evaluations - completed_evaluations
        
        # Total students evaluated (count distinct students from answer evaluations)
        total_students = db.query(func.count(func.distinct(StudentAnswerEvaluation.student_reg_no))).filter(
            StudentAnswerEvaluation.template_id.in_(
                db.query(Evaluation.template_id).filter(Evaluation.teacher_id == current_teacher.id)
            ),
            StudentAnswerEvaluation.student_reg_no.isnot(None)
        ).scalar() or 0
        
        return {
            "totalEvaluations": total_evaluations,
            "pendingEvaluations": pending_evaluations,
            "completedEvaluations": completed_evaluations,
            "totalStudentsEvaluated": total_students
        }
    except Exception as e:
        print(f"Error in get_summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/evaluation-overview")
async def get_evaluation_overview(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get evaluation overview metrics"""
    try:
        # Get all student answer evaluations for this teacher's templates
        evaluations = db.query(StudentAnswerEvaluation).filter(
            StudentAnswerEvaluation.template_id.in_(
                db.query(Evaluation.template_id).filter(Evaluation.teacher_id == current_teacher.id)
            )
        ).all()
        
        total_questions = len(evaluations)
        
        # Calculate average score
        if total_questions > 0:
            total_score = sum((e.mark_score / e.total_mark * 100) for e in evaluations)
            average_score = total_score / total_questions
        else:
            average_score = 0
        
        return {
            "averageScore": round(average_score, 1),
            "totalQuestionsEvaluated": total_questions
        }
    except Exception as e:
        print(f"Error in get_evaluation_overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/evaluation-status")
async def get_evaluation_status(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get evaluation status breakdown"""
    try:
        total = db.query(Evaluation).filter(
            Evaluation.teacher_id == current_teacher.id
        ).count()
        
        completed = db.query(Evaluation).filter(
            and_(
                Evaluation.teacher_id == current_teacher.id,
                Evaluation.status == "completed"
            )
        ).count()
        
        pending = total - completed
        
        return {
            "pending": pending,
            "completed": completed,
            "total": total
        }
    except Exception as e:
        print(f"Error in get_evaluation_status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/student-distribution")
async def get_student_distribution(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get student performance distribution by score ranges"""
    try:
        # Get all student evaluations for this teacher
        evaluations = db.query(StudentAnswerEvaluation).filter(
            StudentAnswerEvaluation.template_id.in_(
                db.query(Evaluation.template_id).filter(Evaluation.teacher_id == current_teacher.id)
            )
        ).all()
        
        # Calculate percentage scores and categorize
        ranges = {"0-40": 0, "41-60": 0, "61-80": 0, "81-100": 0}
        
        for eval in evaluations:
            percentage = (eval.mark_score / eval.total_mark * 100) if eval.total_mark > 0 else 0
            if percentage <= 40:
                ranges["0-40"] += 1
            elif percentage <= 60:
                ranges["41-60"] += 1
            elif percentage <= 80:
                ranges["61-80"] += 1
            else:
                ranges["81-100"] += 1
        
        return {
            "ranges": [
                {"range": "0-40", "count": ranges["0-40"]},
                {"range": "41-60", "count": ranges["41-60"]},
                {"range": "61-80", "count": ranges["61-80"]},
                {"range": "81-100", "count": ranges["81-100"]}
            ]
        }
    except Exception as e:
        print(f"Error in get_student_distribution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/evaluation-trend")
async def get_evaluation_trend(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get evaluation trend over time"""
    try:
        # Get evaluations grouped by week (simplified - using count for now)
        # In production, you'd group by actual date ranges
        evaluations = db.query(StudentAnswerEvaluation).filter(
            StudentAnswerEvaluation.template_id.in_(
                db.query(Evaluation.template_id).filter(Evaluation.teacher_id == current_teacher.id)
            )
        ).all()
        
        total = len(evaluations)
        
        # Distribute across 5 weeks (mock data for now)
        if total > 0:
            w1 = int(total * 0.15)
            w2 = int(total * 0.20)
            w3 = int(total * 0.25)
            w4 = int(total * 0.20)
            w5 = total - (w1 + w2 + w3 + w4)
        else:
            w1 = w2 = w3 = w4 = w5 = 0
        
        return {
            "data": [
                {"label": "W1", "value": w1},
                {"label": "W2", "value": w2},
                {"label": "W3", "value": w3},
                {"label": "W4", "value": w4},
                {"label": "W5", "value": w5}
            ]
        }
    except Exception as e:
        print(f"Error in get_evaluation_trend: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/co-attainment")
async def get_co_attainment(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get CO attainment percentages"""
    try:
        # Get all evaluations for this teacher
        from db_service.db_schema import COQuestionMapping
        
        # Get all CO mappings for teacher's templates
        co_mappings = db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id.in_(
                db.query(Evaluation.template_id).filter(Evaluation.teacher_id == current_teacher.id)
            )
        ).all()
        
        # Group by CO and calculate average attainment
        co_scores = {}
        for mapping in co_mappings:
            co_no = mapping.co_no
            if co_no not in co_scores:
                co_scores[co_no] = []
            
            # Get evaluations for this question
            evals = db.query(StudentAnswerEvaluation).filter(
                and_(
                    StudentAnswerEvaluation.question_no == mapping.q_no,
                    StudentAnswerEvaluation.template_id == mapping.template_id
                )
            ).all()
            
            for eval in evals:
                percentage = (eval.mark_score / eval.total_mark * 100) if eval.total_mark > 0 else 0
                co_scores[co_no].append(percentage)
        
        # Calculate averages
        cos = []
        for co_no in sorted(co_scores.keys()):
            if co_scores[co_no]:
                avg = sum(co_scores[co_no]) / len(co_scores[co_no])
            else:
                avg = 0
            cos.append({"label": f"CO{co_no}", "percentage": round(avg)})
        
        # If no data, return placeholder
        if not cos:
            cos = [
                {"label": "CO1", "percentage": 0},
                {"label": "CO2", "percentage": 0},
                {"label": "CO3", "percentage": 0},
                {"label": "CO4", "percentage": 0},
                {"label": "CO5", "percentage": 0},
                {"label": "CO6", "percentage": 0}
            ]
        
        return {"cos": cos}
    except Exception as e:
        print(f"Error in get_co_attainment: {e}")
        raise HTTPException(status_code=500, detail=str(e))
