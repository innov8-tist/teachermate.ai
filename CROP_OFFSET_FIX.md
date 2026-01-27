# Crop Offset Fix - Device Independent Cropping

## The Problem
The crop is offset differently on each device because we're capturing the entire ScrollView (which contains all pages) instead of cropping the actual source image directly.

## The Solution
Crop the current page image directly using `expo-image-manipulator` instead of capturing the screen.

## Changes Needed in `handleConfirm` function

Replace the entire `handleConfirm` function (around line 141) with this:

```typescript
const handleConfirm = async () => {
  const crop = getPercentageCrop();
  
  // Validate crop
  if (crop.width < 5 || crop.height < 5) {
    Alert.alert('Invalid Crop', 'Crop area is too small. Please select a larger area.');
    return;
  }

  // Generate cropped preview by directly cropping the current page image
  try {
    console.log('🎯 Starting crop process...');
    console.log('📄 Current page:', currentPage);

    // Get the current page image URL
    const currentPageImageUri = pageImages[currentPage - 1];
    console.log('📸 Current page image:', currentPageImageUri);

    // Get the actual dimensions of the page image
    Image.getSize(currentPageImageUri, async (imageWidth, imageHeight) => {
      console.log('📐 Page image size:', imageWidth, 'x', imageHeight);
      console.log('📐 Screen dimensions:', SCREEN_WIDTH, 'x', PDF_CONTAINER_HEIGHT);
      
      // Calculate scale factors for resizeMode="cover"
      const imageAspect = imageWidth / imageHeight;
      const containerAspect = SCREEN_WIDTH / PDF_CONTAINER_HEIGHT;
      
      let displayWidth, displayHeight, offsetX, offsetY;
      
      if (imageAspect > containerAspect) {
        // Image is wider - height fills container, width is cropped
        displayHeight = PDF_CONTAINER_HEIGHT;
        displayWidth = displayHeight * imageAspect;
        offsetX = (displayWidth - SCREEN_WIDTH) / 2;
        offsetY = 0;
      } else {
        // Image is taller - width fills container, height is cropped
        displayWidth = SCREEN_WIDTH;
        displayHeight = displayWidth / imageAspect;
        offsetX = 0;
        offsetY = (displayHeight - PDF_CONTAINER_HEIGHT) / 2;
      }
      
      const scaleX = imageWidth / displayWidth;
      const scaleY = imageHeight / displayHeight;
      
      console.log('📊 Scale factors:', scaleX, 'x', scaleY);
      
      // Calculate crop coordinates on the actual image
      const cropXPixels = Math.round((cropX.value + offsetX) * scaleX);
      const cropYPixels = Math.round((cropY.value + offsetY) * scaleY);
      const cropWidthPixels = Math.round(cropWidth.value * scaleX);
      const cropHeightPixels = Math.round(cropHeight.value * scaleY);

      console.log('✂️ Crop coordinates:', {
        originX: cropXPixels,
        originY: cropYPixels,
        width: cropWidthPixels,
        height: cropHeightPixels,
      });

      try {
        // Crop the image directly
        const croppedImage = await manipulateAsync(
          currentPageImageUri,
          [
            {
              crop: {
                originX: Math.max(0, cropXPixels),
                originY: Math.max(0, cropYPixels),
                width: Math.min(cropWidthPixels, imageWidth - cropXPixels),
                height: Math.min(cropHeightPixels, imageHeight - cropYPixels),
              },
            },
          ],
          { compress: 0.9, format: SaveFormat.PNG }
        );

        console.log('✅ Cropped image created:', croppedImage.uri);
        
        setPreviewUri(croppedImage.uri);
        setShowPreview(true);
      } catch (cropError) {
        console.error('❌ Crop error:', cropError);
        Alert.alert('Error', `Failed to crop image: ${cropError}`);
      }
    }, (error) => {
      console.error('❌ Failed to get image size:', error);
      Alert.alert('Error', 'Failed to get image dimensions');
    });
  } catch (error) {
    console.error('❌ Failed to crop:', error);
    Alert.alert('Error', `Failed to crop: ${error}`);
  }
};
```

## Why This Works

1. **Direct Image Cropping**: Instead of capturing the screen, we crop the actual source image from the backend
2. **Aspect Ratio Calculation**: Properly calculates how the image is displayed with `resizeMode="cover"`
3. **Offset Compensation**: Accounts for the parts of the image that are cropped off by the cover mode
4. **Device Independent**: Works the same on all devices because we're working with the actual image dimensions

## Test It
1. Upload a PDF
2. Crop a section
3. Check the preview - it should match exactly what you selected
4. Try on different devices - should be consistent

The crop will now be accurate across all devices!
