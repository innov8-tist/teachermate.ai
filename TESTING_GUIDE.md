# Testing Guide: CO Mapper & Evaluation Integration

## Prerequisites

1. Backend server running on port 8000
2. Database with required tables
3. At least one CO template created
4. Teacher account with authentication token

## Test 1: Complete End-to-End Flow

### Step 1: Create CO Template (CO Mapper)
```bash
# Via mobile app:
1. Open CO Mapper section
2. Click "Create New CO"
3. Fill in details:
   - Subject: "Mobile Programming and Management Concepts"
   - Semester: 5
   - IA: 1
   - Student Count: 30
4. Upload CO mapping image
5. Wait for processing
6. Note the template_id from response
```

### Step 2: Upload Answer Key (Evaluation)
```bash
# Via mobile app:
1. Open Evaluation section
2. Click "Upload Answer Key"
3. Select the CO template created above
4. Upload answer key PDF
5. Note the schema_id from response
```

### Step 3: Upload Student Answer Sheet
```bash
# Via mobile app:
1. In Evaluation section, click on the evaluation
2. Click "Upload Student Answer"
3. Enter student registration number: "TOC23CS049"
4. Upload student answer sheet PDF
5. Note the progress_id from response
```

### Step 4: Start Evaluation
```bash
# Via mobile app:
1. Click "Start Evaluation" button
2. Wait for AI evaluation to complete
3. Check response for:
   - "co_mapper_synced": true
   - Total marks and percentage
```

### Step 5: Verify in CO Mapper
```bash
# Via mobile app:
1. Go to CO Mapper section
2. Find the subject
3. Click "View Completed Students"
4. Verify student "TOC23CS049" appears with marks
```

### Step 6: Download Excel
```bash
# Via mobile app:
1. In CO Mapper, click "Download Excel Report"
2. Open the downloaded Excel file
3. Verify:
   - Student registration number present
   - Student name present
   - Question-wise marks present
   - CO-wise totals calculated
```

## Test 2: API Testing with cURL

### Get Authentication Token
```bash
curl -X POST http://localhost:8000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "teacher@example.com",
    "password": "password123"
  }'

# Save the token from response
TOKEN="your_token_here"
```

### Check Evaluation Status
```bash
curl -X GET http://localhost:8000/api/evaluation/{evaluation_id}/results \
  -H "Authorization: Bearer $TOKEN"
```

### Manual Sync to CO Mapper
```bash
curl -X POST http://localhost:8000/api/evaluation/sync-to-co-mapper/{progress_id} \
  -H "Authorization: Bearer $TOKEN"
```

### Download Excel
```bash
curl -X GET http://localhost:8000/co_download_excel/{subject_id} \
  -H "Authorization: Bearer $TOKEN" \
  --output co_report.xlsx
```

## Test 3: Database Verification

### Check Evaluation Results
```sql
-- Connect to your database
psql -U your_user -d your_database

-- Check evaluation records
SELECT 
    sae.id,
    sae.student_reg_no,
    sae.question_no,
    sae.mark_score,
    sae.total_mark,
    sae.evaluated_at
FROM student_answer_evaluations sae
JOIN student_evaluation_progress sep ON sae.progress_id = sep.id
WHERE sep.schema_id = {your_schema_id}
ORDER BY sae.student_reg_no, sae.question_no;
```

### Check CO Mapper Sync
```sql
-- Check if marks were synced to CO Mapper
SELECT 
    sam.regno,
    sam.question_no,
    sam.mark,
    sam.ia_id,
    cqm.co_no
FROM co_student_answer_marks sam
JOIN co_question_mappings cqm ON sam.question_no = cqm.q_no 
    AND sam.template_id = cqm.template_id
WHERE sam.template_id = {your_template_id}
    AND sam.regno = 'TOC23CS049'
ORDER BY sam.question_no;
```

### Check Student Names
```sql
-- Verify student info exists
SELECT * FROM student_info 
WHERE reg_no = 'TOC23CS049';
```

### Check CO Mappings
```sql
-- Verify question-to-CO mappings
SELECT 
    q_no,
    co_no,
    template_id
FROM co_question_mappings
WHERE template_id = {your_template_id}
ORDER BY q_no;
```

## Test 4: Console Log Verification

