# Excel Generation Fix - Testing Guide

## What Was Fixed

### 1. MergedCell Error
**Problem**: `'MergedCell' object attribute 'value' is read-only`

**Solution**: Set cell values BEFORE merging cells, not after. The correct order is:
```python
# ✅ CORRECT
cell = ws.cell(row=1, column=1)
cell.value = "Title"
ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=5)

# ❌ WRONG
ws.merge_cells(start_row=1, start_column=1, end_row=1, end_column=5)
cell = ws.cell(row=1, column=1)
cell.value = "Title"  # Error: MergedCell is read-only
```

### 2. CO Question Mapping Verification
**Enhancement**: The system now:
- Reads CO question mappings directly from `co_question_mappings` table
- Sorts questions naturally (handles 1, 2, 6.a, 6.b, 7.a, 7.b, 8)
- Logs CO structure for verification
- Warns if questions are not found in mappings

### 3. Question Sorting
**New Feature**: Custom sort function handles sub-questions:
```
Before: ['1', '10', '2', '6.a', '6.b']
After:  ['1', '2', '6.a', '6.b', '10']
```

## Expected Excel Format

```
Row 1: [MPMC - IA1 - CO Mapping] (merged across all columns)

Row 2: [Register Number] [Student Name] [      CO1      ] [      CO2      ]
       (merged to row 3)  (merged to row 3)

Row 3:                                   [1][2][3][6.a][6.b][Total CO1] [4][5][7.a][7.b][8][Total CO2]

Row 4: [TOC23CS032]      [Student Name]  [3][3][3][ 10 ][ 4 ][   23   ] [2][3][ 7 ][ 7 ][6][   25   ]
```

## Testing Steps

### 1. Check Database CO Mappings
```sql
-- Verify CO question mappings exist
SELECT q_no, co_no, template_id 
FROM co_question_mappings 
WHERE template_id = {your_template_id}
ORDER BY co_no, q_no;

-- Expected output:
-- q_no | co_no | template_id
-- -----+-------+-------------
-- 1    | CO1   | 45
-- 2    | CO1   | 45
-- 3    | CO1   | 45
-- 6.a  | CO1   | 45
-- 6.b  | CO1   | 45
-- 4    | CO2   | 45
-- 5    | CO2   | 45
-- 7.a  | CO2   | 45
-- 7.b  | CO2   | 45
-- 8    | CO2   | 45
```

### 2. Check Student Marks
```sql
-- Verify student marks exist
SELECT regno, question_no, mark, template_id
FROM co_student_answer_marks
WHERE template_id = {your_template_id}
  AND regno = 'TOC23CS032'
ORDER BY question_no;

-- Expected output:
-- regno      | question_no | mark | template_id
-- -----------+-------------+------+-------------
-- TOC23CS032 | 1           | 3    | 45
-- TOC23CS032 | 2           | 3    | 45
-- TOC23CS032 | 3           | 3    | 45
-- TOC23CS032 | 4           | 2    | 45
-- TOC23CS032 | 5           | 3    | 45
-- TOC23CS032 | 6.a         | 10   | 45
-- TOC23CS032 | 6.b         | 4    | 45
-- TOC23CS032 | 7.a         | 7    | 45
-- TOC23CS032 | 7.b         | 7    | 45
-- TOC23CS032 | 8           | 6    | 45
```

### 3. Test Excel Download

#### Via Mobile App:
1. Go to CO Mapper section
2. Find the subject (e.g., "MPMC")
3. Click "Download Excel Report"
4. Open the downloaded Excel file
5. Verify:
   - ✅ No error messages
   - ✅ Title row merged correctly
   - ✅ CO headers merged correctly
   - ✅ Question numbers match database (including sub-questions)
   - ✅ Student marks appear in correct columns
   - ✅ Totals calculated correctly

#### Via API:
```bash
curl -X GET http://localhost:8000/co_download_excel/{subject_id} \
  -H "Authorization: Bearer {token}" \
  --output test_report.xlsx

# Open test_report.xlsx and verify
```

