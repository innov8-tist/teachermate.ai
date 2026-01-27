# Individual Question Submit Feature

## Overview
Implemented individual submit buttons for each question to prevent duplicate submissions and allow granular control over when each question is processed by the AI.

## What Changed

### 1. **Individual Submit Buttons**
Each question now has its own submit button that appears when:
- The question has images attached
- The question hasn't been submitted yet
- The question is not currently processing

### 2. **Submission Tracking**
- Added `isSubmitted` flag to track which questions have been sent to the backend
- Prevents duplicate submissions of the same question
- Resets when images are removed, allowing resubmission

### 3. **Status Indicators**
Each question shows its current state:
- **Submit Button** (teal): Question has images and is ready to submit
- **Processing...** (spinner): Question is being sent to AI backend
- **Submitted** (green checkmark): Question was successfully processed
- **Retry** (red): Question submission failed - click to retry

### 4. **Done Button**
- Replaced global "Submit" button with "Done" button
- Use "Done" to close/navigate away when finished
- Each question must be submitted individually

## How It Works

1. **Add images to Question 1** → Submit button appears
2. **Click Submit button** → Only Question 1 is sent to backend
3. **Add images to Question 2** → Submit button appears for Q2
4. **Click Submit button on Q2** → Only Question 2 is sent (Q1 not duplicated)
5. **Continue for other questions** → Each submits independently
6. **Click "Done"** when all questions are submitted

## Benefits
- ✅ No duplicate submissions
- ✅ Submit questions as you complete them
- ✅ Retry failed submissions individually
- ✅ Clear visual feedback per question
- ✅ Full control over submission timing
- ✅ Prevents accidental resubmission

## Technical Details

### Modified File
- `app/screens/evaluation/attach-images-screen.tsx`

### New Features
- Added `isSubmitted` field to Question interface
- Individual `handleSubmitQuestion()` function per question
- Submit button component in question header
- Retry functionality for failed submissions
- Submission state tracking to prevent duplicates

### API Endpoint Used
- `POST /extract_answer_schema`
- Parameters: `question_no`, `subject_id`, `answer_images[]`
- **Authentication Required**: Bearer token in Authorization header
- **Called once per question** when its submit button is clicked
