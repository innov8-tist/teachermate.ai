# CO Mapper Integration with Evaluation System

## Overview
The evaluation system now automatically syncs student marks to the CO Mapper when answer sheets are evaluated. This creates a seamless connection between AI-powered evaluation and Course Outcome tracking.

## How It Works

### 1. Automatic Sync on Evaluation
When a student's answer sheet is evaluated:
- The AI evaluates each question and assigns marks
- Results are saved to the `student_answer_evaluations` table
- **Automatically**, marks are synced to the `co_student_answer_marks` table (CO Mapper)
- Questions are mapped to their respective COs based on the CO template

### 2. Data Flow
```
Answer Sheet Upload → AI Evaluation → Save Evaluation Results → Auto-Sync to CO Mapper
```

### 3. Database Tables Involved

**Evaluation Tables:**
- `evaluation_schemas` - Answer key PDFs
- `student_evaluation_progress` - Student evaluation tracking
- `student_answer_evaluations` - Detailed evaluation results with feedback

**CO Mapper Tables:**
- `co_templates` - Subject and CO mapping templates
- `co_question_mappings` - Question to CO mappings
- `co_student_answer_marks` - Student marks (synced from evaluations)

### 4. Excel Download Enhancement
The CO Mapper Excel download now includes:
- Student registration numbers
- **Student names** (fetched from student_info table)
- Question-wise marks mapped to COs
- CO-wise totals
- Comprehensive formatting

Excel Format:
```
| Register Number | Student Name | CO1 (Q1, Q2, Total) | CO2 (Q3, Q4, Total) | ...
|-----------------|--------------|---------------------|---------------------|----
| 21CSE001        | John Doe     | 5  | 4  | 9        | 3  | 4  | 7        | ...
```

## API Endpoints

### Automatic Sync (Built-in)
```
POST /api/evaluation/start-evaluation/{progress_id}
```
- Evaluates student answer sheet
- Automatically syncs results to CO Mapper
- Returns `co_mapper_synced: true/false` in response

### Manual Sync (Optional)
```
POST /api/evaluation/sync-to-co-mapper/{progress_id}
```
- Manually trigger sync for existing evaluations
- Useful for re-syncing or fixing failed syncs
- Requires teacher authentication

### Excel Download
```
GET /co_download_excel/{subject_id}
```
- Downloads Excel with CO-mapped marks
- Includes student names and comprehensive data
- Formatted with borders, colors, and merged cells

## Benefits

1. **No Manual Entry**: Teachers don't need to manually enter marks in CO Mapper
2. **Consistency**: Same marks in both evaluation and CO Mapper systems
3. **Time Saving**: Automatic sync eliminates duplicate data entry
4. **Accuracy**: Reduces human error in data transfer
5. **Comprehensive Reports**: Excel includes all necessary data for documentation

## Usage Example

### Teacher Workflow:
1. Create CO Template (CO Mapper section)
   - Upload CO mapping image
   - System extracts question-to-CO mappings

2. Upload Answer Key (Evaluation section)
   - Select the CO template
   - Upload answer key PDF

3. Upload Student Answer Sheets
   - Students upload their answer sheets
   - System evaluates using AI

4. **Automatic Sync Happens**
   - Marks automatically appear in CO Mapper
   - No additional action needed

5. Download Excel Report
   - Go to CO Mapper section
   - Click "Download Excel Report"
   - Get comprehensive CO-wise marks with student names

## Technical Details

### Sync Function
Located in: `backend/db_operation/db_server.py`

```python
def sync_evaluation_to_co_mapper(self, progress_id: int):
    """
    Sync evaluation results to CO mapper (StudentAnswerMark table)
    This automatically creates CO mapper entries when evaluation is completed
    """
```

### Key Features:
- Extracts template_id and IA number from evaluation schema
- Deletes existing marks to avoid duplicates
- Creates StudentAnswerMark records from evaluations
- Handles errors gracefully (evaluation still saved if sync fails)
- Provides detailed logging for debugging

## Error Handling

If sync fails:
- Evaluation results are still saved
- Warning message logged: "⚠️ Warning: Failed to sync to CO Mapper"
- Teacher can manually trigger sync later using the manual sync endpoint
- System continues to function normally

## Future Enhancements

Potential improvements:
- Bulk sync for multiple students
- Sync status indicator in UI
- Automatic retry on sync failure
- Sync history and audit log
- CO attainment calculation based on synced marks
