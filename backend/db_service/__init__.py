from db_service.db import get_db
from modules.auth.models import Teacher
from modules.co_mapper.models import (
    COTemplate,
    COQuestionMapping,
    StudentAnswerMark,
    Subject,
    # Legacy aliases for backward compatibility
    COTemplate as Subject_Legacy,
    COQuestionMapping as COMAPPEDQUESTION,
    StudentAnswerMark as StudentMark,
    Subject as AllSubject,
)
