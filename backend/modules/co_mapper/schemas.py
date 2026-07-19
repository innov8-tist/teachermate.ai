"""
CO Mapper Schemas
Pydantic models for CO mapper API request/response validation
"""

from pydantic import BaseModel
from typing import List, Optional, Dict, Any


class CoCreationRequest(BaseModel):
    """Request model for CO creation"""
    subject_name: str
    sem: int
    ia_number: int
    student_count: int


class CoCreationResponse(BaseModel):
    """Response model for CO creation"""
    status: str
    message: str
    data: Optional[Dict[str, Any]] = None


class CoTemplateInfo(BaseModel):
    """CO template information"""
    id: int
    ia: str
    name: str
    branch: str
    sem: int


class CoTemplateListResponse(BaseModel):
    """Response with list of CO templates"""
    templates: List[CoTemplateInfo]


class CoQuestionMapping(BaseModel):
    """CO question mapping"""
    q_no: str
    co_no: str


class CoDetailsResponse(BaseModel):
    """Response with CO details"""
    mappings: List[CoQuestionMapping]


class SubjectInfo(BaseModel):
    """Subject/template information"""
    name: str
    ia: str
    branch: str
    sem: int
    student_count: int


class StudentInfo(BaseModel):
    """Student information"""
    regno: str
    name: Optional[str] = ""


class StudentMarksDetail(BaseModel):
    """Student marks detail"""
    question_no: str
    mark: str
    ia_id: int


class StudentMarksResponse(BaseModel):
    """Response with student marks"""
    marks: List[StudentMarksDetail]


class DeleteResponse(BaseModel):
    """Generic delete response"""
    status: str
    message: str


class StudentSheetUploadResponse(BaseModel):
    """Response for student sheet upload"""
    status: str
    message: str
    evaluation_synced: bool
    data: Optional[Dict[str, Any]] = None


class SubjectListItem(BaseModel):
    """Subject catalog item"""
    id: int
    name: str
    branch: str
    sem: int


class AllQuestionsResponse(BaseModel):
    """Response with all questions for a template"""
    all_questions: List[str]
