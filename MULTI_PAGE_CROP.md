# Multi-Page Crop Feature

## What's New

You can now crop content that spans across multiple PDF pages! The app will automatically detect if your crop area extends into multiple pages, crop each page section, and stitch them together into a single image.

## How It Works

### Frontend Detection

1. **Calculate which pages the crop spans**
   ```typescript
   // Find start page (where crop begins)
   // Find end page (where crop ends)
   // If startPage === endPage → single page crop
   // If startPage < endPage → multi-page crop
   ```

2. **For single-page crops**
   - Use existing logic
   - Send one crop request to backend

3. **For multi-page crops**
   - Calculate crop coordinates for each page
   - First page: crop from startY to bottom
   - Middle pages: crop entire height
   - Last page: crop from top to endY
   - Send all crops to backend

### Backend Stitching

1. **Receive multiple crop requests**
   ```json
   {
     "pdf_uri": "abc-123",
     "crops": [
       { "page_number": 2, "x": 10, "y": 80, "width": 80, "height": 20 },
       { "page_number": 3, "x": 10, "y": 0, "width": 80, "height": 30 }
     ]
   }
   ```

2. **Crop each page section**
   - Open PDF
   - For each crop: render page, crop section
   - Collect all cropped images

3. **Stitch vertically**
   ```python
   total_height = sum(img.height for img in cropped_images)
   stitched = Image.new('RGB', (max_width, total_height))
   
   y_offset = 0
   for img in cropped_images:
       stitched.paste(img, (0, y_offset))
       y_offset += img.height
   ```

4. **Return single image**
   - Save stitched image
   - Return URL

## Example

### Scenario: Crop spans pages 2 and 3

```
Page 2:
┌─────────────────┐
│                 │
│                 │
│  ┌───────────┐  │ ← Crop starts here (80% down page 2)
│  │           │  │
└──┼───────────┼──┘
   │           │
Page 3:
┌──┼───────────┼──┐
│  │           │  │
│  └───────────┘  │ ← Crop ends here (30% down page 3)
│                 │
│                 │
└─────────────────┘

Result: Single stitched image containing:
- Bottom 20% of page 2
- Top 30% of page 3
```

## Frontend Logic

```typescript
// Detect pages
const cropEndY = cropY.value + cropHeight.value;

// Find which pages are involved
for each page:
  if cropY starts in this page → startPage
  if cropEndY ends in this page → endPage

// Calculate crops
if (startPage === endPage):
  // Single page
  crop = { page: startPage, y: startY, height: endY - startY }
else:
  // Multi-page
  crops = [
    { page: startPage, y: startY, height: pageHeight - startY },
    { page: middlePages, y: 0, height: pageHeight },
    { page: endPage, y: 0, height: endY }
  ]
```

## Backend Logic

```python
@router.post("/crop-pdf-multi-page")
async def crop_pdf_multi_page(request):
    crops = request['crops']
    cropped_images = []
    
    # Crop each page section
    for crop in crops:
        page = doc.load_page(crop['page_number'] - 1)
        pix = page.get_pixmap(matrix=Matrix(300/72))
        img = PIL.Image(pix)
        
        # Calculate and apply crop
        cropped = img.crop((x, y, x+w, y+h))
        cropped_images.append(cropped)
    
    # Stitch vertically
    total_height = sum(img.height for img in cropped_images)
    stitched = Image.new('RGB', (max_width, total_height))
    
    y_offset = 0
    for img in cropped_images:
        stitched.paste(img, (0, y_offset))
        y_offset += img.height
    
    # Save and return
    stitched.save(output_path)
    return {"crop_uri": "/public/crops/..."}
```

## API Endpoints

### Single Page Crop
```
POST /api/evaluation/crop-pdf-section
{
  "pdf_uri": "abc-123",
  "page_number": 2,
  "x": 10.0,
  "y": 25.0,
  "width": 80.0,
  "height": 50.0
}
```

### Multi-Page Crop (NEW!)
```
POST /api/evaluation/crop-pdf-multi-page
{
  "pdf_uri": "abc-123",
  "crops": [
    {
      "page_number": 2,
      "x": 10.0,
      "y": 80.0,
      "width": 80.0,
      "height": 20.0
    },
    {
      "page_number": 3,
      "x": 10.0,
      "y": 0.0,
      "width": 80.0,
      "height": 30.0
    }
  ]
}
```

## Testing

1. **Single page crop** (should still work)
   - Position crop fully within one page
   - Click "Crop"
   - Should use single-page endpoint

2. **Two-page crop**
   - Position crop starting on page 2
   - Extend it into page 3
   - Click "Crop"
   - Should use multi-page endpoint
   - Preview shows stitched image

3. **Three-page crop**
   - Position crop starting on page 1
   - Extend through page 2
   - End on page 3
   - Should stitch all three sections

## Console Logs

### Single Page
```
🎯 Crop spans pages: 2 to 2
📄 Single page crop: 2
📏 Percentages: { x: 10.0, y: 25.0, w: 80.0, h: 50.0 }
```

### Multi-Page
```
🎯 Crop spans pages: 2 to 3
📄 Multi-page crop from page 2 to 3
📏 Multi-page crops: [
  { page_number: 2, x: 10, y: 80, width: 80, height: 20 },
  { page_number: 3, x: 10, y: 0, width: 80, height: 30 }
]
```

### Backend
```
🎯 Multi-page crop request:
  PDF URI: abc-123
  Pages: 2
  Page 2: x=10.0%, y=80.0%, w=80.0%, h=20.0%
    Cropped: (1984, 496)
  Page 3: x=10.0%, y=0.0%, w=80.0%, h=30.0%
    Cropped: (1984, 744)
✅ Stitched image size: (1984, 1240)
💾 Saved to: public/evaluation_crops/xyz-789.png
```

## Files Modified

### Frontend
- `app/screens/evaluation/pdf-cropper-screen.tsx`
  - Added multi-page detection logic
  - Split into `handleSinglePageCrop` and `handleMultiPageCrop`
  - Calculate crop coordinates for each page in span

### Backend
- `backend/routes/evaluation.py`
  - Added `/crop-pdf-multi-page` endpoint
  - Crops multiple page sections
  - Stitches images vertically
  - Returns single combined image

## Benefits

✅ **Seamless UX** - Just position markers, app handles the rest
✅ **Automatic detection** - No need to specify single vs multi-page
✅ **Clean output** - Single stitched image, not multiple files
✅ **Maintains quality** - Each page rendered at 300 DPI before stitching
✅ **Flexible** - Works for 2, 3, or more pages

## Use Cases

- Question spans two pages
- Table continues across pages
- Long text passage across multiple pages
- Diagram split across pages
- Any content that doesn't fit on one page

Perfect for your evaluation workflow! 🎯