### Expected Console Output (Success)
```
============================================================
Starting evaluation for progress_id: 123
============================================================
Answer Key PDF: /path/to/answer_key.pdf
Student PDF: /path/to/student_answer.pdf
Student: TOC23CS049

Running Gemini evaluation...

Raw evaluation received, structuring with Groq...

Structured 5 question evaluations

Saving 5 evaluations to database...
Created 5 evaluation records

============================================================
SYNCING EVALUATION TO CO MAPPER...
============================================================

============================================================
SYNCING EVALUATION TO CO MAPPER
Progress ID: 123
Student: TOC23CS049
Template ID: 45
IA Number: 1
Questions to sync: 5
============================================================

  ✓ Q1: 5.0/10 marks
  ✓ Q2: 4.0/10 marks
  ✓ Q3: 3.0/10 marks
  ✓ Q4: 6.0/10 marks
  ✓ Q5: 7.0/10 marks

============================================================
✅ SYNC COMPLETED: 5 marks added to CO Mapper
============================================================

✅ Successfully synced evaluation results to CO Mapper
Cleaned up temporary files

============================================================
EVALUATION COMPLETED SUCCESSFULLY
Total Questions: 5
Marks: 25.0/50
Percentage: 50.00%
CO Mapper: ✅ Synced
============================================================
```

### Expected Console Output (Sync Failed)
```
============================================================
SYNCING EVALUATION TO CO MAPPER...
============================================================
Error syncing evaluation to CO mapper: [error message]
⚠️ Warning: Failed to sync to CO Mapper (evaluation still saved)

============================================================
EVALUATION COMPLETED SUCCESSFULLY
Total Questions: 5
Marks: 25.0/50
Percentage: 50.00%
CO Mapper: ⚠️ Not synced
============================================================
```

## Test 5: Excel File Verification

### Open Excel and Check:

1. **Title Row (Row 1)**
   - Merged across all columns
   - Format: "Subject Name - IA1 - CO Mapping"
   - Bold, size 14, centered

2. **Header Row 2**
   - Column A: "Register Number" (merged to row 3)
   - Column B: "Student Name" (merged to row 3)
   - Remaining: CO names (CO1, CO2, CO3, etc.)

3. **Header Row 3**
   - Question numbers under each CO
   - "Total CO1", "Total CO2", etc.

4. **Data Rows (Row 4+)**
   - Column A: Student registration numbers
   - Column B: Student names
   - Remaining: Marks for each question
   - Totals calculated correctly

5. **Formatting**
   - All cells have borders
   - Headers are bold
   - Numbers are centered
   - Names are left-aligned
   - Column widths appropriate

### Sample Excel Structure:
```
Row 1: [Mobile Programming and Management Concepts - IA1 - CO Mapping]
Row 2: [Reg No] [Name] [    CO1    ] [    CO2    ] [  CO3  ]
Row 3: [      ] [    ] [Q1][Q2][Tot] [Q3][Q4][Tot] [Q5][Tot]
Row 4: [21CSE001] [John] [5][4][9] [3][6][9] [7][7]
Row 5: [21CSE002] [Jane] [7][8][15] [5][7][12] [9][9]
```

## Test 6: Error Scenarios

### Test Missing CO Template
```bash
# Try to create evaluation without CO template
# Expected: Error message "Template not found"
```

### Test Missing Question Mappings
```bash
# Create CO template without uploading image
# Try to sync evaluation
# Expected: No CO mappings found, sync fails gracefully
```

### Test Invalid Student Registration Number
```bash
# Upload answer sheet with invalid reg number
# Expected: Evaluation works, but student name may be empty in Excel
```

### Test Duplicate Sync
```bash
# Sync same evaluation twice
# Expected: Old marks deleted, new marks inserted (no duplicates)
```

## Test 7: Performance Testing

### Test with Multiple Students
```bash
# Upload 10 student answer sheets
# Evaluate all
# Check:
# - All synced successfully
# - Excel includes all students
# - No performance degradation
```

### Test with Large Answer Sheets
```bash
# Upload answer sheet with 20+ questions
# Evaluate
# Check:
# - All questions synced
# - Excel columns expand correctly
# - No timeout errors
```

## Success Criteria

✅ All evaluations sync to CO Mapper automatically
✅ Excel includes student names and comprehensive data
✅ No duplicate entries in CO Mapper
✅ Console logs show clear success/failure messages
✅ API responses include sync status
✅ Manual sync works for failed auto-syncs
✅ Database tables consistent across evaluation and CO Mapper
✅ Excel formatting professional and readable

## Troubleshooting

### Issue: Sync fails silently
**Solution**: Check console logs for error messages, verify CO template exists

### Issue: Student name missing in Excel
**Solution**: Ensure student exists in `student_info` table

### Issue: Marks not appearing in CO Mapper
**Solution**: 
1. Check if evaluation completed successfully
2. Verify template_id matches between evaluation and CO template
3. Try manual sync endpoint

### Issue: Excel download fails
**Solution**: 
1. Verify subject_id is correct
2. Check if any students have completed evaluations
3. Ensure openpyxl library is installed

### Issue: Duplicate marks in CO Mapper
**Solution**: 
1. Check sync function - should delete old marks first
2. Manually delete duplicates from database
3. Re-sync using manual endpoint

## Reporting Issues

When reporting issues, include:
1. Console logs (full output)
2. API request/response
3. Database query results
4. Steps to reproduce
5. Expected vs actual behavior
