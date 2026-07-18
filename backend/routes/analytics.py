from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, desc
from db_service.db import get_db
from db_service.db_schema import (
    EvaluationSchema, 
    StudentAnswerEvaluation, 
    StudentEvaluationProgress,
    COQuestionMapping,
    COTemplate
)
from modules.auth.models import Teacher
from modules.auth.dependencies import get_current_teacher
from typing import Dict, List, Optional
from collections import defaultdict

router = APIRouter(prefix="/api/analytics", tags=["analytics"])


@router.get("/contexts")
async def get_available_contexts(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db)
):
    """Get all available context combinations (semester, IA, branch) for the teacher"""
    try:
        # Get all unique combinations from CO templates
        templates = db.query(COTemplate).filter(
            COTemplate.teacher_id == current_teacher.id
        ).all()
        
        contexts = []
        for template in templates:
            contexts.append({
                "semester": f"S{template.sem}",
                "ia": template.ia,
                "branch": template.branch,
                "templateId": template.id,
                "subjectName": template.name
            })
        
        return {"contexts": contexts}
    except Exception as e:
        print(f"Error in get_available_contexts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_summary(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get summary statistics for dashboard KPIs with optional context filtering"""
    try:
        # Build base query for templates with filters
        template_query = db.query(COTemplate).filter(
            COTemplate.teacher_id == current_teacher.id
        )
        
        if semester:
            sem_num = int(semester.replace('S', ''))
            template_query = template_query.filter(COTemplate.sem == sem_num)
        if ia:
            template_query = template_query.filter(COTemplate.ia == ia)
        if branch:
            template_query = template_query.filter(COTemplate.branch == branch)
        
        template_ids = [t.id for t in template_query.all()]
        
        if not template_ids:
            return {
                "totalEvaluations": 0,
                "totalStudentsEvaluated": 0,
                "totalSubjects": 0
            }
        
        # Get evaluation schemas for these templates
        schema_ids = [s.id for s in db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id.in_(template_ids)
        ).all()]
        
        # Total student evaluation progress records
        total_progress = db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.teacher_id == current_teacher.id,
            StudentEvaluationProgress.schema_id.in_(schema_ids) if schema_ids else False
        ).count()
        
        # Total students evaluated (count distinct students)
        total_students = db.query(func.count(func.distinct(StudentAnswerEvaluation.student_reg_no))).join(
            StudentEvaluationProgress,
            StudentAnswerEvaluation.progress_id == StudentEvaluationProgress.id
        ).filter(
            StudentAnswerEvaluation.teacher_id == current_teacher.id,
            StudentEvaluationProgress.schema_id.in_(schema_ids) if schema_ids else False,
            StudentAnswerEvaluation.student_reg_no.isnot(None)
        ).scalar() or 0
        
        return {
            "totalEvaluations": total_progress,
            "totalStudentsEvaluated": total_students,
            "totalSubjects": len(template_ids)
        }
    except Exception as e:
        print(f"Error in get_summary: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/performance-overview")
