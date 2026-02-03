# Bidirectional Deletion: Evaluation ↔ CO Mapper

## Overview

When you delete a student's data from either the **Evaluation** section or the **CO Mapper** section, the system automatically deletes the corresponding data from the other section. This ensures data consistency across both systems.

## How It Works

### Scenario 1: Delete from Evaluation Section

```
User deletes student evaluation
         ↓
System deletes evaluation records
         ↓
System finds corresponding CO mapper entries
         ↓
System deletes CO mapper marks
         ↓
✅ Both systems updated
```

**What gets deleted:**
- Student evaluation progress record
- All question-by-question evaluation results
- All CO mapper marks for that student and IA

### Scenario 2: Delete from CO Mapper Section

```
User deletes student marks from CO Mapper
         ↓
System deletes CO mapper marks
         ↓
System finds corresponding evaluation records
         ↓
System deletes evaluation progress and results
         ↓
✅ Both systems updated
```

**What gets deleted:**
- All CO mapper marks for that student
- Student evaluation progress records
- All question-by-question evaluation results

## API Endpoints

### Delete from Evaluation
```http
DELETE /api/evaluation/{evaluation_id}/student/{student_reg_no}
Authorization: Bearer {token}

Response:
{
  "success": true,
  "message": "Student evaluation and CO mapper entries deleted successfully",
  "deleted": {
    "evaluation_records": 5,
    "co_mapper_entries": 5
  }
}
```

### Delete from CO Mapper
```http
DELETE /student_marks/{subject_id}/{regno}

Response:
{
  "status": "success",
  "message": "Student marks and evaluation records deleted successfully"
}
```

## Console Output

### Deleting from Evaluation

```
============================================================
DELETING STUDENT EVALUATION
Student: TOC23CS049
Evaluation ID: 123
Template ID: 45
============================================================

✓ Deleted 5 evaluation records
✓ Deleted progress record
✓ Deleted 5 CO mapper entries

============================================================
✅ DELETION COMPLETE
Evaluation records: 5
CO mapper entries: 5
============================================================
```

### Deleting from CO Mapper

```
============================================================
DELETING STUDENT MARKS FROM CO MAPPER
Student: TOC23CS049
Template ID: 45
============================================================

✓ Deleted 5 CO mapper marks
✓ Deleted 5 evaluation records
✓ Deleted 1 progress records

============================================================
✅ DELETION COMPLETE
CO mapper marks: 5
Evaluation records: 5
Progress records: 1
============================================================
```

## Database Operations

### Delete from Evaluation
```sql
-- 1. Delete evaluation results
DELETE FROM student_answer_evaluations 
WHERE progress_id = {progress_id};

-- 2. Delete progress record
DELETE FROM student_evaluation_progress 
WHERE id = {progress_id};

-- 3. Delete CO mapper marks
DELETE FROM co_student_answer_marks 
WHERE template_id = {template_id} 
  AND regno = {student_reg_no}
  AND ia_id = {ia_number};
```

### Delete from CO Mapper
```sql
-- 1. Delete CO mapper marks
DELETE FROM co_student_answer_marks 
WHERE template_id = {template_id} 
  AND regno = {student_reg_no};

-- 2. Find and delete evaluation records
DELETE FROM student_answer_evaluations 
WHERE progress_id IN (
  SELECT id FROM student_evaluation_progress 
  WHERE schema_id IN (
    SELECT id FROM evaluation_schemas 
    WHERE template_id = {template_id}
  )
  AND student_reg_no = {student_reg_no}
);

-- 3. Delete progress records
DELETE FROM student_evaluation_progress 
WHERE schema_id IN (
  SELECT id FROM evaluation_schemas 
  WHERE template_id = {template_id}
)
AND student_reg_no = {student_reg_no};
```

## Use Cases

### Use Case 1: Student Withdrew from Course
**Action**: Delete from CO Mapper
**Result**: All evaluation and CO mapper data removed

### Use Case 2: Evaluation Error - Need to Re-evaluate
**Action**: Delete from Evaluation section
**Result**: Can re-upload and re-evaluate without CO mapper conflicts

### Use Case 3: Wrong Student Data Uploaded
**Action**: Delete from either section
**Result**: Clean slate for correct student data

### Use Case 4: Semester Reset
**Action**: Delete all students from CO Mapper
**Result**: All evaluation data also cleared

