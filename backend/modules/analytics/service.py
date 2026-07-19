"""
Analytics Service
Business logic layer for analytics operations
Coordinates between repository and calculation utilities
"""

from typing import Optional, Dict, List
from sqlalchemy.orm import Session
from collections import defaultdict

from .repository import AnalyticsRepository
from .schemas import *
from db_service.db_schema import StudentEvaluationProgress, StudentAnswerEvaluation


class AnalyticsService:
    """Service layer for analytics operations"""
    
    def __init__(self, db: Session):
        self.db = db
        self.repository = AnalyticsRepository(db)
    
    # ========== Context Operations ==========
    
    def get_available_contexts(self, teacher_id: int) -> ContextsResponse:
        """Get all available context combinations for filtering"""
        templates = self.repository.get_templates_by_teacher(teacher_id)
        
        contexts = [
            ContextModel(
                semester=f"S{template.sem}",
                ia=template.ia,
                branch=template.branch,
                templateId=template.id,
                subjectName=template.name
            )
            for template in templates
        ]
        
        return ContextsResponse(contexts=contexts)
    
    # ========== Summary Statistics ==========
    
    def get_summary(
        self,
        teacher_id: int,
        semester: Optional[str] = None,
        ia: Optional[str] = None,
        branch: Optional[str] = None
    ) -> SummaryResponse:
        """Get summary KPIs with optional filtering"""
        template_ids = self.repository.get_template_ids_by_teacher(
            teacher_id, semester, ia, branch
        )
        
        if not template_ids:
            return SummaryResponse(
                totalEvaluations=0,
                totalStudentsEvaluated=0,
                totalSubjects=0
            )
        
        schema_ids = self.repository.get_schema_ids_by_templates(template_ids)
        progress_records = self.repository.get_progress_by_schemas(teacher_id, schema_ids)
        total_students = self.repository.count_unique_students(teacher_id, schema_ids)
        
        return SummaryResponse(
            totalEvaluations=len(progress_records),
            totalStudentsEvaluated=total_students,
            totalSubjects=len(template_ids)
        )
    
    # ========== Performance Analytics ==========
    
    def get_performance_overview(
        self,
        teacher_id: int,
        semester: Optional[str] = None,
        ia: Optional[str] = None,
        branch: Optional[str] = None
    ) -> PerformanceOverviewResponse:
        """Get student performance overview with filtering"""
        template_ids = self.repository.get_template_ids_by_teacher(
            teacher_id, semester, ia, branch
        )
        
        if not template_ids:
            return PerformanceOverviewResponse(
                averageScore=0,
                passRate=0,
                totalStudents=0
            )
        
        schema_ids = self.repository.get_schema_ids_by_templates(template_ids)
        progress_records = self.repository.get_progress_by_schemas(teacher_id, schema_ids)
        
        if not progress_records:
            return PerformanceOverviewResponse(
                averageScore=0,
                passRate=0,
                totalStudents=0
            )
        
        # Bulk fetch evaluations
        progress_ids = [p.id for p in progress_records]
        evaluations_map = self.repository.get_evaluations_bulk(progress_ids)
        
        # Calculate student scores
        student_scores, passed_students = self._calculate_student_scores(
            progress_records, evaluations_map
        )
        
        avg_score = self._calculate_average(student_scores)
        pass_rate = self._calculate_pass_rate(passed_students, len(student_scores))
        
        return PerformanceOverviewResponse(
            averageScore=round(avg_score, 1),
            passRate=round(pass_rate, 1),
            totalStudents=len(student_scores)
        )
    
    # ========== Score Distribution ==========
    
    def get_score_distribution(
        self,
        teacher_id: int,
        semester: Optional[str] = None,
        ia: Optional[str] = None,
        branch: Optional[str] = None
    ) -> ScoreDistributionResponse:
        """Get score distribution by ranges"""
        template_ids = self.repository.get_template_ids_by_teacher(
            teacher_id, semester, ia, branch
        )
        
        default_ranges = [
            ScoreRangeModel(range="0-19", count=0, label="Fail"),
            ScoreRangeModel(range="20-34", count=0, label="Pass"),
            ScoreRangeModel(range="35-44", count=0, label="Good"),
            ScoreRangeModel(range="45-50", count=0, label="Excellent")
        ]
        
        if not template_ids:
            return ScoreDistributionResponse(ranges=default_ranges)
        
        schema_ids = self.repository.get_schema_ids_by_templates(template_ids)
        progress_records = self.repository.get_progress_by_schemas(teacher_id, schema_ids)
        
        # Bulk fetch evaluations
        progress_ids = [p.id for p in progress_records]
        evaluations_map = self.repository.get_evaluations_bulk(progress_ids)
        
        # Calculate distribution
        ranges_dict = self._calculate_distribution(progress_records, evaluations_map)
        
        ranges = [
            ScoreRangeModel(range="0-19", count=ranges_dict["0-19"], label="Fail"),
            ScoreRangeModel(range="20-34", count=ranges_dict["20-34"], label="Pass"),
            ScoreRangeModel(range="35-44", count=ranges_dict["35-44"], label="Good"),
            ScoreRangeModel(range="45-50", count=ranges_dict["45-50"], label="Excellent")
        ]
        
        return ScoreDistributionResponse(ranges=ranges)
    
    # ========== Question Analytics ==========
    
    def get_question_insights(
        self,
        teacher_id: int,
        semester: Optional[str] = None,
        ia: Optional[str] = None,
        branch: Optional[str] = None
    ) -> QuestionInsightsResponse:
        """Get question-level performance insights"""
        template_ids = self.repository.get_template_ids_by_teacher(
            teacher_id, semester, ia, branch
        )
        
        if not template_ids:
            return QuestionInsightsResponse(
                averageMarksPerQuestion=0,
                lowestPerforming=[],
                highestPerforming=[]
            )
        
        schema_ids = self.repository.get_schema_ids_by_templates(template_ids)
        evaluations = self.repository.get_evaluations_with_progress(teacher_id, schema_ids)
        
        if not evaluations:
            return QuestionInsightsResponse(
                averageMarksPerQuestion=0,
                lowestPerforming=[],
                highestPerforming=[]
            )
        
        # Analyze questions
        question_performance = self._analyze_questions(evaluations)
        lowest, highest = self._get_top_bottom_questions(question_performance, count=3)
        
        # Calculate overall average
        total_avg = (
            sum(q["percentage"] for q in question_performance) / len(question_performance)
        ) if question_performance else 0
        
        return QuestionInsightsResponse(
            averageMarksPerQuestion=round(total_avg, 1),
            lowestPerforming=[QuestionPerformanceModel(**q) for q in lowest],
            highestPerforming=[QuestionPerformanceModel(**q) for q in highest]
        )
    
    # ========== CO Attainment ==========
    
    def get_co_attainment(
        self,
        teacher_id: int,
        semester: Optional[str] = None,
        ia: Optional[str] = None,
        branch: Optional[str] = None
    ) -> COAttainmentResponse:
        """Get CO attainment percentages"""
        template_ids = self.repository.get_template_ids_by_teacher(
            teacher_id, semester, ia, branch
        )
        
        if not template_ids:
            return COAttainmentResponse(
                cos=[],
                strongCOs=[],
                weakCOs=[],
                coverageComplete=False
            )
        
        # Get CO mappings
        co_mappings = self.repository.get_co_mappings_by_templates(template_ids)
        
        if not co_mappings:
            return COAttainmentResponse(
                cos=[],
                strongCOs=[],
                weakCOs=[],
                coverageComplete=False
            )
        
        # Build evaluations map by (template_id, question_no)
        evaluations_by_question = {}
        for mapping in co_mappings:
            evals = self.repository.get_evaluations_by_question(
                teacher_id, mapping.template_id, mapping.q_no
            )
            key = f"{mapping.template_id}_{mapping.q_no}"
            evaluations_by_question[key] = evals
        
        # Calculate CO attainment
        cos = self._calculate_co_attainment(co_mappings, evaluations_by_question)
        strong_cos, weak_cos = self._identify_strong_weak_cos(cos)
        coverage_complete = len(cos) >= 3
        
        return COAttainmentResponse(
            cos=[COAttainmentModel(**co) for co in cos],
            strongCOs=strong_cos,
            weakCOs=weak_cos,
            coverageComplete=coverage_complete
        )
    
    # ========== Trend Analysis ==========
    
    def get_class_performance_trend(
        self,
        teacher_id: int,
        semester: Optional[str] = None,
        branch: Optional[str] = None
    ) -> ClassPerformanceTrendResponse:
        """Get class average performance trend across IAs"""
        templates = self.repository.get_templates_by_teacher(teacher_id, semester, None, branch)
        
        if not templates:
            return ClassPerformanceTrendResponse(trend=[], hasData=False)
        
        # Group templates by IA
        templates_by_ia = defaultdict(list)
        for template in templates:
            templates_by_ia[template.ia].append(template)
        
        # Calculate trend data
        ia_averages = {}
        for ia, ia_templates in templates_by_ia.items():
            ia_scores = []
            
            for template in ia_templates:
                schema_ids = self.repository.get_schema_ids_by_templates([template.id])
                progress_records = self.repository.get_progress_by_schemas(teacher_id, schema_ids)
                
                if progress_records:
                    progress_ids = [p.id for p in progress_records]
                    evaluations_map = self.repository.get_evaluations_bulk(progress_ids)
                    
                    for progress in progress_records:
                        evaluations = evaluations_map.get(progress.id, [])
                        
                        if evaluations:
                            total_obtained = sum(e.mark_score for e in evaluations)
                            total_possible = sum(e.total_mark for e in evaluations)
                            
                            if total_possible > 0:
                                marks_out_of_50 = (total_obtained / total_possible) * 50
                                ia_scores.append(marks_out_of_50)
            
            if ia_scores:
                ia_averages[ia] = sum(ia_scores) / len(ia_scores)
        
        # Format trend data
        trend_data = [
            TrendDataModel(label=ia, value=round(avg, 1))
            for ia, avg in sorted(ia_averages.items())
        ]
        
        return ClassPerformanceTrendResponse(
            trend=trend_data,
            hasData=len(trend_data) > 0
        )
    
    # ========== Documentation Readiness ==========
    
    def get_documentation_readiness(
        self,
        teacher_id: int,
        semester: Optional[str] = None,
        ia: Optional[str] = None,
        branch: Optional[str] = None
    ) -> DocumentationReadinessResponse:
        """Get documentation readiness status"""
        template_ids = self.repository.get_template_ids_by_teacher(
            teacher_id, semester, ia, branch
        )
        
        if not template_ids:
            return DocumentationReadinessResponse(
                coMappingComplete=False,
                studentMarksFinalized=False,
                reportsReady=False,
                completionPercentage=0
            )
        
        # Check CO mappings
        co_mappings = self.repository.get_co_mappings_by_templates(template_ids)
        co_mappings_exist = len(co_mappings) > 0
        
        # Check evaluations
        schema_ids = self.repository.get_schema_ids_by_templates(template_ids)
        
        evaluations_exist = False
        all_students_evaluated = False
        
        if schema_ids:
            progress_records = self.repository.get_progress_by_schemas(teacher_id, schema_ids)
            evaluations_exist = len(progress_records) > 0
            
            if progress_records:
                progress_ids = [p.id for p in progress_records]
                evaluations_map = self.repository.get_evaluations_bulk(progress_ids)
                
                completed_count = 0
                for progress in progress_records:
                    evals = evaluations_map.get(progress.id, [])
                    eval_count = len(evals)
                    
                    if eval_count >= progress.total_questions and progress.total_questions > 0:
                        completed_count += 1
                
                all_students_evaluated = (
                    completed_count == len(progress_records) and completed_count > 0
                )
        
        # Calculate completion
        checks = [co_mappings_exist, evaluations_exist, all_students_evaluated]
        completion = (sum(checks) / len(checks)) * 100
        
        return DocumentationReadinessResponse(
            coMappingComplete=co_mappings_exist,
            studentMarksFinalized=all_students_evaluated,
            reportsReady=co_mappings_exist and all_students_evaluated,
            completionPercentage=round(completion)
        )
    
    # ========== Private Helper Methods ==========
    
    def _calculate_student_scores(
        self,
        progress_records: List[StudentEvaluationProgress],
        evaluations_map: Dict[int, List[StudentAnswerEvaluation]]
    ) -> tuple:
        """Calculate student scores and count passed students"""
        student_scores = []
        passed_students = 0
        
        for progress in progress_records:
            evaluations = evaluations_map.get(progress.id, [])
            
            if evaluations:
                total_obtained = sum(e.mark_score for e in evaluations)
                total_possible = 50
                
                if total_possible > 0:
                    percentage = (total_obtained / total_possible) * 100
                    student_scores.append(percentage)
                    if percentage >= 40:
                        passed_students += 1
        
        return student_scores, passed_students
    
    def _calculate_average(self, scores: List[float]) -> float:
        """Calculate average score"""
        if not scores:
            return 0.0
        return sum(scores) / len(scores)
    
    def _calculate_pass_rate(self, passed_count: int, total_count: int) -> float:
        """Calculate pass rate percentage"""
        if total_count == 0:
            return 0.0
        return (passed_count / total_count) * 100
    
    def _calculate_distribution(
        self,
        progress_records: List[StudentEvaluationProgress],
        evaluations_map: Dict[int, List[StudentAnswerEvaluation]]
    ) -> Dict[str, int]:
        """Calculate score distribution by ranges"""
        ranges = {"0-19": 0, "20-34": 0, "35-44": 0, "45-50": 0}
        
        for progress in progress_records:
            evaluations = evaluations_map.get(progress.id, [])
            
            if evaluations:
                total_obtained = sum(e.mark_score for e in evaluations)
                total_possible = sum(e.total_mark for e in evaluations)
                
                if total_possible > 0:
                    marks_out_of_50 = (total_obtained / total_possible) * 50
                    
                    if marks_out_of_50 < 20:
                        ranges["0-19"] += 1
                    elif marks_out_of_50 < 35:
                        ranges["20-34"] += 1
                    elif marks_out_of_50 < 45:
                        ranges["35-44"] += 1
                    else:
                        ranges["45-50"] += 1
        
        return ranges
    
    def _analyze_questions(self, evaluations: List[StudentAnswerEvaluation]) -> List[Dict]:
        """Analyze performance per question"""
        if not evaluations:
            return []
        
        question_stats = defaultdict(lambda: {
            "total_score": 0,
            "total_possible": 0,
            "count": 0
        })
        
        for eval in evaluations:
            q_no = eval.question_no
            question_stats[q_no]["total_score"] += eval.mark_score
            question_stats[q_no]["total_possible"] += eval.total_mark
            question_stats[q_no]["count"] += 1
        
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
        
        return question_performance
    
    def _get_top_bottom_questions(
        self,
        question_performance: List[Dict],
        count: int = 3
    ) -> tuple:
        """Get top and bottom performing questions"""
        if not question_performance:
            return [], []
        
        sorted_questions = sorted(question_performance, key=lambda x: x["percentage"])
        
        lowest = sorted_questions[:count]
        highest = sorted_questions[-count:][::-1]
        
        return lowest, highest
    
    def _calculate_co_attainment(self, co_mappings, evaluations_by_question) -> List[Dict]:
        """Calculate CO attainment percentages"""
        co_scores = defaultdict(list)
        
        for mapping in co_mappings:
            key = f"{mapping.template_id}_{mapping.q_no}"
            evals = evaluations_by_question.get(key, [])
            
            for eval in evals:
                if eval.total_mark > 0:
                    percentage = (eval.mark_score / eval.total_mark) * 100
                    co_scores[mapping.co_no].append(percentage)
        
        cos = []
        for co_no in sorted(co_scores.keys()):
            if co_scores[co_no]:
                avg = sum(co_scores[co_no]) / len(co_scores[co_no])
            else:
                avg = 0
            
            co_label = co_no if co_no.startswith("CO") else f"CO{co_no}"
            cos.append({
                "label": co_label,
                "percentage": round(avg),
                "coNo": co_no
            })
        
        return cos
    
    def _identify_strong_weak_cos(
        self,
        cos: List[Dict],
        strong_threshold: int = 60,
        weak_threshold: int = 60
    ) -> tuple:
        """Identify strong and weak COs"""
        sorted_cos = sorted(cos, key=lambda x: x["percentage"], reverse=True)
        
        strong_cos = [
            co["label"] for co in sorted_cos[:2]
            if co["percentage"] >= strong_threshold
        ]
        
        weak_cos = [
            co["label"] for co in sorted_cos[-2:]
            if co["percentage"] < weak_threshold
        ]
        
        return strong_cos, weak_cos