async def get_performance_overview(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get student performance overview with context filtering"""
    try:
        # Build template filter
        template_query = db.query(COTemplate).filter(
            COTemplate.teacher_id == current_teacher.id
        )
        
        if semester:
            sem_num = int(semester.replace('S', ''))
            template_query = template_query.filter(COTemplate.sem == sem_num)
        if ia:
            template_query = template_query.filter(COTemplate.ia == ia)
        if branch:
            template_query = template_query.filter(COTemplate.branch == branch)
        
        template_ids = [t.id for t in template_query.all()]
        
        if not template_ids:
            return {
                "averageScore": 0,
                "passRate": 0,
                "totalStudents": 0
            }
        
        # Get schema IDs
        schema_ids = [s.id for s in db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id.in_(template_ids)
        ).all()]
        
        # Get all progress records for context
        progress_records = db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.teacher_id == current_teacher.id,
            StudentEvaluationProgress.schema_id.in_(schema_ids) if schema_ids else False
        ).all()
        
        if not progress_records:
            return {
                "averageScore": 0,
                "passRate": 0,
                "totalStudents": 0
            }
        
        # Calculate student-level scores
        student_scores = []
        passed_students = 0
        
        for progress in progress_records:
            evaluations = db.query(StudentAnswerEvaluation).filter(
                StudentAnswerEvaluation.progress_id == progress.id
            ).all()
            
            if evaluations:
                total_obtained = sum(e.mark_score for e in evaluations)
                total_possible = 50
                
                if total_possible > 0:
                    percentage = (total_obtained / total_possible) * 100
                    student_scores.append(percentage)
                    if percentage >= 40:  # Pass threshold: 20/50 = 40%
                        passed_students += 1
        
        avg_score = sum(student_scores) / len(student_scores) if student_scores else 0
        pass_rate = (passed_students / len(student_scores) * 100) if student_scores else 0
        
        return {
            "averageScore": round(avg_score, 1),
            "passRate": round(pass_rate, 1),
            "totalStudents": len(student_scores),
            "passThreshold": 40  # 20/50 marks = 40%
        }
    except Exception as e:
        print(f"Error in get_performance_overview: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/score-distribution")
async def get_score_distribution(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get student score distribution by ranges with context filtering"""
    try:
        # Build template filter
        template_query = db.query(COTemplate).filter(
            COTemplate.teacher_id == current_teacher.id
        )
        
        if semester:
            sem_num = int(semester.replace('S', ''))
            template_query = template_query.filter(COTemplate.sem == sem_num)
        if ia:
            template_query = template_query.filter(COTemplate.ia == ia)
        if branch:
            template_query = template_query.filter(COTemplate.branch == branch)
        
        template_ids = [t.id for t in template_query.all()]
        
        if not template_ids:
            return {
                "ranges": [
                    {"range": "0-19", "count": 0, "label": "Fail"},
                    {"range": "20-34", "count": 0, "label": "Pass"},
                    {"range": "35-44", "count": 0, "label": "Good"},
                    {"range": "45-50", "count": 0, "label": "Excellent"}
                ]
            }
        
        # Get schema IDs
        schema_ids = [s.id for s in db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id.in_(template_ids)
        ).all()]
        
        # Get progress records
        progress_records = db.query(StudentEvaluationProgress).filter(
            StudentEvaluationProgress.teacher_id == current_teacher.id,
            StudentEvaluationProgress.schema_id.in_(schema_ids) if schema_ids else False
        ).all()
        
        # Calculate distribution (based on marks out of 50, not percentage)
        ranges = {"0-19": 0, "20-34": 0, "35-44": 0, "45-50": 0}
        
        for progress in progress_records:
            evaluations = db.query(StudentAnswerEvaluation).filter(
                StudentAnswerEvaluation.progress_id == progress.id
            ).all()
            
            if evaluations:
                total_obtained = sum(e.mark_score for e in evaluations)
                total_possible = sum(e.total_mark for e in evaluations)
                
                if total_possible > 0:
                    # Calculate marks out of 50
                    marks_out_of_50 = (total_obtained / total_possible) * 50
                    
                    if marks_out_of_50 < 20:  # Below pass threshold
                        ranges["0-19"] += 1
                    elif marks_out_of_50 < 35:
                        ranges["20-34"] += 1
                    elif marks_out_of_50 < 45:
                        ranges["35-44"] += 1
                    else:
                        ranges["45-50"] += 1
        
        return {
            "ranges": [
                {"range": "0-19", "count": ranges["0-19"], "label": "Fail"},
                {"range": "20-34", "count": ranges["20-34"], "label": "Pass"},
                {"range": "35-44", "count": ranges["35-44"], "label": "Good"},
                {"range": "45-50", "count": ranges["45-50"], "label": "Excellent"}
            ]
        }
    except Exception as e:
        print(f"Error in get_score_distribution: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/question-insights")
