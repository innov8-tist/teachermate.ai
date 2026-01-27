# Student Count Feature Implementation

## Summary
Added `student_count` field to CO creation flow to track the number of students in each class.

## Changes Made

### 1. Frontend - React Native Screen
**File**: `app/screens/co-mapper/co-creation-screen.tsx`

- Added `studentCount` state variable
- Added new input field (Step 4) for entering student count
- Updated step numbers (Image Upload is now Step 5)
- Added validation for student count (must be a positive integer)
- Updated form reset to include student count
- Updated submit button disabled state to include student count check
- Added `TextInput` import from react-native

**UI Changes**:
```tsx
{/* Student Count */}
{selectedSemester && (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View style={styles.stepBadge}>
        <Text style={styles.stepNumber}>4</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.sectionTitle}>Number of Students</Text>
        <Text style={styles.sectionDesc}>Total students in this class</Text>
      </View>
    </View>
    <TextInput
      style={styles.input}
      placeholder="Enter student count (e.g., 60)"
      placeholderTextColor="#999"
      keyboardType="number-pad"
      value={studentCount}
      onChangeText={setStudentCount}
      maxLength={3}
    />
  </View>
)}
```

### 2. Frontend - Service Layer
**File**: `app/services/api/co-service.ts`

- Updated `COCreationData` interface to include `student_count: number`
- Updated `createCO` method to append student_count to FormData

```typescript
export interface COCreationData {
  subject_name: string;
  sem: string;
  ia_number: string;
  student_count: number;  // ← NEW
  co_image: {
    uri: string;
    name: string;
    type: string;
  };
}
```

### 3. Backend - Pydantic Model
**File**: `backend/models/pydanticmodel.py`

- Added `student_count: int` field to `CoCreationModel`

```python
class CoCreationModel(BaseModel):
    subject_name: str
    sem: int
    ia_number: int
    student_count: int  # ← NEW
```

### 4. Backend - API Route
**File**: `backend/server.py`

- Added `student_count: int = Form(...)` parameter to `/co_creation` endpoint
- Updated `CoCreationModel` instantiation to include student_count
- Added student_count to debug print statements
- Passed student_count to `db_service.create_co_subject()`

```python
@app.post("/co_creation")
async def co_creation(
    subject_name: str = Form(...),
    sem: int = Form(...),
    ia_number: int = Form(...),
    student_count: int = Form(...),  # ← NEW
    co_image: UploadFile = File(...),
    current_teacher: Teacher = Depends(get_current_teacher),
    db_service: DBServiceForServer = Depends(get_db_service)
):
```

### 5. Backend - Database Service
**File**: `backend/db_operation/db_server.py`

- Added `student_count: int` parameter to `create_co_subject()` method
- Updated `COTemplate` instantiation to include student_count field

```python
def create_co_subject(self, subject_name: str, sem: int, ia_number: int, 
                      student_count: int, image_path: str, teacher_id: int):
    # ...
    new_template = COTemplate(
        ia=f"IA{ia_number}",
        name=subject_name,
        branch=subject.branch,
        sem=sem,
        teacher_id=teacher_id,
        student_count=student_count,  # ← NEW
        image_path=image_path
    )
```

### 6. Database Schema
**File**: `backend/db_service/db_schema.py`

- Schema already has `student_count = Column(Integer, nullable=False)` in `COTemplate` table
- Migration already completed ✓

## Testing Checklist

- [ ] Frontend form displays student count input field
- [ ] Validation works (rejects empty, negative, or non-numeric values)
- [ ] Student count is sent to backend in FormData
- [ ] Backend receives and validates student_count
- [ ] Database saves student_count correctly
- [ ] CO creation success flow works end-to-end

## Flow Summary

1. User selects semester → subjects load
2. User selects subject
3. User selects IA (1 or 2)
4. **User enters student count** ← NEW STEP
5. User uploads CO mapping image
6. User submits → student_count saved to database

## Notes

- Student count is required (cannot be empty)
- Must be a positive integer
- Limited to 3 digits (max 999 students)
- Uses number-pad keyboard for better UX on mobile
