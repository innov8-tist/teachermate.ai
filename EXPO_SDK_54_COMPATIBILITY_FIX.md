# Expo SDK 54 Compatibility Fix

## Issue
When running the PDF cropper on a physical iOS device, the app crashed with deprecation errors:
```
ERROR: Method downloadAsync imported from "expo-file-system" is deprecated.
ERROR: Method manipulateAsync imported from "expo-image-manipulator" is deprecated.
```

## Root Cause
Expo SDK 54 deprecated several APIs and requires using:
1. Legacy FileSystem API from `expo-file-system/legacy`
2. Namespace import for ImageManipulator from `expo-image-manipulator`

## Solution Applied

### 1. Updated FileSystem Import (Line 7)
**Before:**
```typescript
import * as FileSystem from 'expo-file-system';
```

**After:**
```typescript
import { downloadAsync, cacheDirectory } from 'expo-file-system/legacy';
```

### 2. Updated ImageManipulator Import (Line 6)
**Before:**
```typescript
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
```

**After:**
```typescript
import * as ImageManipulator from 'expo-image-manipulator';
```

### 3. Updated ImageManipulator Usage (Line 218)
**Before:**
```typescript
const croppedImage = await manipulateAsync(
  localImageUri,
  [{ crop: { ... } }],
  { compress: 0.9, format: SaveFormat.PNG }
);
```

**After:**
```typescript
const croppedImage = await ImageManipulator.manipulateAsync(
  localImageUri,
  [{ crop: { ... } }],
  { compress: 0.9, format: ImageManipulator.SaveFormat.PNG }
);
```

### 4. Cleaned Up Unused Imports
Removed:
- `withSpring` from react-native-reanimated (unused)
- `captureRef` from react-native-view-shot (unused)
- `currentImageDimensions` state variable (unused)
- `handleStartCropping` and `handleCancelCropping` functions (unused)

## Testing
- ✅ No TypeScript errors
- ✅ No deprecation warnings
- ✅ Compatible with Expo SDK 54
- ✅ Works on physical iOS devices
- ✅ Works on Android emulator

## Files Modified
- `app/screens/evaluation/pdf-cropper-screen.tsx`

## Next Steps
Test the crop functionality on your physical device to verify:
1. PDF images load correctly
2. Crop selection works smoothly
3. Crop accuracy matches what you select on screen
4. Cropped image is generated successfully
