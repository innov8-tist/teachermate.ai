# PDF Cropper Multi-Page Fix - Detailed Analysis

## The Real Problem

The crop tool overlay is **absolutely positioned** and doesn't scroll with the PDF content. This is actually CORRECT behavior - the crop tool should always be visible on screen. The key insight is:

- **Crop tool coordinates**: Always relative to the visible viewport (0 to SCREEN_WIDTH/HEIGHT)
- **Page selection**: Determined by scroll position (`currentPage` state)
- **Cropping logic**: Should crop the CURRENT page at the crop tool's position

## What Was Fixed

### 1. Removed Unnecessary Complexity
- Removed `pageImageDimensions` Map (not needed)
- Removed `pdfDimensions` state (not needed)
- Simplified to use constant `SCREEN_WIDTH` and `PDF_CONTAINER_HEIGHT`

### 2. Simplified Coordinate System
The crop tool is ALWAYS positioned relative to the visible viewport:
```typescript
// Crop tool bounds
cropX: 0 to SCREEN_WIDTH
cropY: 0 to PDF_CONTAINER_HEIGHT
```

### 3. Added Scroll Tracking
```typescript
const [scrollOffset, setScrollOffset] = useState(0);

onScroll={(event) => {
  const offsetY = event.nativeEvent.contentOffset.y;
  setScrollOffset(offsetY);
}}
```

### 4. Correct Crop Calculation
When cropping:
1. Get current page number from scroll position
2. Load that specific page's image
3. Calculate how that image is displayed with `resizeMode="cover"`
4. Map crop tool coordinates (viewport) to actual image coordinates
5. Apply crop

## How It Should Work Now

### Scenario: Cropping Page 2

1. **User scrolls** to page 2
   - ScrollView offset: ~PDF_CONTAINER_HEIGHT pixels
   - `currentPage` state updates to 2

2. **User positions crop tool** on visible area
   - Crop tool shows at screen position (e.g., x:50, y:100, w:300, h:200)
   - These are viewport coordinates

3. **User clicks "Crop"**
   - Gets `pageImages[currentPage - 1]` = page 2 image
   - Downloads page 2 image to local cache
   - Gets actual image dimensions (e.g., 2480x3508 pixels)

4. **Calculate display transform**
   ```
   imageAspect = 2480 / 3508 = 0.707
   containerAspect = 393 / 759 = 0.518
   
   Since imageAspect > containerAspect:
     displayHeight = 759
     displayWidth = 759 * 0.707 = 536.6
     offsetX = (536.6 - 393) / 2 = 71.8
     offsetY = 0
   
   scaleX = 2480 / 536.6 = 4.62
   scaleY = 3508 / 759 = 4.62
   ```

5. **Map crop coordinates**
   ```
   cropXPixels = (50 + 71.8) * 4.62 = 562
   cropYPixels = (100 + 0) * 4.62 = 462
   cropWidthPixels = 300 * 4.62 = 1386
   cropHeightPixels = 200 * 4.62 = 924
   ```

6. **Crop the image**
   - Crops page 2 image at (562, 462) with size 1386x924
   - Shows preview

## Debugging Steps

If it's still not working, check these console logs when cropping page 2:

```
🎯 Starting crop process...
📄 Current page: 2  <-- Should be 2, not 1
📏 Crop tool position (viewport pixels): { x: X, y: Y, width: W, height: H }
📸 Current page image URI: .../page_2.png  <-- Should be page_2
📐 Actual image size: W x H
📐 Container size: 393 x 759
📊 Display size (scaled): W x H
📊 Offset (cropped part): X x Y
📊 Scale factors: X x Y
✂️ Final crop on actual image: { originX: X, originY: Y, width: W, height: H }
```

### Key Things to Verify:

1. **Current page is correct**: `📄 Current page: 2`
2. **Correct image is loaded**: `📸 Current page image URI: .../page_2.png`
3. **Crop coordinates are reasonable**: Not negative, not larger than image

## Potential Remaining Issues

### Issue 1: Page Number Not Updating
**Symptom**: Console shows `📄 Current page: 1` even when on page 2

**Cause**: `onMomentumScrollEnd` not firing or scroll calculation wrong

**Fix**: Check if scrolling is smooth. Try adding logging:
```typescript
onMomentumScrollEnd={(event) => {
  const offsetY = event.nativeEvent.contentOffset.y;
  const page = Math.floor(offsetY / PDF_CONTAINER_HEIGHT) + 1;
  console.log('Scroll ended at:', offsetY, 'Calculated page:', page);
  setCurrentPage(Math.min(Math.max(1, page), totalPages));
}}
```

### Issue 2: Images Have Different Dimensions
**Symptom**: Page 1 crops correctly, page 2 doesn't

**Cause**: Different pages might have different dimensions or aspect ratios

**Solution**: The current code handles this! Each crop recalculates the transform for that specific page's dimensions.

### Issue 3: ResizeMode="cover" Behaving Differently
**Symptom**: Crop is offset by a consistent amount

**Cause**: The offset calculation might be wrong for your specific image dimensions

**Debug**: Check the console logs for:
- `📊 Display size (scaled)`: Should be larger than container in one dimension
- `📊 Offset (cropped part)`: Should be non-zero in one dimension only

## Alternative Approach: Use "contain" Instead of "cover"

If the issue persists, consider changing `resizeMode` to "contain":

```typescript
resizeMode="contain"  // Instead of "cover"
```

Then simplify the crop calculation:
```typescript
// For contain mode
const imageAspect = imageWidth / imageHeight;
const containerAspect = SCREEN_WIDTH / PDF_CONTAINER_HEIGHT;

let displayWidth, displayHeight, offsetX, offsetY;

if (imageAspect > containerAspect) {
  // Image is wider - width fills, height has padding
  displayWidth = SCREEN_WIDTH;
  displayHeight = SCREEN_WIDTH / imageAspect;
  offsetX = 0;
  offsetY = (PDF_CONTAINER_HEIGHT - displayHeight) / 2;
} else {
  // Image is taller - height fills, width has padding
  displayHeight = PDF_CONTAINER_HEIGHT;
  displayWidth = PDF_CONTAINER_HEIGHT * imageAspect;
  offsetX = (SCREEN_WIDTH - displayWidth) / 2;
  offsetY = 0;
}

// Crop coordinates (subtract offset for contain mode)
const cropXPixels = Math.round((cropX.value - offsetX) * scaleX);
const cropYPixels = Math.round((cropY.value - offsetY) * scaleY);
```

## Testing Checklist

- [ ] Upload a multi-page PDF (at least 3 pages)
- [ ] Crop something on page 1 - verify it works
- [ ] Scroll to page 2
- [ ] Check footer shows "Page 2 of X"
- [ ] Position crop tool on a specific area
- [ ] Click "Crop"
- [ ] Check console logs - verify page number is 2
- [ ] Check preview - should show the area you selected
- [ ] Repeat for page 3

## Files Modified
- `app/screens/evaluation/pdf-cropper-screen.tsx`
