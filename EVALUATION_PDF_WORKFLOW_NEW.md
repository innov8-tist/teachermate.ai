# Evaluation PDF Workflow - Native Implementation

## Overview
The evaluation feature now uses **native PDF rendering** with interactive cropping. Users can see the actual PDF content while selecting answer sections for each question.

## Architecture: Native PDF Rendering (Option A)

### Technology Stack
- **Frontend**: React Native + Expo
- **PDF Rendering**: `react-native-pdf` (native rendering, NOT WebView)
- **Gestures**: `react-native-gesture-handler` + `react-native-reanimated`
- **Backend**: FastAPI + PyMuPDF (fitz) for server-side cropping

### Key Features
✅ Native PDF rendering with `react-native-pdf`
✅ Real-time interactive crop rectangle overlay
✅ Draggable and resizable crop area with corner handles
✅ Percentage-based crop coordinates (0-100)
✅ Multi-page PDF support with page navigation
✅ Visual feedback (dimmed overlay, teal crop border)
✅ Backend PDF cropping at 300 DPI
✅ No placeholders or blind cropping

## User Flow

### 1. Upload Answer Schema
**Screen**: `UploadSchemaScreen`
- User selects subject from dropdown
- User uploads PDF via document picker
- PDF is stored locally with URI
- Navigate to Attach Images screen

### 2. Attach Images to Questions
**Screen**: `AttachImagesScreen`
- Shows list of questions (Q1, Q2a, Q2b, etc.)
- Each question has a "+" button to add cropped sections
- Shows preview of cropped sections (up to 2 visible)
- Displays page number for each cropped section

### 3. Crop PDF Section
**Screen**: `PDFCropperScreen`

**Step 1: View PDF**
- PDF renders natively using `react-native-pdf`
- User can scroll through pages
- Page indicator shows current page / total pages

**Step 2: Start Cropping**
- User taps "Start Cropping" button
- Crop rectangle overlay appears on PDF
- Default crop area: 80% width, 30% height, centered

**Step 3: Adjust Crop Area**
- **Move**: Drag the crop rectangle to reposition
- **Resize**: Drag corner handles to resize
- **Constraints**: 
  - Minimum size: 50px
  - Bounded within PDF dimensions
  - Cannot exceed page boundaries

**Step 4: Confirm Crop**
- User taps "Confirm" button
- Crop coordinates saved as percentages (0-100)
- Returns to Attach Images screen
- Cropped section added to question

### 4. Submit Schema
- User reviews all cropped sections
- Taps "Submit" button
- Crop metadata sent to backend
- Backend performs actual PDF cropping at 300 DPI
- Cropped images stored for evaluation

## Data Models

### CropRect
```typescript
interface CropRect {
  x: number;        // percentage 0-100
  y: number;        // percentage 0-100
  width: number;    // percentage 0-100
  height: number;   // percentage 0-100
}
```

### CroppedSection
```typescript
interface CroppedSection {
  questionId: string;
  pdfUri: string;
  pageNumber: number;
  crop: CropRect;
  timestamp: number;
}
```

### Question
```typescript
interface Question {
  id: string;
  label: string;
  images: string[];
  croppedSections?: CroppedSection[];
}
```

## File Structure

### Frontend Files
```
app/
├── screens/evaluation/
│   ├── pdf-cropper-screen.tsx       # NEW: Native PDF cropper
│   ├── attach-images-screen.tsx     # UPDATED: Crop integration
│   ├── upload-schema-screen.tsx     # UPDATED: PDF upload
│   ├── evaluation-home.tsx          # Existing
│   └── evaluation-screen.tsx        # Existing
├── app/(tabs)/
│   └── index.tsx                    # UPDATED: Navigation
└── package.json                     # Dependencies already installed
```

### Backend Files
```
backend/
├── routes/
│   └── evaluation.py                # NEW: Evaluation endpoints
├── public/
│   ├── evaluation_pdfs/             # NEW: Uploaded PDFs
│   └── evaluation_crops/            # NEW: Cropped images
└── server.py                        # UPDATED: Mount routes
```

## API Endpoints

### POST /api/evaluation/upload-schema-pdf
Upload answer schema PDF

**Request**:
- `subject`: string (form data)
- `pdf_file`: PDF file (multipart)

**Response**:
```json
{
  "success": true,
  "pdf_id": "uuid",
  "pdf_uri": "/public/evaluation_pdfs/{uuid}.pdf",
  "page_count": 5,
  "subject": "MSS - IA 1",
  "teacher_id": 1
}
```

### POST /api/evaluation/crop-pdf-section
Crop a section from PDF page

**Request**:
```json
{
  "pdf_uri": "/public/evaluation_pdfs/{uuid}.pdf",
  "page_number": 1,
  "x": 10.5,
  "y": 20.3,
  "width": 80.0,
  "height": 30.0
}
```

**Response**:
```json
{
  "success": true,
  "crop_id": "uuid",
  "crop_uri": "/public/evaluation_crops/{uuid}.png",
  "width": 2400,
  "height": 900
}
```

### POST /api/evaluation/submit-answer-schema
Submit complete answer schema

**Request**:
- `subject`: string
- `pdf_id`: string
- `questions_data`: JSON string of questions with crop data

**Response**:
```json
{
  "success": true,
  "message": "Answer schema submitted successfully",
  "schema_id": "uuid",
  "subject": "MSS - IA 1",
  "question_count": 8,
  "teacher_id": 1
}
```

## Implementation Details

### PDFCropperScreen Components

**1. PDF Viewer**
- Uses `react-native-pdf` component
- Renders PDF natively (not in WebView)
- Supports horizontal paging
- Tracks current page number

