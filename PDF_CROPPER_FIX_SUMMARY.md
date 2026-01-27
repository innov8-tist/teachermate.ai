# PDF Cropper Issues & Fixes

## Issues Found
1. **PDF can't scroll** - The crop overlay is blocking scroll gestures
2. **Crop is misaligned** - The crop adjustment calculations are off

## Fixes Applied

### 1. Scrolling Fix
Changed in the ScrollView:
```typescript
// Before
pagingEnabled={true}  // This snaps to pages, making it hard to scroll

// After  
pagingEnabled={false}  // Smooth scrolling
contentContainerStyle={{ alignItems: 'center' }}  // Center images
```

### 2. Crop Overlay Pointer Events
```typescript
// The overlay should not block touches to the ScrollView
pointerEvents="box-none"  // Only children can receive touches
```

### 3. Removed Crop Adjustments
The crop adjustment pixels were causing misalignment. Now using direct coordinates:
```typescript
// Removed these adjustments:
const topReductionPixels = 15 * scaleY;
const bottomExtensionPixels = 40 * scaleY;

// Now using direct scaling:
const cropXPixels = Math.round(cropX.value * scaleX);
const cropYPixels = Math.round(cropY.value * scaleY);
const cropWidthPixels = Math.round(cropWidth.value * scaleX);
const cropHeightPixels = Math.round(cropHeight.value * scaleY);
```

### 4. Lock/Unlock Feature
- When cropping is active and NOT locked: Crop handles work, scrolling disabled
- When locked: Scrolling enabled, crop handles disabled
- Toggle with the "Lock/Unlock" button in footer

## How to Use
1. **Upload PDF** - PDF pages load as images
2. **Scroll** - Click "Lock" button to enable scrolling between pages
3. **Crop** - Click "Unlock" to enable cropping, drag handles to adjust
4. **Confirm** - Click "Crop" button to preview and confirm

## Testing
Try these scenarios:
- ✅ Scroll through multiple pages (with Lock enabled)
- ✅ Crop a section (with Lock disabled)
- ✅ Verify crop preview matches the selected area
- ✅ Confirm crop saves correctly
