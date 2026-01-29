# Evaluation Feature Documentation

## Overview

The evaluation feature allows teachers to upload and evaluate student answer sheets using two methods:
1. **PDF Upload**: Upload a PDF file directly in the modal and crop answer sections
2. **Camera Capture**: Take photos of answer sections directly

## New PDF Upload Flow

### Enhanced Modal Experience
When a teacher selects "Upload PDF" in the student upload modal:

1. **Automatic PDF Picker**: The PDF picker opens immediately
2. **Upload Progress**: Shows "Uploading PDF file..." with loading indicator
3. **Success State**: Displays "✓ filename.pdf" with refresh option
4. **Validation**: Continue button is disabled until PDF is successfully uploaded

### Features
- **Immediate Upload**: PDF is uploaded as soon as the method is selected
- **File Validation**: Checks file type and size (max 50MB)
- **Retry Option**: Small refresh icon to re-upload if needed
- **Visual Feedback**: Loading states and success indicators
- **Filename Display**: Shows uploaded PDF name in the answer sheet screen

## Updated Flow

1. **Evaluation List**: Teacher sees list of evaluations
2. **Upload Button**: Teacher clicks "Upload" button on an evaluation
3. **Student Modal**: Modal opens asking for:
   - Student roll number
   - Upload method selection
4. **PDF Upload** (if selected):
   - PDF picker opens automatically
   - File uploads to backend
   - Success state shows filename
5. **Answer Sheet Screen**: 
   - Shows PDF filename in header
   - PDF cropper works immediately (no additional upload needed)
6. **Image Capture**: Teacher crops sections or takes photos
7. **Submission**: Teacher submits all questions for the student

## Components

### Main Components

1. **EvaluationContainer** - Main container that manages navigation between screens
2. **EvaluationScreen** - Lists all evaluations with upload buttons
3. **StudentUploadModal** - Modal for entering student roll number and selecting upload method
4. **StudentAnswerSheetScreen** - Screen for attaching images to questions (identical to attach-images-screen)
5. **PDFCropperScreen** - Screen for cropping sections from uploaded PDFs
6. **CameraScreen** - Screen for capturing photos with camera

### Usage

```tsx
import { EvaluationHome } from './screens/evaluation';

// In your main app component
<EvaluationHome 
  onViewDetails={(evaluationId) => {
    // Handle viewing evaluation details/results
    console.log('View details for evaluation:', evaluationId);
  }}
/>
```

## Flow

1. **Evaluation List**: Teacher sees list of evaluations
2. **Upload Button**: Teacher clicks "Upload" button on an evaluation
3. **Student Modal**: Modal opens asking for:
   - Student roll number
   - Upload method (PDF or Camera)
4. **Answer Sheet Screen**: Screen identical to attach-images-screen where teacher can:
   - Add images to each question
   - Submit individual questions
5. **Image Capture**:
   - **PDF Method**: Opens PDF cropper for selecting answer sections
   - **Camera Method**: Opens camera for taking photos
6. **Submission**: Teacher submits all questions for the student

## Features

### PDF Upload Method
- Upload PDF files up to 50MB
- Multi-page PDF support
- Crop functionality with drag-and-resize handles
- Preview before confirming crop
- Automatic image stitching for multi-page crops

### Camera Method
- Native camera integration
- Photo preview and retake functionality
- Image compression and optimization
- Front/back camera switching

### Student Answer Management
- Individual question submission
- Progress tracking per question
- Image preview and removal
- Validation before submission

## API Endpoints Required

The feature expects these backend endpoints:

1. `GET /evaluation/{evaluationId}/questions` - Get questions for evaluation
2. `POST /api/evaluation/upload-pdf` - Upload PDF file
3. `GET /api/evaluation/pdf-images/{pdfId}` - Get page images from PDF
4. `POST /api/evaluation/stitch-images` - Stitch multiple image parts
5. `POST /api/evaluation/submit-student-answer` - Submit student answer

## Dependencies

- `expo-document-picker` - For PDF file selection
- `expo-camera` - For camera functionality
- `expo-image-manipulator` - For image processing
- `expo-file-system` - For file operations
- `react-native-gesture-handler` - For crop gestures
- `react-native-reanimated` - For smooth animations

## Permissions

The app requires these permissions:
- Camera access (for camera method)
- File system access (for PDF uploads)

## Error Handling

- File size validation (max 50MB for PDFs)
- File type validation (PDF only)
- Camera permission handling
- Network error handling
- Authentication validation

## Customization

You can customize:
- Maximum file size limits
- Image compression quality
- Crop area constraints
- UI colors and styling
- Validation rules