# Expo Go PDF Fix - Complete Solution

## Problem
The app was crashing on physical devices with the error:
```
Invariant Violation: Your JavaScript code tried to access a native module that doesn't exist.
```

This happened because:
1. `react-native-pdf` requires native modules not available in Expo Go
2. The PDF file URI was being passed directly from document picker to the cropper
3. Multiple hardcoded localhost/10.0.2.2 URLs throughout the codebase

## Solution Implemented

### 1. Backend Changes (`backend/routes/evaluation.py`)

Added new endpoint to convert PDF pages to images:

```python
@router.get("/pdf-images/{pdf_id}")
async def get_pdf_images(pdf_id: str):
    """
    Convert PDF pages to images and return URLs
    Caches images in public/pdf_images/{pdf_id}/
    """
```

**How it works:**
- Converts PDF pages to PNG images using PyMuPDF (fitz)
- Caches images in `public/pdf_images/{pdf_id}/page_N.png`
- Returns array of image URLs
- Reuses cached images on subsequent requests

### 2. Frontend Changes

#### A. Centralized API Configuration (`app/constants/api.ts`)
```typescript
const BASE_URL = 'http://192.168.1.4:8000';
```
All services now import from this single source.

#### B. Upload Flow (`app/screens/evaluation/upload-schema-screen.tsx`)
**Before:** Passed local file URI directly to cropper
**After:** 
1. Uploads PDF to backend via `/api/evaluation/upload-schema-pdf`
2. Receives PDF ID from backend
3. Passes PDF ID to next screen

**Changes:**
- Added `FileSystem` import for file handling
- Added upload logic with FormData
- Added loading state during upload
- Now passes `pdfId` instead of `uri` to `onSuccess`

#### C. PDF Cropper (`app/screens/evaluation/pdf-cropper-screen.tsx`)
**Before:** Used `react-native-pdf` to render PDF
**After:** 
1. Fetches page images from backend using PDF ID
2. Displays images in ScrollView
3. Maintains all cropping functionality

**Changes:**
- Removed `react-native-pdf` import
- Added `getPageImages()` helper function
- Replaced `<Pdf>` with `<ScrollView>` + `<Image>` components
- Added loading state with ActivityIndicator
- Uses centralized BASE_URL

#### D. Main Flow (`app/app/(tabs)/index.tsx`)
Updated `handleUploadSchemaSuccess` to accept PDF ID instead of URI:
```typescript
const handleUploadSchemaSuccess = (pdfId: string, subject: string) => {
  setPdfUri(pdfId); // Now this is a PDF ID, not a file URI
  setSelectedSubject(subject);
  setEvaluationSubScreen('attachImages');
};
```

#### E. Services Updated
- `app/services/api/evaluation-service.ts` - Now imports BASE_URL
- `app/services/api/co-service.ts` - Already using API_ENDPOINTS (correct)
- `app/services/api/auth-service.ts` - Already using API_ENDPOINTS (correct)

#### F. Dependencies (`app/package.json`)
Removed `react-native-pdf` dependency.

## Complete Flow

### Old Flow (Broken)
```
1. User picks PDF → Local file URI
2. Pass URI to cropper
3. Cropper tries to use react-native-pdf → CRASH
```

### New Flow (Working)
```
1. User picks PDF → Local file URI
2. Upload PDF to backend → Get PDF ID
3. Pass PDF ID to attach images screen
4. User opens cropper with PDF ID
5. Cropper fetches images from backend
6. Display images in ScrollView
7. User crops on images
8. Save crop coordinates
```

## Files Changed

### Backend
- `backend/routes/evaluation.py` - Added `/pdf-images/{pdf_id}` endpoint

### Frontend
- `app/constants/api.ts` - Already had correct BASE_URL
- `app/services/api/evaluation-service.ts` - Import BASE_URL
- `app/screens/evaluation/upload-schema-screen.tsx` - Upload PDF to backend
- `app/screens/evaluation/pdf-cropper-screen.tsx` - Use images instead of PDF
- `app/app/(tabs)/index.tsx` - Update handler to use PDF ID
- `app/package.json` - Remove react-native-pdf

## Testing Steps

1. **Install dependencies:**
   ```bash
   cd app
   npm install
   ```

2. **Start backend:**
   ```bash
   cd backend
   python server.py
   ```

3. **Start Expo:**
   ```bash
   cd app
   npm start
   ```

4. **Test on physical device:**
   - Scan QR code with Expo Go
   - Navigate to Evaluation tab
   - Tap + button
   - Select subject
   - Upload PDF
   - Wait for upload to complete
   - Add images to questions
   - Crop sections from PDF pages
   - Verify cropping works smoothly

## Benefits

✅ **Works with Expo Go** - No native modules required
✅ **Better performance** - Images are cached on backend
✅ **Consistent URLs** - Single BASE_URL configuration
✅ **Same UX** - User experience unchanged
✅ **Scalable** - Backend handles PDF processing

## Network Configuration

For physical devices, ensure:
1. Phone and computer on same WiFi network
2. `BASE_URL` in `app/constants/api.ts` uses your computer's IP
3. Backend running and accessible at that IP
4. Firewall allows connections on port 8000

To find your IP:
- **macOS/Linux:** `ifconfig | grep inet`
- **Windows:** `ipconfig`

Look for IP starting with `192.168.x.x` or `10.0.x.x`
