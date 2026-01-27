# Marker-Based Crop Approach - Simple & Reliable

## The New Approach

Display ALL PDF pages in one continuous scrollable view with crop markers that you can position ANYWHERE across all pages. The markers track their absolute position in the content, and we calculate which page they're on when you crop.

## How It Works

### 1. Display PDF
- All pages displayed vertically in one ScrollView
- Each page sized to fit screen width
- Natural aspect ratio maintained
- Scroll freely through all pages

### 2. Position Markers
- Crop rectangle overlay positioned absolutely
- Can be moved anywhere in the content (across pages)
- Markers track absolute Y position from top of content
- Adjusts position as you scroll (stays in place visually)

### 3. Calculate Page & Position
When you click "Crop":
```typescript
// Walk through pages to find which one contains the crop
let accumulatedHeight = 0;
for each page:
  if cropY < accumulatedHeight + pageHeight:
    targetPage = this page
    yOffsetInPage = cropY - accumulatedHeight
    break
  accumulatedHeight += pageHeight
```

### 4. Convert to Percentages
```typescript
// Get the target page dimensions
const pageDim = imageDimensions[targetPage - 1];
const displayedHeight = (SCREEN_WIDTH / pageDim.width) * pageDim.height;

// Convert to percentages relative to that page
xPercent = (cropX / SCREEN_WIDTH) * 100;
yPercent = (yOffsetInPage / displayedHeight) * 100;
widthPercent = (cropWidth / SCREEN_WIDTH) * 100;
heightPercent = (cropHeight / displayedHeight) * 100;
```

### 5. Send to Backend
```json
{
  "pdf_uri": "abc-123",
  "page_number": 2,
  "x": 25.0,
  "y": 30.0,
  "width": 50.0,
  "height": 40.0
}
```

## Key Differences from Previous Approach

### Before ❌
- Fixed viewport height per page
- Tried to track "current page" based on scroll
- Crop tool relative to viewport
- Complex page switching logic

### Now ✅
- All pages in one continuous scroll
- Crop markers track absolute position
- Calculate page from marker position
- No page switching needed!

## Visual Example

```
┌─────────────────────┐  ← Screen viewport
│                     │
│  ┌──────────────┐   │  ← Crop markers
│  │              │   │
│  │              │   │
│  └──────────────┘   │
│                     │
├─────────────────────┤  ← Page 1 ends
│                     │
│                     │  ← Page 2 starts
│                     │
│  ┌──────────────┐   │  ← Can position markers
│  │              │   │     anywhere, even across
│  │              │   │     page boundaries!
│  └──────────────┘   │
│                     │
├─────────────────────┤  ← Page 2 ends
│                     │
│                     │  ← Page 3 starts
│                     │
└─────────────────────┘
```

## Advantages

✅ **No page tracking needed** - Just absolute positions
✅ **Works across all pages** - Same logic everywhere
✅ **Visual feedback** - See exactly what you're cropping
✅ **Simple calculation** - Walk through pages to find target
✅ **Reliable** - No scroll detection issues
✅ **Flexible** - Can even crop across page boundaries (though we validate against it)

## Code Flow

```typescript
// 1. Load all pages
pageImages = await getPageImages(pdfUri);

// 2. Display in ScrollView
<ScrollView onScroll={(e) => scrollY.value = e.contentOffset.y}>
  {pageImages.map(img => <Image source={img} />)}
</ScrollView>

// 3. Overlay crop markers (adjust for scroll)
<Animated.View style={{
  top: cropY.value - scrollY.value,  // Stays in place as you scroll
  left: cropX.value,
  width: cropWidth.value,
  height: cropHeight.value
}} />

// 4. On crop, calculate page
let height = 0;
for (let i = 0; i < pages.length; i++) {
  const pageHeight = calculateHeight(pages[i]);
  if (cropY.value < height + pageHeight) {
    targetPage = i + 1;
    yInPage = cropY.value - height;
    break;
  }
  height += pageHeight;
}

// 5. Convert to percentages and send to backend
const percentages = {
  x: (cropX / SCREEN_WIDTH) * 100,
  y: (yInPage / pageHeight) * 100,
  width: (cropWidth / SCREEN_WIDTH) * 100,
  height: (cropHeight / pageHeight) * 100
};

await cropPDF(targetPage, percentages);
```

## Testing

1. **Load PDF** - All pages appear in one scroll
2. **Scroll to middle of page 2**
3. **Position crop markers** on some text
4. **Click "Crop"**
5. **Check logs**:
   ```
   🎯 Crop calculation:
     Target page: 2
     Y offset in page: 450
     Percentages: { x: 10.0, y: 25.0, w: 80.0, h: 15.0 }
   ```
6. **Backend receives**:
   ```
   Page: 2
   Crop %: x=10.0, y=25.0, w=80.0, h=15.0
   ```
7. **Preview shows** exactly what you selected!

## Why This Works

The key insight: **Don't try to track which page you're on. Let the markers track their absolute position, then calculate the page when needed.**

This is much more reliable than trying to detect scroll position and update "current page" state.

## Files Modified
- `app/screens/evaluation/pdf-cropper-screen.tsx`
  - Removed page tracking state
  - Changed to continuous scroll
  - Added absolute position tracking
  - Added page calculation logic
  - Markers adjust for scroll position

## Next Steps

Test it! The crop markers should now work consistently on any page because we're not relying on scroll detection to track the current page.
