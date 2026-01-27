# Expo Go PDF Cropper Fix

## Problem
`react-native-pdf` requires native modules that aren't available in Expo Go, causing the app to crash.

## Solution
Replace PDF rendering with image-based approach using the backend's existing PDF-to-image conversion.

## Changes Made

### Backend (`backend/routes/evaluation.py`)
- Added new endpoint `/api/evaluation/pdf-images/{pdf_id}` that:
  - Converts PDF pages to PNG images using PyMuPDF (fitz)
  - Caches images in `public/pdf_images/{pdf_id}/`
  - Returns array of image URLs

### Frontend (`app/screens/evaluation/pdf-cropper-screen.tsx`)
- Removed `react-native-pdf` import
- Added `getPageImages()` helper to fetch images from backend
- Replaced `<Pdf>` component with `<ScrollView>` containing `<Image>` components
- Added loading state with `ActivityIndicator`
- Maintained all cropping functionality

### Dependencies (`app/package.json`)
- Removed `react-native-pdf` dependency

## How It Works

1. **Upload PDF**: Backend stores PDF in `public/evaluation_pdfs/`
2. **Request Images**: Frontend calls `/api/evaluation/pdf-images/{pdf_id}`
3. **Convert & Cache**: Backend converts PDF pages to images (if not cached)
4. **Display**: Frontend displays images in scrollable view
5. **Crop**: User crops on images (same as before)

## Benefits

✅ Works with Expo Go (no native modules)
✅ Better performance (images cached)
✅ Same user experience
✅ No additional dependencies needed

## Next Steps

1. Run `npm install` in the `app/` directory to update dependencies
2. Restart the Expo development server
3. Test the PDF cropper screen

## Testing

```bash
cd app
npm install
npm start
```

Then connect with Expo Go and navigate to the evaluation PDF cropper screen.