async def get_question_insights(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get question-level performance insights with context filtering"""
    try:
        # Build template filter
        template_query = db.query(COTemplate).filter(
            COTemplate.teacher_id == current_teacher.id
        )
        
        if semester:
            sem_num = int(semester.replace('S', ''))
            template_query = template_query.filter(COTemplate.sem == sem_num)
        if ia:
            template_query = template_query.filter(COTemplate.ia == ia)
        if branch:
            template_query = template_query.filter(COTemplate.branch == branch)
        
        template_ids = [t.id for t in template_query.all()]
        
        if not template_ids:
            return {
                "averageMarksPerQuestion": 0,
                "lowestPerforming": [],
                "highestPerforming": []
            }
        
        # Get schema IDs
        schema_ids = [s.id for s in db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id.in_(template_ids)
        ).all()]
        
        # Get all evaluations for context
        evaluations = db.query(StudentAnswerEvaluation).join(
            StudentEvaluationProgress,
            StudentAnswerEvaluation.progress_id == StudentEvaluationProgress.id
        ).filter(
            StudentAnswerEvaluation.teacher_id == current_teacher.id,
            StudentEvaluationProgress.schema_id.in_(schema_ids) if schema_ids else False
        ).all()
        
        if not evaluations:
            return {
                "averageMarksPerQuestion": 0,
                "lowestPerforming": [],
                "highestPerforming": []
            }
        
        # Group by question
        question_stats = defaultdict(lambda: {"total_score": 0, "total_possible": 0, "count": 0})
        
        for eval in evaluations:
            q_no = eval.question_no
            question_stats[q_no]["total_score"] += eval.mark_score
            question_stats[q_no]["total_possible"] += eval.total_mark
            question_stats[q_no]["count"] += 1
        
        # Calculate percentages
        question_performance = []
        for q_no, stats in question_stats.items():
            if stats["total_possible"] > 0:
                percentage = (stats["total_score"] / stats["total_possible"]) * 100
                avg_marks = stats["total_score"] / stats["count"]
                question_performance.append({
                    "questionNo": q_no,
                    "percentage": round(percentage, 1),
                    "averageMarks": round(avg_marks, 1)
                })
        
        # Sort and get top/bottom
        question_performance.sort(key=lambda x: x["percentage"])
        
        lowest = question_performance[:3]
        highest = question_performance[-3:][::-1]
        
        # Calculate overall average
        total_avg = sum(q["percentage"] for q in question_performance) / len(question_performance) if question_performance else 0
        
        return {
            "averageMarksPerQuestion": round(total_avg, 1),
            "lowestPerforming": lowest,
            "highestPerforming": highest
        }
    except Exception as e:
        print(f"Error in get_question_insights: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/co-attainment")
async def get_co_attainment(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get CO attainment percentages with context filtering"""
    try:
        # Build template filter
        template_query = db.query(COTemplate).filter(
            COTemplate.teacher_id == current_teacher.id
        )
        
        if semester:
            sem_num = int(semester.replace('S', ''))
            template_query = template_query.filter(COTemplate.sem == sem_num)
        if ia:
            template_query = template_query.filter(COTemplate.ia == ia)
        if branch:
            template_query = template_query.filter(COTemplate.branch == branch)
        
        template_ids = [t.id for t in template_query.all()]
        
        if not template_ids:
            return {
                "cos": [],
                "strongCOs": [],
                "weakCOs": [],
                "coverageComplete": False
            }
        
        # Get CO mappings for these templates
        co_mappings = db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id.in_(template_ids)
        ).all()
        
        if not co_mappings:
            return {
                "cos": [],
                "strongCOs": [],
                "weakCOs": [],
                "coverageComplete": False
            }
        
        # Group by CO and calculate attainment
        co_scores = defaultdict(list)
        
        for mapping in co_mappings:
            # Get evaluations for this question
            evals = db.query(StudentAnswerEvaluation).join(
                StudentEvaluationProgress,
                StudentAnswerEvaluation.progress_id == StudentEvaluationProgress.id
            ).join(
                EvaluationSchema,
                StudentEvaluationProgress.schema_id == EvaluationSchema.id
            ).filter(
                StudentAnswerEvaluation.question_no == mapping.q_no,
                StudentAnswerEvaluation.teacher_id == current_teacher.id,
                EvaluationSchema.template_id == mapping.template_id
            ).all()
            
            for eval in evals:
                if eval.total_mark > 0:
                    percentage = (eval.mark_score / eval.total_mark) * 100
                    co_scores[mapping.co_no].append(percentage)
        
        # Calculate averages and identify strong/weak COs
        cos = []
        for co_no in sorted(co_scores.keys()):
            if co_scores[co_no]:
                avg = sum(co_scores[co_no]) / len(co_scores[co_no])
            else:
                avg = 0
            cos.append({
                "label": co_no if co_no.startswith("CO") else f"CO{co_no}",
                "percentage": round(avg),
                "coNo": co_no
            })
        
        # Sort by percentage to find strong/weak
        sorted_cos = sorted(cos, key=lambda x: x["percentage"], reverse=True)
        strong_cos = [co["label"] for co in sorted_cos[:2] if co["percentage"] >= 60]
        weak_cos = [co["label"] for co in sorted_cos[-2:] if co["percentage"] < 60]
        
        # Check coverage completeness (at least 3 COs covered)
        coverage_complete = len(cos) >= 3
        
        return {
            "cos": cos,
            "strongCOs": strong_cos,
            "weakCOs": weak_cos,
            "coverageComplete": coverage_complete
        }
    except Exception as e:
        print(f"Error in get_co_attainment: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/class-performance-trend")
