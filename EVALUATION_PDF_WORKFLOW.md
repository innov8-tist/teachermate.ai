# Evaluation PDF Workflow - Implementation Guide

## Overview
The evaluation feature now supports PDF upload with backend conversion to images, allowing users to select and crop sections from the PDF to attach to questions.

## Features

### Current Implementation
- ✅ PDF upload via document picker
- ✅ Backend PDF to image conversion (200 DPI)
- ✅ Page selection from grid view
- ✅ Interactive crop tool with drag-to-draw rectangle
- ✅ Visual feedback (dimmed overlay, corner handles)
- ✅ Precise cropping using `expo-image-manipulator`
- ✅ Automatic coordinate scaling for accurate crops
- ✅ Multiple images per question support
- ✅ Image removal functionality

### How Cropping Works
1. User selects a page from the grid
2. Clicks "Crop" button to enter crop mode
3. Draws a rectangle by dragging on the image
4. Rectangle shows selected area with:
   - Teal border with corner handles
   - Dimmed overlay on excluded areas
   - Dashed inner border for precision
5. Clicks "Confirm" to crop
6. System calculates scale factor between display and actual image
7. Crops at full resolution using scaled coordinates
8. Returns cropped image to attach to question

### Backend (Python/FastAPI)
- **Endpoint**: `POST /api/pdf/convert-to-images`
- **Function**: Converts uploaded PDF to PNG images at 200 DPI
- **Storage**: Images stored in `backend/public/pdf_images/{uuid}/page_X.png`
- **Response**: Returns array of image URLs

### Frontend (React Native/Expo)
- **PDF Upload**: Uses `expo-document-picker` to select PDF files
- **Image Display**: Shows converted pages in a scrollable grid
- **Selection**: Tap any page to select it
- **Integration**: Selected images attached to questions

## Workflow

1. **Upload Schema Screen**
   - User clicks "Upload Answer Schema" button
   - PDF picker opens (`expo-document-picker`)
   - Selected PDF URI stored in state
   - Navigate to Attach Images screen

2. **Attach Images Screen**
   - Shows list of questions (Q1, Q2a, Q2b, etc.)
   - Each question has image boxes and a "+" button
   - Clicking "+" opens PDF Crop screen

3. **PDF Crop Screen**
   - **Step 1: Select Page**
     - Calls backend API to convert PDF to images
     - Displays all pages in a scrollable grid
     - User taps a page to select it
   - **Step 2: Crop Area**
     - User clicks "Crop" button to enter crop mode
     - User draws a rectangle on the image by dragging
     - Rectangle shows the area to be cropped
     - Dimmed overlay shows what will be excluded
   - **Step 3: Confirm**
     - User clicks "Confirm" to crop the selected area
     - Image is cropped using `expo-image-manipulator`
     - Cropped image attached to question
     - Returns to Attach Images screen

4. **Submit**
   - User reviews all attached images
   - Clicks "Submit" button
   - Images submitted for evaluation

## Files Modified

### Frontend
- `app/constants/api.ts` - Added API_BASE_URL export and PDF_CONVERT endpoint
- `app/services/api/pdf-service.ts` - PDF conversion service
- `app/screens/evaluation/pdf-crop-screen.tsx` - Complete rewrite for backend approach
- `app/screens/evaluation/attach-images-screen.tsx` - Added onAddImageClick prop
- `app/app/(tabs)/index.tsx` - Integrated PDF workflow with state management

### Backend
- `backend/pdf_processing/pdf_to_images.py` - PDF to image conversion logic
- `backend/pdf_processing/routes.py` - FastAPI endpoint for PDF conversion
- `backend/server.py` - Mounted static file serving for pdf_images

## Testing

### Start Backend Server

**Option 1: Using the startup script (recommended)**
```bash
cd backend
./start_server.sh
```

**Option 2: Manual start**
```bash
cd backend
mkdir -p public/pdf_images public/co_image uploads/pdfs
uv run uvicorn server:app --reload --host 0.0.0.0 --port 8000
```

The startup script automatically creates necessary directories before starting the server.

### Test Backend Endpoint
```bash
curl -X POST http://localhost:8000/api/pdf/convert-to-images \
  -F "file=@path/to/test.pdf"
```

Expected response:
```json
{
  "status": "success",
  "message": "PDF converted to 5 images",
  "images": [
    "/pdf_images/{uuid}/page_1.png",
    "/pdf_images/{uuid}/page_2.png",
    ...
  ],
  "total_pages": 5
}
```

### Test Frontend
1. Start the backend server (see above)
2. Update `app/constants/api.ts` with correct IP:
   - Android emulator: `http://10.0.2.2:8000`
   - iOS simulator: `http://localhost:8000`
   - Physical device: `http://{YOUR_IP}:8000`
3. Run the app: `npm start` or `npx expo start`
4. Navigate to Evaluation tab
5. Click "+" button
6. Click "Upload Answer Schema"
7. Select a PDF file
8. Click "+" on any question
9. Wait for PDF to convert (loading indicator shown)
10. **Select a page**: Tap any page from the grid
11. **Enter crop mode**: Tap "Crop" button in header
12. **Draw crop area**: Drag your finger to draw a rectangle around the desired section
13. **Confirm crop**: Tap "Confirm" button (appears when crop area is drawn)
14. Cropped image is attached to the question
15. Repeat for other questions
16. Click "Submit" when done

### Cropping Tips
- Draw from top-left to bottom-right for best results
- The dimmed area shows what will be excluded
- Corner handles indicate the crop boundaries
- You can draw multiple times - the last rectangle is used
- Minimum crop size is 10x10 pixels
- Crop is performed at full image resolution for quality

## Dependencies

### Backend
- `pdf2image` - Already in pyproject.toml
- `poppler-utils` - System dependency (may need installation)

Install poppler on Linux:
```bash
sudo apt-get install poppler-utils
```

Install poppler on macOS:
```bash
brew install poppler
```

### Frontend
- `expo-document-picker` - Already installed
- `expo-image-manipulator` - For future cropping feature (optional)

## Future Enhancements

1. **Advanced Cropping**: 
   - Pinch-to-zoom for better precision
   - Adjustable crop handles for fine-tuning
   - Rotation support
2. **Scroll Position**: Remember last scroll position when returning to PDF
3. **Multi-select**: Allow selecting multiple areas from same page
4. **Caching**: Cache converted images to avoid re-conversion
5. **Progress**: Show conversion progress for large PDFs
6. **Undo/Redo**: Allow users to undo crop and try again
7. **Preview**: Show cropped image preview before confirming

## Troubleshooting

### Backend Issues
- **Error: "poppler not found"**: Install poppler-utils (see Dependencies)
- **Error: "Permission denied"**: Check write permissions for `public/pdf_images/`
- **Images not loading**: Verify static file mounting in `server.py`

### Frontend Issues
- **PDF not uploading**: Check network connectivity and API_BASE_URL
- **Images not displaying**: Verify backend is running and images are accessible
- **Slow conversion**: Large PDFs take time; consider adding progress indicator

## Notes

- The backend approach is more reliable than client-side PDF rendering
- Images are stored temporarily and should be cleaned up periodically
- Consider implementing image cleanup after submission
- The current implementation doesn't include actual cropping (full page selection only)
