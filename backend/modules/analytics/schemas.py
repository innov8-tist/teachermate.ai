"""
Analytics Schemas
Pydantic models for analytics API request/response validation
"""

from pydantic import BaseModel
from typing import List, Optional


class ContextModel(BaseModel):
    """Available context for filtering analytics"""
    semester: str
    ia: str
    branch: str
    templateId: int
    subjectName: str


class ContextsResponse(BaseModel):
    """Response containing available contexts"""
    contexts: List[ContextModel]


class SummaryResponse(BaseModel):
    """Summary KPI metrics response"""
    totalEvaluations: int
    totalStudentsEvaluated: int
    totalSubjects: int


class PerformanceOverviewResponse(BaseModel):
    """Student performance overview response"""
    averageScore: float
    passRate: float
    totalStudents: int
    passThreshold: int = 40


class ScoreRangeModel(BaseModel):
    """Score distribution range model"""
    range: str
    count: int
    label: str


class ScoreDistributionResponse(BaseModel):
    """Score distribution by ranges response"""
    ranges: List[ScoreRangeModel]


class QuestionPerformanceModel(BaseModel):
    """Question-level performance model"""
    questionNo: str
    percentage: float
    averageMarks: float


class QuestionInsightsResponse(BaseModel):
    """Question-level insights response"""
    averageMarksPerQuestion: float
    lowestPerforming: List[QuestionPerformanceModel]
    highestPerforming: List[QuestionPerformanceModel]


class COAttainmentModel(BaseModel):
    """CO attainment data model"""
    label: str
    percentage: int
    coNo: str


class COAttainmentResponse(BaseModel):
    """CO attainment summary response"""
    cos: List[COAttainmentModel]
    strongCOs: List[str]
    weakCOs: List[str]
    coverageComplete: bool


class TrendDataModel(BaseModel):
    """Trend data point model"""
    label: str
    value: float


class ClassPerformanceTrendResponse(BaseModel):
    """Class performance trend across IAs response"""
    trend: List[TrendDataModel]
    hasData: bool


class DocumentationReadinessResponse(BaseModel):
    """Documentation readiness status response"""
    coMappingComplete: bool
    studentMarksFinalized: bool
    reportsReady: bool
    completionPercentage: int
