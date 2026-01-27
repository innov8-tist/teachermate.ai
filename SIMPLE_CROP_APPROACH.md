# Simple Crop Approach - No More Offset Calculations!

## The Problem with Previous Approach

We were trying to calculate offsets for `resizeMode="cover"` which crops parts of the image. This was complex and error-prone because:
- Different pages might have different aspect ratios
- The offset calculation had to account for which dimension was being cropped
- Small errors in calculation led to wrong crop positions

## New Simple Approach

### 1. Changed ResizeMode to "contain"
```typescript
resizeMode="contain"  // Shows full image, adds padding if needed
```

This means:
- The entire image is always visible
- No parts are cropped off
- Padding (letterboxing) is added if aspect ratios don't match
- Much simpler to reason about

### 2. Direct Percentage Mapping

The crop tool position is converted to percentages of the viewport, then applied directly to the actual image:

```typescript
// Crop tool is at position (100, 200) with size (300, 400)
// Viewport is 393 x 759

cropXPercent = 100 / 393 = 25.4%
cropYPercent = 200 / 759 = 26.3%
cropWidthPercent = 300 / 393 = 76.3%
cropHeightPercent = 400 / 759 = 52.7%

// Apply to actual image (e.g., 2480 x 3508)
cropXPixels = 25.4% * 2480 = 630
cropYPixels = 26.3% * 3508 = 923
cropWidthPixels = 76.3% * 2480 = 1892
cropHeightPixels = 52.7% * 3508 = 1849
```

### 3. No Offset Calculations Needed!

Since `resizeMode="contain"` shows the full image:
- What you see is what you get
- Crop tool position directly maps to image position
- Works the same on every page

## How It Works

1. **User positions crop tool** on visible area
2. **Calculate percentages** of viewport
3. **Apply percentages** to actual image dimensions
4. **Crop** at those coordinates

## Trade-offs

### Pros ✅
- Much simpler logic
- Works consistently across all pages
- Easy to debug
- No complex offset calculations

### Cons ⚠️
- Images might have padding (letterboxing) if aspect ratio doesn't match
- Slightly less screen space used for the image

## Visual Difference

### Before (resizeMode="cover"):
```
┌─────────────────┐
│█████████████████│  Image fills entire container
│█████████████████│  Excess is cropped off
│█████████████████│
│█████████████████│
└─────────────────┘
```

### After (resizeMode="contain"):
```
┌─────────────────┐
│                 │  Padding (if needed)
│█████████████████│  Full image visible
│█████████████████│  
│                 │  Padding (if needed)
└─────────────────┘
```

## Testing

1. Upload a multi-page PDF
2. Crop on page 1 - should work
3. Scroll to page 2
4. Crop on page 2 - should now work correctly!
5. Check console logs:
   ```
   📄 Current page: 2
   📏 Crop tool position (viewport pixels): { x: 100, y: 200, width: 300, height: 400 }
   📊 Crop percentages: { x: 25.4%, y: 26.3%, width: 76.3%, height: 52.7% }
   ✂️ Final crop on actual image: { originX: 630, originY: 923, width: 1892, height: 1849 }
   ```

## If You Want to Go Back to "cover"

If you really need `resizeMode="cover"` (no padding), we need to:
1. Measure the actual displayed image bounds on screen
2. Calculate which parts are hidden
3. Adjust crop coordinates accordingly

But the "contain" approach should work perfectly for your use case!

## Files Modified
- `app/screens/evaluation/pdf-cropper-screen.tsx`
  - Changed `resizeMode` from "cover" to "contain"
  - Simplified crop calculation to use direct percentage mapping
  - Removed complex offset calculations
