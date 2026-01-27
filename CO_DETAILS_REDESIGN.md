# CO Details Screen Redesign

## Overview
Redesigned the CO Details screen with a modern black theme inspired by the provided mockup. The new design includes evaluation progress tracking and integrated answer sheet upload functionality.

## New Features

### 1. **Modern Card-Based Layout**
- Large subject name display (48px bold)
- Assessment and semester metadata
- Clean, minimalist design with proper spacing

### 2. **Mapping Stats Section**
- Shows total number of questions mapped
- Shows total number of unique COs
- Large, colorful numbers (indigo blue) for visual impact

### 3. **Evaluation Progress Tracker**
- Progress bar showing completion percentage
- Displays "X/Y students" completed
- Shows percentage done
- Green progress fill color
- Fetches actual student count from database

### 4. **Upload Button (Green)**
- Mint green background (#d1fae5)
- Opens image picker modal
- Options: Take Picture or Choose from Gallery
- Identical functionality to Student Sheet Scanner
- Processes answer sheets and saves to database

### 5. **Results Button (Purple)**
- Light purple background (#f3e8ff)
- Purple text (#9333ea)
- Navigates to Completed Students screen
- Shows all students who have submitted answer sheets

### 6. **Processing Modal**
- Shows upload progress
- Visual step indicators (Upload → Segment → Map COs → Save)
- Loading animation
- Processing time estimate (30-60 seconds)

## Technical Implementation

### Frontend Changes

#### 1. **CO Details Screen** (`app/screens/co-mapper/co-details-screen.tsx`)
- Added image picker integration
- Added student count fetching
- Added progress calculation
- Added upload modal
- Added processing modal
- Integrated with answer sheet upload API

#### 2. **CO Mapper Container** (`app/screens/co-mapper/co-mapper-container.tsx`)
- Updated to pass `onViewCompletedStudents` prop to CO Details screen
- Maintains navigation state between screens

#### 3. **CO Service** (`app/services/api/co-service.ts`)
- Added `fetchCOWithStudentCount` method
- Returns student_count along with other CO info

### Backend Changes

#### 1. **Database Service** (`backend/db_operation/db_server.py`)
- Updated `get_subject_info` method to include `student_count`
- Returns: name, ia, branch, sem, student_count

## User Flow

1. **View CO Details**
   - User clicks on a CO from "My COs" list
   - Sees subject name, assessment type, semester
   - Sees mapping stats (questions, COs)
   - Sees evaluation progress

2. **Upload Answer Sheet**
   - User clicks "Upload" button
   - Modal appears with two options:
     - Take Picture (camera)
     - Choose from Gallery
   - User selects image
   - Processing modal shows progress
   - Answer sheet is analyzed and saved
   - Progress bar updates automatically

3. **View Results**
   - User clicks "Results" button
   - Navigates to Completed Students screen
   - Shows list of all students who submitted
   - Can view individual student marks

## Design Specifications

### Colors
- **Background**: White (#ffffff)
- **Text Primary**: Black (#000)
- **Text Secondary**: Gray (#999)
- **Stat Numbers**: Indigo (#6366f1)
- **Progress Bar Background**: Light Gray (#e5e7eb)
- **Progress Fill**: Green (#10b981)
- **Upload Button**: Mint Green (#d1fae5)
- **Results Button**: Light Purple (#f3e8ff)
- **Results Text**: Purple (#9333ea)

### Typography
- **Subject Name**: 48px, Bold, -1 letter spacing
- **Section Titles**: 12px, Bold, Uppercase, 1.5 letter spacing
- **Stat Numbers**: 40px, Bold
- **Stat Labels**: 18px, Regular
- **Progress Text**: 16px, Bold
- **Button Text**: 16px, Bold

### Spacing
- **Content Padding**: 20px horizontal, 24px vertical
- **Section Margins**: 32px bottom
- **Button Margins**: 12px between buttons

## API Endpoints Used

1. **GET** `/co_subject_info/{subject_id}` - Fetch CO info with student count
2. **GET** `/students_by_subject/{subject_id}` - Fetch completed students
3. **POST** `/student_sheet_upload` - Upload and process answer sheet

## Benefits

1. **Better UX**: Clean, modern interface with clear visual hierarchy
2. **Progress Tracking**: Teachers can see evaluation progress at a glance
3. **Integrated Upload**: No need to switch to Student Sheet screen
4. **Quick Access**: Direct navigation to results
5. **Visual Feedback**: Progress bar and percentage provide instant feedback
6. **Consistent Design**: Matches the overall app theme

## Testing Checklist

- [ ] CO details load correctly
- [ ] Stats display accurate numbers
- [ ] Progress bar calculates correctly
- [ ] Upload button opens image picker
- [ ] Camera option works
- [ ] Gallery option works
- [ ] Answer sheet processing works
- [ ] Progress updates after upload
- [ ] Results button navigates correctly
- [ ] Completed students screen shows data
