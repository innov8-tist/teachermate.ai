from db_service.db import get_db
from modules.auth.models import Teacher
from db_service.db_schema import (
    COTemplate,
    COQuestionMapping,
    StudentAnswerMark,
    Subject,
    COTemplate as Subject_Legacy,
    COQuestionMapping as COMAPPEDQUESTION,
    StudentAnswerMark as StudentMark,
    Subject as AllSubject,
)
