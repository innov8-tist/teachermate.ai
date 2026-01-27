# Backend Crop Solution - The Right Way!

## The Problem

We were trying to do complex coordinate transformations on the frontend with different `resizeMode` settings, offset calculations, and image dimension tracking. This was error-prone and inconsistent across pages.

## The Solution

**Let the backend handle the cropping!** The frontend just sends crop coordinates as percentages, and the backend does all the heavy lifting.

## How It Works

### Frontend (React Native)

1. **Display PDF pages as images** (already converted by backend)
   - Uses `resizeMode="contain"` for simplicity
   - Shows full page with padding if needed

2. **User positions crop tool** on the visible viewport
   - Crop tool coordinates are in screen pixels
   - Always relative to the visible container

3. **Convert to percentages**
   ```typescript
   cropXPercent = (cropX / SCREEN_WIDTH) * 100
   cropYPercent = (cropY / PDF_CONTAINER_HEIGHT) * 100
   cropWidthPercent = (cropWidth / SCREEN_WIDTH) * 100
   cropHeightPercent = (cropHeight / PDF_CONTAINER_HEIGHT) * 100
   ```

4. **Send to backend**
   ```typescript
   POST /api/evaluation/crop-pdf-section
   {
     pdf_uri: "pdf-id",
     page_number: 2,
     x: 25.4,        // percentage
     y: 30.2,        // percentage
     width: 50.0,    // percentage
     height: 40.0    // percentage
   }
   ```

5. **Receive cropped image URL**
   ```json
   {
     "success": true,
     "crop_uri": "/public/evaluation_crops/abc-123.png",
     "width": 1240,
     "height": 1403
   }
   ```

### Backend (Python/FastAPI)

1. **Receive crop request** with percentages and page number

2. **Open the original PDF** (not the pre-rendered images)
   ```python
   doc = fitz.open(pdf_path)
   page = doc.load_page(page_number - 1)
   ```

3. **Render page at high resolution** (300 DPI)
   ```python
   mat = fitz.Matrix(300/72, 300/72)
   pix = page.get_pixmap(matrix=mat)
   ```

4. **Convert percentages to pixels**
   ```python
   crop_x = int((x_percent / 100) * img_width)
   crop_y = int((y_percent / 100) * img_height)
   crop_width = int((width_percent / 100) * img_width)
   crop_height = int((height_percent / 100) * img_height)
   ```

5. **Crop the image**
   ```python
   cropped_img = img.crop((
       crop_x,
       crop_y,
       crop_x + crop_width,
       crop_y + crop_height
   ))
   ```

6. **Save and return URL**
   ```python
   cropped_img.save(crop_path, "PNG")
   return {"crop_uri": f"/public/evaluation_crops/{filename}"}
   ```

## Why This Works

### ✅ Advantages

1. **Single source of truth**: Backend always works with the original PDF
2. **Consistent rendering**: Backend renders at 300 DPI consistently
3. **No coordinate transformation issues**: Simple percentage mapping
4. **Works on any page**: No special cases or offset calculations
5. **Better quality**: Backend can render at higher resolution
6. **Simpler frontend**: Just send percentages, receive image URL

### 🎯 Key Insight

The frontend doesn't need to know about:
- Actual PDF dimensions
- Image aspect ratios
- Offset calculations
- ResizeMode complexities

It just needs to:
1. Show the page
2. Let user select area (as % of viewport)
3. Send percentages to backend
4. Display result

## Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│ Frontend (React Native)                                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Display PDF page image (contain mode)                   │
│     ┌──────────────────────┐                                │
│     │                      │                                │
│     │  ┌──────────────┐   │                                │
│     │  │ Crop Tool    │   │  User positions crop tool      │
│     │  │   (50%, 30%) │   │                                │
│     │  └──────────────┘   │                                │
│     │                      │                                │
│     └──────────────────────┘                                │
│                                                              │
│  2. Convert to percentages                                  │
│     x: 25%, y: 30%, width: 50%, height: 40%                │
│                                                              │
│  3. Send to backend                                         │
│     POST /api/evaluation/crop-pdf-section                   │
│     { page: 2, x: 25, y: 30, width: 50, height: 40 }       │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Backend (Python/FastAPI)                                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Open original PDF                                       │
│     doc = fitz.open("original.pdf")                         │
│     page = doc.load_page(1)  # Page 2 (0-indexed)          │
│                                                              │
│  2. Render at 300 DPI                                       │
│     pix = page.get_pixmap(matrix=Matrix(300/72))           │
│     img = PIL.Image(pix)  # 3508 x 4961 pixels             │
│                                                              │
│  3. Calculate crop coordinates                              │
│     crop_x = 25% * 3508 = 877                              │
│     crop_y = 30% * 4961 = 1488                             │
│     crop_w = 50% * 3508 = 1754                             │
│     crop_h = 40% * 4961 = 1984                             │
│                                                              │
│  4. Crop image                                              │
│     cropped = img.crop((877, 1488, 2631, 3472))            │
│                                                              │
│  5. Save and return                                         │
│     cropped.save("crops/abc-123.png")                       │
│     return { "crop_uri": "/public/crops/abc-123.png" }     │
│                                                              │
└──────────────────────┬───────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│ Frontend displays cropped image                             │
│                                                              │
│  ┌──────────────────────┐                                   │
│  │                      │                                   │
│  │  Cropped Section     │                                   │
│  │  (Preview)           │                                   │
│  │                      │                                   │
│  └──────────────────────┘                                   │
│                                                              │
│  [Cancel]  [Confirm Crop]                                   │
└─────────────────────────────────────────────────────────────┘
```

## Testing

1. **Start backend** (make sure it's running)
   ```bash
   cd backend
   python server.py
   ```

2. **Upload a multi-page PDF**

3. **Crop on page 1**
   - Position crop tool
   - Click "Crop"
   - Check backend logs:
     ```
     🎯 Crop request received:
       PDF URI: abc-123
       Page: 1
       Crop %: x=25.0, y=30.0, w=50.0, h=40.0
     📄 Looking for PDF: public/evaluation_pdfs/abc-123.pdf
     📖 Loaded page 1 (0-indexed: 0)
     📐 Rendered page size: 3508 x 4961
     ✂️ Crop coordinates (pixels): x=877, y=1488, w=1754, h=1984
     ✅ Cropped image size: (1754, 1984)
     💾 Saved to: public/evaluation_crops/xyz-789.png
     ```

4. **Scroll to page 2**
   - Check footer shows "Page 2 of X"

5. **Crop on page 2**
   - Position crop tool
   - Click "Crop"
   - Check backend logs show **Page: 2**
   - Preview should show correct area

## Debugging

If cropping is still wrong:

1. **Check frontend logs**:
   ```
   🎯 Sending crop request to backend...
   📄 Page: 2  <-- Should match the page you're on
   📏 Crop percentages: { x: 25, y: 30, width: 50, height: 40 }
   ```

2. **Check backend logs**:
   ```
   🎯 Crop request received:
     Page: 2  <-- Should match frontend
   📖 Loaded page 2 (0-indexed: 1)  <-- Should be correct page
   ```

3. **Verify page number is correct**:
   - Frontend `currentPage` state
   - Backend receives correct page number
   - Backend loads correct page from PDF

## Files Modified

### Frontend
- `app/screens/evaluation/pdf-cropper-screen.tsx`
  - Removed client-side image cropping
  - Added backend API call
  - Simplified to just send percentages

### Backend
- `backend/routes/evaluation.py`
  - Added detailed logging
  - Already had crop endpoint working
  - Now with better debugging output

## Next Steps

If this still doesn't work, the issue is likely:
1. **Page number not updating** - Check scroll detection
2. **Backend receiving wrong page** - Check API request
3. **PDF rendering differently** - Check backend PDF rendering

But this approach is fundamentally sound and should work!