### 4. Check Console Logs

When downloading Excel, you should see:
```
============================================================
CO Structure for template 45:
  CO1: ['1', '2', '3', '6.a', '6.b']
  CO2: ['4', '5', '7.a', '7.b', '8']
============================================================
```

If there are issues:
```
⚠️ Warning: No CO question mappings found for template 45
⚠️ Warning: Question 9 not found in CO mappings for student TOC23CS032
```

## Common Issues & Solutions

### Issue 1: Empty Excel or No Data
**Cause**: No CO question mappings in database

**Solution**:
1. Check if CO template was created properly
2. Verify CO image was uploaded and processed
3. Check `co_question_mappings` table for entries
4. Re-upload CO image if needed

### Issue 2: Questions in Wrong Order
**Cause**: Question numbers not sorting correctly

**Solution**: The new sort function should handle this automatically. If issues persist:
1. Check question number format in database
2. Ensure format is consistent (e.g., "6.a" not "6a" or "6-a")

### Issue 3: Missing Student Marks
**Cause**: Marks not synced from evaluation

**Solution**:
1. Verify evaluation completed successfully
2. Check if auto-sync succeeded (look for "✅ SYNC COMPLETED" in logs)
3. Try manual sync: `POST /api/evaluation/sync-to-co-mapper/{progress_id}`
4. Check `co_student_answer_marks` table for entries

### Issue 4: Student Name Missing
**Cause**: Student not in `student_info` table

**Solution**:
```sql
-- Add student to student_info table
INSERT INTO student_info (reg_no, name, branch, division)
VALUES ('TOC23CS032', 'Student Name', 'CSE', 'A');
```

### Issue 5: MergedCell Error Still Occurs
**Cause**: Old code still running

**Solution**:
1. Restart backend server
2. Clear any cached Python bytecode: `find . -name "*.pyc" -delete`
3. Verify latest code is deployed

## Verification Checklist

Before considering the fix complete:

- [ ] Excel downloads without errors
- [ ] Title row is merged and centered
- [ ] CO headers are merged correctly
- [ ] Question numbers match database exactly
- [ ] Sub-questions (6.a, 6.b) appear correctly
- [ ] Questions are in correct order
- [ ] Student registration numbers appear
- [ ] Student names appear
- [ ] Marks appear in correct columns
- [ ] CO totals are calculated correctly
- [ ] Borders are applied to all cells
- [ ] Column widths are appropriate
- [ ] Console logs show CO structure

## Database Schema Reference

### co_question_mappings
```sql
CREATE TABLE co_question_mappings (
    id INTEGER PRIMARY KEY,
    q_no VARCHAR NOT NULL,        -- e.g., "1", "2", "6.a", "6.b"
    co_no VARCHAR NOT NULL,        -- e.g., "CO1", "CO2"
    template_id INTEGER NOT NULL   -- Foreign key to co_templates
);
```

### co_student_answer_marks
```sql
CREATE TABLE co_student_answer_marks (
    id INTEGER PRIMARY KEY,
    question_no VARCHAR NOT NULL,  -- Must match q_no in co_question_mappings
    mark VARCHAR NOT NULL,         -- Stored as string, converted to float
    regno VARCHAR NOT NULL,        -- Student registration number
    template_id INTEGER NOT NULL,  -- Foreign key to co_templates
    ia_id INTEGER NOT NULL         -- IA number (1, 2, 3)
);
```

## Success Criteria

The fix is successful when:
1. ✅ Excel downloads without "MergedCell" error
2. ✅ Excel format matches the desired layout exactly
3. ✅ Question numbers from database appear in correct order
4. ✅ Sub-questions (6.a, 6.b, 7.a, 7.b) are handled correctly
5. ✅ Student marks align with correct question columns
6. ✅ CO totals are calculated accurately
7. ✅ Console logs show clear CO structure for debugging