## Benefits

1. **Data Consistency**: No orphaned records in either system
2. **Single Action**: Delete once, both systems updated
3. **No Conflicts**: Re-uploading data won't cause duplicates
4. **Clean Slate**: Easy to correct mistakes
5. **Audit Trail**: Console logs show exactly what was deleted

## Testing

### Test 1: Delete from Evaluation
```bash
# 1. Upload and evaluate a student
# 2. Verify student appears in CO Mapper
# 3. Delete from Evaluation section
# 4. Verify student removed from CO Mapper
# 5. Check console logs for deletion details
```

### Test 2: Delete from CO Mapper
```bash
# 1. Upload and evaluate a student
# 2. Verify student appears in Evaluation results
# 3. Delete from CO Mapper section
# 4. Verify student removed from Evaluation
# 5. Check console logs for deletion details
```

### Test 3: Re-upload After Deletion
```bash
# 1. Delete student from either section
# 2. Re-upload and re-evaluate same student
# 3. Verify no duplicate entries
# 4. Verify data appears correctly in both sections
```

## Database Verification

### Check Deletion from Evaluation
```sql
-- Should return 0 rows after deletion
SELECT * FROM student_answer_evaluations 
WHERE progress_id = {progress_id};

SELECT * FROM student_evaluation_progress 
WHERE id = {progress_id};

SELECT * FROM co_student_answer_marks 
WHERE template_id = {template_id} 
  AND regno = '{student_reg_no}';
```

### Check Deletion from CO Mapper
```sql
-- Should return 0 rows after deletion
SELECT * FROM co_student_answer_marks 
WHERE template_id = {template_id} 
  AND regno = '{student_reg_no}';

SELECT * FROM student_evaluation_progress 
WHERE student_reg_no = '{student_reg_no}'
  AND schema_id IN (
    SELECT id FROM evaluation_schemas 
    WHERE template_id = {template_id}
  );
```

## Error Handling

### Scenario: Template Not Found
```
⚠️ Warning: Template not found, CO mapper entries not deleted
```
**Impact**: Evaluation records deleted, but CO mapper entries remain
**Solution**: Manually delete CO mapper entries or fix template reference

### Scenario: No Evaluation Records Found
```
✓ Deleted 0 evaluation records
✓ Deleted 0 progress records
```
**Impact**: Only CO mapper marks deleted (student never evaluated)
**Solution**: No action needed, this is expected behavior

### Scenario: Database Error
```
Error deleting student marks: [error message]
```
**Impact**: Transaction rolled back, no data deleted
**Solution**: Check database connection, verify IDs are correct

## Implementation Details

### Files Modified
1. **backend/server.py**
   - Updated `delete_student_evaluation_results()` endpoint
   - Added CO mapper deletion logic
   - Enhanced response with deletion counts

2. **backend/db_operation/db_server.py**
   - Updated `delete_student_marks()` function
   - Added evaluation deletion logic
   - Enhanced logging

### Key Functions

**Delete from Evaluation:**
```python
@app.delete("/api/evaluation/{evaluation_id}/student/{student_reg_no}")
async def delete_student_evaluation_results(...):
    # Delete evaluation records
    # Delete progress record
    # Delete CO mapper marks
    # Return deletion counts
```

**Delete from CO Mapper:**
```python
def delete_student_marks(self, subject_id: int, regno: str):
    # Delete CO mapper marks
    # Find evaluation schemas
    # Delete evaluation records
    # Delete progress records
    # Return success
```

## Rollback Safety

Both deletion operations use database transactions:
- If any step fails, entire operation is rolled back
- No partial deletions
- Data integrity maintained

```python
try:
    # Delete operations
    db.commit()
except Exception as e:
    db.rollback()
    raise e
```

## Success Criteria

✅ Deleting from Evaluation removes CO mapper entries
✅ Deleting from CO Mapper removes evaluation records
✅ Console logs show deletion details
✅ No orphaned records in either system
✅ Re-uploading after deletion works correctly
✅ Database transactions ensure data integrity

## Future Enhancements

Potential improvements:
- [ ] Soft delete with restore capability
- [ ] Deletion confirmation dialog in UI
- [ ] Bulk delete multiple students
- [ ] Deletion history/audit log
- [ ] Undo deletion within time window
