# System Flow Diagram: Evaluation to CO Mapper Integration

## Complete Workflow

```
┌─────────────────────────────────────────────────────────────────────────┐
│                         TEACHER SETUP PHASE                              │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │   CO Mapper      │
    │   Section        │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────┐
    │ Upload CO Image  │  (Question-to-CO mapping)
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ System Extracts Mappings     │
    │ Q1 → CO1                     │
    │ Q2 → CO1                     │
    │ Q3 → CO2                     │
    │ Q4 → CO2                     │
    │ Q5 → CO3                     │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Saved to Database            │
    │ Table: co_question_mappings  │
    └──────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      EVALUATION PHASE                                    │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │   Evaluation     │
    │   Section        │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Upload Answer Key PDF        │
    │ (Select CO Template)         │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Student Uploads Answer Sheet │
    │ (PDF or Camera)              │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ AI Evaluation (Gemini)       │
    │ - Compare with answer key    │
    │ - Assign marks per question  │
    │ - Generate feedback          │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Structure Results (Groq)     │
    │ Q1: 5/10 marks               │
    │ Q2: 4/10 marks               │
    │ Q3: 3/10 marks               │
    │ Q4: 6/10 marks               │
    │ Q5: 7/10 marks               │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Save to Database             │
    │ Table: student_answer_       │
    │        evaluations           │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ ✨ AUTOMATIC SYNC ✨         │
    │ sync_evaluation_to_co_mapper │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Map Questions to COs         │
    │ Q1 (5 marks) → CO1           │
    │ Q2 (4 marks) → CO1           │
    │ Q3 (3 marks) → CO2           │
    │ Q4 (6 marks) → CO2           │
    │ Q5 (7 marks) → CO3           │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Save to CO Mapper            │
    │ Table: co_student_answer_    │
    │        marks                 │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ ✅ SYNC COMPLETE             │
    │ Student marks now visible    │
    │ in CO Mapper section         │
    └──────────────────────────────┘


┌─────────────────────────────────────────────────────────────────────────┐
│                      REPORTING PHASE                                     │
└─────────────────────────────────────────────────────────────────────────┘

    ┌──────────────────┐
    │   CO Mapper      │
    │   Section        │
    └────────┬─────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ View Completed Students      │
    │ - Student list with marks    │
    │ - CO-wise performance        │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────┐
    │ Download Excel Report        │
    └────────┬─────────────────────┘
             │
             ▼
    ┌──────────────────────────────────────────────────────────┐
    │ Excel Format:                                             │
    │ ┌────────┬──────────┬─────────────────┬─────────────────┐│
    │ │ Reg No │   Name   │ CO1 (Q1,Q2,Tot) │ CO2 (Q3,Q4,Tot) ││
    │ ├────────┼──────────┼─────────────────┼─────────────────┤│
    │ │21CSE001│ John Doe │  5   4    9     │  3   6    9     ││
    │ │21CSE002│ Jane Doe │  7   8   15     │  5   7   12     ││
    │ └────────┴──────────┴─────────────────┴─────────────────┘│
    └──────────────────────────────────────────────────────────┘
```

## Database Schema Relationships

```
┌─────────────────────┐
│   co_templates      │  (Subject with CO mapping)
│  - id               │
│  - name             │
│  - ia               │
│  - teacher_id       │
└──────────┬──────────┘
           │
           │ 1:N
           │
           ▼
┌─────────────────────┐
│ co_question_        │  (Question → CO mapping)
│ mappings            │
│  - q_no             │
│  - co_no            │
│  - template_id      │
└─────────────────────┘


┌─────────────────────┐
│ evaluation_schemas  │  (Answer key PDF)
│  - id               │
│  - template_id      │◄─────┐
│  - pdf_path         │      │
└──────────┬──────────┘      │
           │                 │
           │ 1:N             │ Links to
           │                 │ CO Template
           ▼                 │
┌─────────────────────┐      │
│ student_evaluation_ │      │
│ progress            │      │
│  - id               │      │
│  - schema_id        │      │
│  - student_reg_no   │      │
└──────────┬──────────┘      │
           │                 │
           │ 1:N             │
           │                 │
           ▼                 │
┌─────────────────────┐      │
│ student_answer_     │      │
│ evaluations         │      │
│  - progress_id      │      │
│  - question_no      │      │
│  - mark_score       │      │
│  - feedback         │      │
└──────────┬──────────┘      │
           │                 │
           │ SYNC            │
           │ (Automatic)     │
           │                 │
           ▼                 │
┌─────────────────────┐      │
│ co_student_answer_  │      │
│ marks               │      │
│  - question_no      │      │
│  - mark             │      │
│  - regno            │      │
│  - template_id      │──────┘
│  - ia_id            │
└─────────────────────┘
```

## Key Integration Points

### 1. Template Linking
```
Evaluation Schema → template_id → CO Template
```
This links the answer key to the CO mapping.

### 2. Question Mapping
```
Question Number → co_question_mappings → CO Number
```
Each question is mapped to its respective CO.

### 3. Automatic Sync
```
student_answer_evaluations → sync_evaluation_to_co_mapper() → co_student_answer_marks
```
Evaluation results automatically populate CO Mapper.

### 4. Excel Generation
```
co_student_answer_marks + co_question_mappings + student_info → Excel Report
```
Comprehensive report with student names and CO-wise marks.

## Data Flow Example

### Input: Student Answer Sheet Evaluation
```json
{
  "student_reg_no": "21CSE001",
  "evaluations": [
    {"question_no": "1", "mark_score": 5, "total_mark": 10},
    {"question_no": "2", "mark_score": 4, "total_mark": 10},
    {"question_no": "3", "mark_score": 3, "total_mark": 10},
    {"question_no": "4", "mark_score": 6, "total_mark": 10},
    {"question_no": "5", "mark_score": 7, "total_mark": 10}
  ]
}
```

### Processing: Map to COs
```
Q1 (5 marks) → CO1
Q2 (4 marks) → CO1
Q3 (3 marks) → CO2
Q4 (6 marks) → CO2
Q5 (7 marks) → CO3
```

### Output: CO Mapper Entries
```
regno: 21CSE001, question_no: 1, mark: 5, template_id: 45, ia_id: 1
regno: 21CSE001, question_no: 2, mark: 4, template_id: 45, ia_id: 1
regno: 21CSE001, question_no: 3, mark: 3, template_id: 45, ia_id: 1
regno: 21CSE001, question_no: 4, mark: 6, template_id: 45, ia_id: 1
regno: 21CSE001, question_no: 5, mark: 7, template_id: 45, ia_id: 1
```

### Excel Output:
```
| Reg No   | Name     | CO1 (Q1, Q2, Total) | CO2 (Q3, Q4, Total) | CO3 (Q5, Total) |
|----------|----------|---------------------|---------------------|-----------------|
| 21CSE001 | John Doe | 5    4    9         | 3    6    9         | 7    7          |
```

## Success Indicators

✅ Console shows: "✅ SYNC COMPLETED: X marks added to CO Mapper"
✅ Student appears in CO Mapper "Completed Students" list
✅ Excel download includes student with marks
✅ API response includes: `"co_mapper_synced": true`