**2. Crop Overlay**
- Rendered above PDF using absolute positioning
- Only visible when cropping mode is active
- Consists of:
  - Dimmed overlays (4 sections around crop area)
  - Crop rectangle with dashed border
  - 4 corner handles for resizing

**3. Gesture Handlers (Reanimated v4 API)**
- **Pan Gesture**: Move crop rectangle using `Gesture.Pan()`
- **Corner Gestures**: Resize from each corner using `Gesture.Pan()`
- All gestures use `GestureDetector` wrapper
- Worklet functions for smooth 60 FPS performance
- All gestures constrained within PDF bounds
- Minimum crop size enforced (50px)

**4. Coordinate System**
- Display coordinates: Pixels on screen
- Storage coordinates: Percentages (0-100)
- Conversion happens on confirm
- Backend scales percentages to actual PDF dimensions

### Backend PDF Processing

**1. PDF Upload**
- Validates PDF file type
- Generates unique ID
- Stores in `public/evaluation_pdfs/`
- Returns page count using PyMuPDF

**2. PDF Cropping**
- Opens PDF with PyMuPDF (fitz)
- Renders page at 300 DPI (high quality)
- Converts percentage coordinates to pixels
- Crops using PIL (Pillow)
- Saves as PNG in `public/evaluation_crops/`

**3. Image Quality**
- Rendering: 300 DPI (4.17x scale from 72 DPI)
- Format: PNG (lossless)
- Color: RGB
- Typical size: 2000-3000px width

## UX Considerations

### Visual Feedback
- Crop rectangle: Teal (#14B8A6) dashed border
- Corner handles: Teal circles with white border
- Dimmed overlay: Black with 50% opacity
- Active state: Smooth animations with spring physics

### Constraints
- Minimum crop size: 50px (prevents tiny crops)
- Boundary enforcement: Cannot drag outside PDF
- Page preservation: Scroll position maintained
- Validation: Alerts for invalid crops (<5% area)

### Accessibility
- Large touch targets (24px corner handles)
- Clear visual hierarchy
- Descriptive button labels
- Page number indicator

## Testing Checklist

### Frontend
- [ ] PDF uploads successfully
- [ ] PDF renders correctly on screen
- [ ] Crop rectangle appears on "Start Cropping"
- [ ] Crop rectangle can be moved by dragging
- [ ] Corner handles resize crop area
- [ ] Crop stays within PDF bounds
- [ ] Minimum size enforced
- [ ] Confirm saves crop data
- [ ] Back navigation works correctly
- [ ] Multiple crops per question
- [ ] Crop preview shows page number

### Backend
- [ ] PDF upload endpoint works
- [ ] PDF stored correctly
- [ ] Page count returned accurately
- [ ] Crop endpoint processes coordinates
- [ ] Cropped image saved at 300 DPI
- [ ] Cropped image accessible via URL
- [ ] Submit endpoint stores schema
- [ ] Authentication required for all endpoints

### Integration
- [ ] End-to-end workflow completes
- [ ] Crop coordinates accurate
- [ ] Multiple questions supported
- [ ] Multiple crops per question
- [ ] Submit sends all data correctly
- [ ] Error handling works

## Known Limitations

1. **PDF Size**: Large PDFs (>50MB) may be slow to render
2. **Memory**: Multiple high-res pages may use significant memory
3. **Platform**: Requires EAS Dev Client (not Expo Go)
4. **Network**: PDF upload requires stable connection

## Future Enhancements

1. **Auto-crop**: ML-based question detection
2. **Zoom**: Pinch-to-zoom for precise cropping
3. **Rotation**: Rotate crop rectangle
4. **Templates**: Save crop templates for reuse
5. **Batch**: Crop multiple questions at once
6. **Preview**: Show actual cropped image before confirm
7. **Undo/Redo**: Crop history management

## Migration from Old Implementation

### Removed
- ❌ Placeholder-based cropping
- ❌ Blind coordinate cropping
- ❌ Fixed ratio cropping (25%-80%, 35%-100%)
- ❌ Grey box placeholders
- ❌ Manual image uploads for schema
- ❌ `useImagePicker` for schema upload

### Added
- ✅ Native PDF rendering
- ✅ Interactive crop tool
- ✅ Percentage-based coordinates
- ✅ Real-time visual feedback
- ✅ Backend PDF cropping
- ✅ Multi-page support

### Updated
- 🔄 `AttachImagesScreen`: Now opens cropper instead of image picker
- 🔄 `UploadSchemaScreen`: Now includes PDF upload
- 🔄 `index.tsx`: Added PDF cropper navigation
- 🔄 Question model: Added `croppedSections` field

## Dependencies

All required dependencies are already installed:
- `react-native-pdf`: ^7.0.3
- `react-native-gesture-handler`: ~2.28.0
- `react-native-reanimated`: ~4.1.1
- `expo-dev-client`: ~6.0.20
- `expo-document-picker`: ~14.0.8

Backend dependencies:
- `PyMuPDF` (fitz): PDF manipulation
- `Pillow`: Image processing
- `FastAPI`: API framework

## Running the App

### Development
```bash
# Frontend (requires EAS Dev Client)
cd app
npx expo start --dev-client

# Backend
cd backend
./start_server.sh
```

### Building
```bash
# Create development build
cd app
eas build --profile development --platform android
```

## Conclusion

This implementation provides a professional, trustworthy PDF cropping experience that scales to student answer sheet cropping. The native rendering ensures users can see exactly what they're cropping, eliminating guesswork and improving accuracy.
