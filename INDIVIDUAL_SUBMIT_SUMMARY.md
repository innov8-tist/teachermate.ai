# Individual Question Submit - Implementation Summary

## Problem Solved
Previously, clicking the global "Submit" button would resubmit ALL questions with images, causing duplicate entries in the database. For example:
- Submit Question 1 → Creates DB entry
- Add Question 2 and Submit → Creates entries for BOTH Q1 and Q2 (Q1 duplicated!)

## Solution
Each question now has its own submit button that only submits that specific question once.

## Visual Flow

```
┌─────────────────────────────────────┐
│ Question 1                          │
│ [Image] [Image] [+]    [Submit ✓]  │ ← Click to submit Q1 only
└─────────────────────────────────────┘

After clicking Submit on Q1:
┌─────────────────────────────────────┐
│ Question 1                          │
│ [Image] [Image] [+]  ✓ Submitted   │ ← Can't submit again
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Question 2                          │
│ [Image] [+]            [Submit ✓]  │ ← Click to submit Q2 only
└─────────────────────────────────────┘

After clicking Submit on Q2:
┌─────────────────────────────────────┐
│ Question 2                          │
│ [Image] [+]          ✓ Submitted   │ ← Q1 NOT resubmitted!
└─────────────────────────────────────┘
```

## Button States

### 1. Ready to Submit
```
┌──────────────┐
│ Submit ✓     │  (Teal button)
└──────────────┘
```
- Appears when question has images
- Not yet submitted
- Click to send to AI

### 2. Processing
```
┌──────────────┐
│ ⟳ Processing │  (Teal badge with spinner)
└──────────────┘
```
- Question is being sent to backend
- Button disabled during this time

### 3. Submitted
```
┌──────────────┐
│ ✓ Submitted  │  (Green badge)
└──────────────┘
```
- Question successfully processed
- Cannot submit again
- Permanent state (unless images removed)

### 4. Failed (Retry)
```
┌──────────────┐
│ ⚠ Retry      │  (Red button)
└──────────────┘
```
- Submission failed
- Click to retry submission
- Same question, no duplicates

## Key Features

✅ **No Duplicates**: Each question can only be submitted once
✅ **Individual Control**: Submit questions in any order
✅ **Retry Failed**: Click retry button on failed questions
✅ **Visual Feedback**: Clear status for each question
✅ **Reset on Edit**: Removing images allows resubmission
✅ **Rate Limit Friendly**: Submit at your own pace

## Code Changes

### Question Interface
```typescript
export interface Question {
  id: string;
  label: string;
  images: string[];
  croppedSections?: CroppedSection[];
  processingState?: 'idle' | 'processing' | 'success' | 'error';
  isSubmitted?: boolean; // NEW: Tracks submission status
}
```

### Submit Handler
```typescript
const handleSubmitQuestion = async (question: Question) => {
  // Check if already submitted
  if (question.isSubmitted) {
    Alert.alert('Already Submitted', 'This question has already been submitted.');
    return;
  }
  
  // Submit only this question
  await submitQuestion(question);
}
```

### Submission Tracking
```typescript
// Mark as submitted on success
const successQuestions = questions.map(q =>
  q.id === question.id 
    ? { ...q, processingState: 'success', isSubmitted: true } 
    : q
);
```

## Usage

1. Add images to any question
2. Click the **Submit** button on that question
3. Wait for "Submitted" confirmation
4. Move to next question
5. Repeat for all questions
6. Click **Done** when finished

No more duplicates! 🎉