async def get_class_performance_trend(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get class average performance trend across IAs"""
    try:
        # Build template filter
        template_query = db.query(COTemplate).filter(
            COTemplate.teacher_id == current_teacher.id
        )
        
        if semester:
            sem_num = int(semester.replace('S', ''))
            template_query = template_query.filter(COTemplate.sem == sem_num)
        if branch:
            template_query = template_query.filter(COTemplate.branch == branch)
        
        templates = template_query.all()
        
        # Group by IA
        ia_averages = {}
        
        for template in templates:
            ia = template.ia
            
            # Get schema IDs for this template
            schema_ids = [s.id for s in db.query(EvaluationSchema).filter(
                EvaluationSchema.template_id == template.id
            ).all()]
            
            if not schema_ids:
                continue
            
            # Get all progress records
            progress_records = db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.teacher_id == current_teacher.id,
                StudentEvaluationProgress.schema_id.in_(schema_ids)
            ).all()
            
            student_scores = []
            for progress in progress_records:
                evaluations = db.query(StudentAnswerEvaluation).filter(
                    StudentAnswerEvaluation.progress_id == progress.id
                ).all()
                
                if evaluations:
                    total_obtained = sum(e.mark_score for e in evaluations)
                    total_possible = sum(e.total_mark for e in evaluations)
                    
                    if total_possible > 0:
                        marks_out_of_50 = (total_obtained / total_possible) * 50
                        student_scores.append(marks_out_of_50)
            
            if student_scores:
                avg = sum(student_scores) / len(student_scores)
                if ia not in ia_averages:
                    ia_averages[ia] = []
                ia_averages[ia].append(avg)
        
        # Calculate average for each IA
        trend_data = []
        for ia in sorted(ia_averages.keys()):
            avg = sum(ia_averages[ia]) / len(ia_averages[ia])
            trend_data.append({
                "label": ia,
                "value": round(avg, 1)
            })
        
        return {
            "trend": trend_data,
            "hasData": len(trend_data) > 0
        }
    except Exception as e:
        print(f"Error in get_class_performance_trend: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documentation-readiness")
async def get_documentation_readiness(
    current_teacher: Teacher = Depends(get_current_teacher),
    db: Session = Depends(get_db),
    semester: Optional[str] = Query(None),
    ia: Optional[str] = Query(None),
    branch: Optional[str] = Query(None)
):
    """Get documentation readiness status with context filtering"""
    try:
        # Build template filter
        template_query = db.query(COTemplate).filter(
            COTemplate.teacher_id == current_teacher.id
        )
        
        if semester:
            sem_num = int(semester.replace('S', ''))
            template_query = template_query.filter(COTemplate.sem == sem_num)
        if ia:
            template_query = template_query.filter(COTemplate.ia == ia)
        if branch:
            template_query = template_query.filter(COTemplate.branch == branch)
        
        templates = template_query.all()
        template_ids = [t.id for t in templates]
        
        if not template_ids:
            return {
                "coMappingComplete": False,
                "studentMarksFinalized": False,
                "reportsReady": False,
                "completionPercentage": 0
            }
        
        # Check CO mapping completeness
        co_mappings_exist = db.query(COQuestionMapping).filter(
            COQuestionMapping.template_id.in_(template_ids)
        ).count() > 0
        
        # Check if evaluations exist
        schema_ids = [s.id for s in db.query(EvaluationSchema).filter(
            EvaluationSchema.template_id.in_(template_ids)
        ).all()]
        
        evaluations_exist = False
        all_students_evaluated = False
        
        if schema_ids:
            progress_records = db.query(StudentEvaluationProgress).filter(
                StudentEvaluationProgress.teacher_id == current_teacher.id,
                StudentEvaluationProgress.schema_id.in_(schema_ids)
            ).all()
            
            evaluations_exist = len(progress_records) > 0
            
            # Check if all students have been evaluated
            if progress_records:
                completed_count = 0
                for progress in progress_records:
                    eval_count = db.query(StudentAnswerEvaluation).filter(
                        StudentAnswerEvaluation.progress_id == progress.id
                    ).count()
                    if eval_count >= progress.total_questions and progress.total_questions > 0:
                        completed_count += 1
                
                all_students_evaluated = completed_count == len(progress_records) and completed_count > 0
        
        # Calculate completion percentage
        checks = [co_mappings_exist, evaluations_exist, all_students_evaluated]
        completion = (sum(checks) / len(checks)) * 100
        
        return {
            "coMappingComplete": co_mappings_exist,
            "studentMarksFinalized": all_students_evaluated,
            "reportsReady": co_mappings_exist and all_students_evaluated,
            "completionPercentage": round(completion)
        }
    except Exception as e:
        print(f"Error in get_documentation_readiness: {e}")
        raise HTTPException(status_code=500, detail=str(e))
