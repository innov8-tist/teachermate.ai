# Database Table Renaming Guide

## Overview
The database tables have been renamed to be more descriptive and follow standard naming conventions.

## Table Name Changes

| Old Name | New Name | Purpose |
|----------|----------|---------|
| `Teacher` | `teachers` | Teacher/Faculty accounts (follows plural convention) |
| `co_mapped_subjects` | `co_templates` | CO mapping templates created by teachers |
| `co_mapped_question` | `co_question_mappings` | Maps questions to Course Outcomes |
| `student_mapped_answer` | `student_answer_marks` | Student marks for each question |
| `all_subject` | `subjects` | Catalog of all available subjects |
| `answer_schema_extraction` | `evaluation_schemas` | Evaluation criteria and answer keys |

## Python Class Name Changes

| Old Class | New Class | Legacy Alias |
|-----------|-----------|--------------|
| `Subject` | `COTemplate` | `Subject_Legacy` |
| `COMAPPEDQUESTION` | `COQuestionMapping` | `COMAPPEDQUESTION` |
| `StudentMark` | `StudentAnswerMark` | `StudentMark` |
| `AllSubject` | `Subject` | `AllSubject` |
| `AnswerSchema` | `EvaluationSchema` | - |

## Column Name Changes

### co_question_mappings (formerly co_mapped_question)
- `subject_id` → `template_id` (more accurate - refers to CO template)

### student_answer_marks (formerly student_mapped_answer)
- `subject_id` → `template_id` (more accurate - refers to CO template)

### evaluation_schemas (formerly answer_schema_extraction)
- `subject_id` → `template_id` (more accurate - refers to CO template)

## Migration Instructions

### 1. Apply the Migration

```bash
cd backend
alembic upgrade head
```

This will:
- Rename all tables
- Update foreign key constraints
- Rename columns for clarity

### 2. Verify Changes

Check that all tables are renamed:
```sql
-- PostgreSQL
\dt

-- Should show:
-- teachers
-- co_templates
-- co_question_mappings
-- student_answer_marks
-- subjects
-- evaluation_schemas
```

### 3. Rollback (if needed)

If you need to revert the changes:
```bash
alembic downgrade -1
```

## Code Changes Made

### Updated Files:
1. `db_service/db_schema.py` - Updated all model classes and table names
2. `db_service/__init__.py` - Updated imports with legacy aliases
3. `db_operation/db_server.py` - Updated all model references
4. `comapping/answer_sheet_processing/db_operation.py` - Updated model references
5. `comapping/teacher_co_processing/db_operation.py` - Updated model references
6. `critera_extraction/db_operation.py` - Updated model references
7. `server.py` - Updated model references

### Backward Compatibility

Legacy aliases are provided in `db_service/__init__.py` for temporary backward compatibility:
- `Subject_Legacy` → `COTemplate`
- `COMAPPEDQUESTION` → `COQuestionMapping`
- `StudentMark` → `StudentAnswerMark`
- `AllSubject` → `Subject`

## Understanding the New Schema

### teachers
Stores teacher/faculty account information.

### subjects
A catalog of all available subjects (e.g., "Data Structures", "Operating Systems").

### co_templates
When a teacher uploads a CO mapping image for a specific subject and IA, it creates a CO template. This template defines which questions map to which Course Outcomes.

### co_question_mappings
Stores the actual question-to-CO mappings extracted from the teacher's uploaded template.
- Example: Question 1a → CO1, Question 1b → CO2

### student_answer_marks
When a student answer sheet is analyzed, their marks for each question are stored here, linked to the CO template.

### evaluation_schemas
Stores evaluation criteria, marking schemes, and expected answers for automated grading.

## Benefits of New Names

1. **Clarity**: Names clearly describe what each table contains
2. **Consistency**: Follows standard plural naming convention for tables
3. **Accuracy**: `template_id` is more accurate than `subject_id` for CO mappings
4. **Maintainability**: Easier for new developers to understand the schema
5. **Documentation**: Self-documenting code reduces need for comments
