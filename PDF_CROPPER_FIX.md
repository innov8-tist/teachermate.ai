# PDF Cropper Fix - Multi-Page Cropping Issue

## Problem
The PDF cropper was only cropping correctly on the first page. When cropping on subsequent pages, the crop would be applied to the wrong area of the image.

## Root Cause
The issue was in how image dimensions were being tracked and used for crop calculations:

1. **Single dimension tracking**: The code only stored dimensions from the first page (`if (index === 0)`)
2. **Global offset calculation**: Offset was calculated once and reused for all pages
3. **ResizeMode="cover" complexity**: Each page image could have different dimensions and different offsets when displayed with `resizeMode="cover"`

## The Fix

### Changes Made

1. **Per-page dimension tracking**
   - Changed from storing a single `currentImageDimensions` to a `Map<number, { width, height }>`
   - Now tracks dimensions for each page individually
   - Updated `handleImageLoad` to accept `pageIndex` parameter

2. **Dynamic offset calculation**
   - Moved offset calculation into `handleConfirm` function
   - Calculates offset fresh for the current page being cropped
   - Uses the actual current page's dimensions from the map

3. **Improved logging**
   - Added more detailed console logs showing:
     - Crop tool position in pixels
     - Container dimensions
     - Display dimensions and offsets
     - Scale factors
     - Final crop coordinates on actual image

4. **Code cleanup**
   - Removed unused imports: `withSpring`, `captureRef`
   - Removed unused functions: `handleStartCropping`, `handleCancelCropping`
   - Removed unused state: `currentImageDimensions`

## How It Works Now

### Crop Coordinate Calculation Flow

1. **User positions crop tool** on visible area (in screen pixels)
2. **On confirm**, get current page image dimensions
3. **Calculate display dimensions** based on `resizeMode="cover"`:
   - If image is wider: height fills container, width is cropped
   - If image is taller: width fills container, height is cropped
4. **Calculate offset** (the hidden part of the image)
5. **Calculate scale factors** from display size to actual image size
6. **Transform crop coordinates**:
   ```
   actualX = (cropToolX + offsetX) × scaleX
   actualY = (cropToolY + offsetY) × scaleY
   actualWidth = cropToolWidth × scaleX
   actualHeight = cropToolHeight × scaleY
   ```
7. **Apply crop** to the actual image at calculated coordinates

## Testing
To verify the fix works:
1. Upload a multi-page PDF
2. Crop a section on page 1 - should work correctly
3. Scroll to page 2 or any other page
4. Crop a section - should now crop exactly where the tool is positioned
5. Verify preview shows the correct cropped area

## Technical Details

### ResizeMode="cover" Behavior
- Image is scaled to fill the container completely
- Aspect ratio is maintained
- Excess parts are cropped (hidden)
- The visible portion is centered

### Coordinate Systems
1. **Crop Tool Coordinates**: Pixels relative to visible container (0 to SCREEN_WIDTH/HEIGHT)
2. **Display Coordinates**: Pixels of the scaled image (may be larger than container)
3. **Actual Image Coordinates**: Pixels of the original image file (highest resolution)

### Key Formula
```typescript
// For resizeMode="cover"
if (imageAspect > containerAspect) {
  // Image wider - crops left/right
  displayHeight = containerHeight
  displayWidth = containerHeight × imageAspect
  offsetX = (displayWidth - containerWidth) / 2
  offsetY = 0
} else {
  // Image taller - crops top/bottom
  displayWidth = containerWidth
  displayHeight = containerWidth / imageAspect
  offsetX = 0
  offsetY = (displayHeight - containerHeight) / 2
}

scaleX = actualImageWidth / displayWidth
scaleY = actualImageHeight / displayHeight

actualCropX = (cropToolX + offsetX) × scaleX
actualCropY = (cropToolY + offsetY) × scaleY
```

## Files Modified
- `app/screens/evaluation/pdf-cropper-screen.tsx`

## Related Issues
- First page cropping worked correctly ✅
- Other pages cropped at wrong positions ❌ → ✅ FIXED
