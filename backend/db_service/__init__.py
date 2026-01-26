from db_service.db import get_db
from db_service.db_schema import (
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
