import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, Modal, Image } from 'react-native';
import { Feather } from '@expo/vector-icons';
import Pdf from 'react-native-pdf';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const HEADER_HEIGHT = 60;
const FOOTER_HEIGHT = 80;
const PDF_CONTAINER_HEIGHT = SCREEN_HEIGHT - HEADER_HEIGHT - FOOTER_HEIGHT;

// Minimum crop size (10% of container)
const MIN_CROP_SIZE = 50;

export interface CropRect {
  x: number; // percentage 0-100
  y: number; // percentage 0-100
  width: number; // percentage 0-100
  height: number; // percentage 0-100
}

export interface CroppedSection {
  questionId: string;
  pdfUri: string;
  pageNumber: number;
  crop: CropRect;
  timestamp: number;
  previewUri?: string; // Preview thumbnail
}

interface PDFCropperScreenProps {
  pdfUri: string;
  questionId: string;
  onBack: () => void;
  onConfirm: (croppedSection: CroppedSection) => void;
}

export const PDFCropperScreen: React.FC<PDFCropperScreenProps> = ({
  pdfUri,
  questionId,
  onBack,
  onConfirm,
}) => {
  console.log('='.repeat(50));
  console.log('PDFCropperScreen mounted');
  console.log('PDF URI:', pdfUri);
  console.log('Question ID:', questionId);
  console.log('URI type:', typeof pdfUri);
  console.log('URI length:', pdfUri?.length);
  console.log('='.repeat(50));
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfDimensions, setPdfDimensions] = useState({ width: SCREEN_WIDTH, height: PDF_CONTAINER_HEIGHT });
  const [isCropping, setIsCropping] = useState(true); // Start in cropping mode by default
  const [showPreview, setShowPreview] = useState(false);
  const [previewUri, setPreviewUri] = useState<string>('');
  const [isLocked, setIsLocked] = useState(false); // Lock crop to allow scrolling

  const pdfContainerRef = useRef<View>(null);

  // Crop rectangle position and size (in pixels)
  const cropX = useSharedValue(SCREEN_WIDTH * 0.1);
  const cropY = useSharedValue(PDF_CONTAINER_HEIGHT * 0.1);
  const cropWidth = useSharedValue(SCREEN_WIDTH * 0.8);
  const cropHeight = useSharedValue(PDF_CONTAINER_HEIGHT * 0.3);

  const pdfRef = useRef<any>(null);

  // Convert pixel coordinates to percentage
  const getPercentageCrop = (): CropRect => {
    return {
      x: (cropX.value / pdfDimensions.width) * 100,
      y: (cropY.value / pdfDimensions.height) * 100,
      width: (cropWidth.value / pdfDimensions.width) * 100,
      height: (cropHeight.value / pdfDimensions.height) * 100,
    };
  };

  const handleConfirm = async () => {
    const crop = getPercentageCrop();
    
    // Validate crop
    if (crop.width < 5 || crop.height < 5) {
      Alert.alert('Invalid Crop', 'Crop area is too small. Please select a larger area.');
      return;
    }

    // Generate cropped preview
    try {
      if (pdfContainerRef.current) {
        console.log('🎯 Starting crop process...');
        console.log('📏 PDF Dimensions (state):', pdfDimensions);
        console.log('📏 Crop rectangle (pixels):', {
          x: cropX.value,
          y: cropY.value,
          width: cropWidth.value,
          height: cropHeight.value,
        });

        // Capture the entire PDF view at native resolution
        const fullImageUri = await captureRef(pdfContainerRef, {
          format: 'png',
          quality: 1,
        });

        console.log('� Full image captured:', fullImageUri);

        // Get the actual dimensions of the captured image
        Image.getSize(fullImageUri, async (capturedWidth, capturedHeight) => {
          console.log('📐 Captured image actual size:', capturedWidth, 'x', capturedHeight);
          console.log('📐 Expected container size:', pdfDimensions.width, 'x', pdfDimensions.height);
          console.log('📐 PDF_CONTAINER_HEIGHT constant:', PDF_CONTAINER_HEIGHT);
          
          // Calculate the scale factor between captured image and screen
          const scaleX = capturedWidth / pdfDimensions.width;
          const scaleY = capturedHeight / pdfDimensions.height;
          
          console.log('📊 Scale factors:', { scaleX, scaleY });
          
          // CROP ADJUSTMENT FIX: Reduce top (start lower) and extend bottom
          const topReductionPixels = 15 * scaleY; // Start 30 pixels LOWER (crop less at top)
          const bottomExtensionPixels = 40 * scaleY; // Extend downward by 30 pixels (crop more at bottom)
          
          // The crop coordinates are relative to the PDF container
          // Scale them to match the captured image resolution
          const cropXPixels = Math.round(cropX.value * scaleX);
          const cropYPixels = Math.round((cropY.value * scaleY) + topReductionPixels); // Shift Y DOWN to start lower
          const cropWidthPixels = Math.round(cropWidth.value * scaleX);
          const cropHeightPixels = Math.round((cropHeight.value * scaleY) - topReductionPixels + bottomExtensionPixels); // Reduce for top shift, extend for bottom

          console.log('✂️ Crop coordinates (scaled to image):', {
            originX: cropXPixels,
            originY: cropYPixels,
            width: cropWidthPixels,
            height: cropHeightPixels,
          });

          try {
            // Crop the image using the scaled coordinates
            const croppedImage = await manipulateAsync(
              fullImageUri,
              [
                {
                  crop: {
                    originX: cropXPixels,
                    originY: cropYPixels,
                    width: cropWidthPixels,
                    height: cropHeightPixels,
                  },
                },
              ],
              { compress: 0.8, format: SaveFormat.PNG }
            );

            console.log('✅ Cropped image created:', croppedImage.uri);
            console.log('✅ Cropped dimensions:', croppedImage.width, 'x', croppedImage.height);
            
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
      }
    } catch (error) {
      console.error('❌ Failed to capture image:', error);
      Alert.alert('Error', `Failed to capture image: ${error}`);
    }
  };

  const confirmCrop = () => {
    const crop = getPercentageCrop();
    
    const croppedSection: CroppedSection = {
      questionId,
      pdfUri,
      pageNumber: currentPage,
      crop,
      timestamp: Date.now(),
      previewUri: previewUri, // Include the preview
    };

    onConfirm(croppedSection);
  };

  const cancelPreview = () => {
    setShowPreview(false);
    setPreviewUri('');
  };

  const handleStartCropping = () => {
    setIsCropping(true);
  };

  const handleCancelCropping = () => {
    setIsCropping(false);
  };

  // Shared values for tracking gesture start positions
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  // Gesture handler for moving the crop rectangle
  const panGesture = Gesture.Pan()
    .onStart(() => {
      'worklet';
      startX.value = cropX.value;
      startY.value = cropY.value;
    })
    .onUpdate((event) => {
      'worklet';
      const newX = startX.value + event.translationX;
      const newY = startY.value + event.translationY;

      // Constrain within PDF bounds
      cropX.value = Math.max(0, Math.min(newX, pdfDimensions.width - cropWidth.value));
      cropY.value = Math.max(0, Math.min(newY, pdfDimensions.height - cropHeight.value));
    });

  // Gesture handlers for resizing corners
  const createCornerGesture = (corner: 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight') => {
    const startX = useSharedValue(0);
    const startY = useSharedValue(0);
    const startWidth = useSharedValue(0);
    const startHeight = useSharedValue(0);

    return Gesture.Pan()
      .onStart(() => {
        'worklet';
        startX.value = cropX.value;
        startY.value = cropY.value;
        startWidth.value = cropWidth.value;
        startHeight.value = cropHeight.value;
      })
      .onUpdate((event) => {
        'worklet';
        if (corner === 'topLeft') {
          const newX = startX.value + event.translationX;
          const newY = startY.value + event.translationY;
          const newWidth = startWidth.value - event.translationX;
          const newHeight = startHeight.value - event.translationY;

          if (newWidth >= MIN_CROP_SIZE && newX >= 0) {
            cropX.value = newX;
            cropWidth.value = newWidth;
          }
          if (newHeight >= MIN_CROP_SIZE && newY >= 0) {
            cropY.value = newY;
            cropHeight.value = newHeight;
          }
        } else if (corner === 'topRight') {
          const newY = startY.value + event.translationY;
          const newWidth = startWidth.value + event.translationX;
          const newHeight = startHeight.value - event.translationY;

          if (newWidth >= MIN_CROP_SIZE && startX.value + newWidth <= pdfDimensions.width) {
            cropWidth.value = newWidth;
          }
          if (newHeight >= MIN_CROP_SIZE && newY >= 0) {
            cropY.value = newY;
            cropHeight.value = newHeight;
          }
        } else if (corner === 'bottomLeft') {
          const newX = startX.value + event.translationX;
          const newWidth = startWidth.value - event.translationX;
          const newHeight = startHeight.value + event.translationY;

          if (newWidth >= MIN_CROP_SIZE && newX >= 0) {
            cropX.value = newX;
            cropWidth.value = newWidth;
          }
          if (newHeight >= MIN_CROP_SIZE && startY.value + newHeight <= pdfDimensions.height) {
            cropHeight.value = newHeight;
          }
        } else if (corner === 'bottomRight') {
          const newWidth = startWidth.value + event.translationX;
          const newHeight = startHeight.value + event.translationY;

          if (newWidth >= MIN_CROP_SIZE && startX.value + newWidth <= pdfDimensions.width) {
            cropWidth.value = newWidth;
          }
          if (newHeight >= MIN_CROP_SIZE && startY.value + newHeight <= pdfDimensions.height) {
            cropHeight.value = newHeight;
          }
        }
      });
  };

  const topLeftGesture = createCornerGesture('topLeft');
  const topRightGesture = createCornerGesture('topRight');
  const bottomLeftGesture = createCornerGesture('bottomLeft');
  const bottomRightGesture = createCornerGesture('bottomRight');

  // Animated styles
  const cropRectStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cropX.value,
    top: cropY.value,
    width: cropWidth.value,
    height: cropHeight.value,
    borderWidth: 3,
    borderColor: '#14B8A6',
    borderStyle: 'dashed',
    backgroundColor: 'transparent',
  }));

  const overlayTopStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: 0,
    width: pdfDimensions.width,
    height: cropY.value,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }));

  const overlayBottomStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: cropY.value + cropHeight.value,
    width: pdfDimensions.width,
    height: pdfDimensions.height - (cropY.value + cropHeight.value),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }));

  const overlayLeftStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: cropY.value,
    width: cropX.value,
    height: cropHeight.value,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }));

  const overlayRightStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cropX.value + cropWidth.value,
    top: cropY.value,
    width: pdfDimensions.width - (cropX.value + cropWidth.value),
    height: cropHeight.value,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }));

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={onBack} style={styles.headerButton}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Crop Answer Section</Text>
          <View style={styles.headerButton} />
        </View>

        {/* PDF Viewer */}
        <View style={styles.pdfContainer} ref={pdfContainerRef} collapsable={false}>
          {pdfUri ? (
            <Pdf
              trustAllCerts={false}
              source={{ uri: pdfUri }}
              style={{
                flex: 1,
                width: Dimensions.get('window').width,
                height: Dimensions.get('window').height - HEADER_HEIGHT - FOOTER_HEIGHT,
              }}
              onLoadComplete={(numberOfPages, filePath) => {
                console.log('✅ PDF loaded successfully');
                console.log('  - Pages:', numberOfPages);
                console.log('  - Path:', filePath);
                setTotalPages(numberOfPages);
                setPdfDimensions({ 
                  width: Dimensions.get('window').width, 
                  height: Dimensions.get('window').height - HEADER_HEIGHT - FOOTER_HEIGHT 
                });
              }}
              onPageChanged={(page, numberOfPages) => {
                console.log('📄 Page changed:', page, '/', numberOfPages);
                setCurrentPage(page);
              }}
              onError={(error) => {
                console.error('❌ PDF Error:', error);
                Alert.alert(
                  'PDF Error', 
                  `Failed to load PDF: ${error}`,
                  [{ text: 'Go Back', onPress: onBack }]
                );
              }}
              onPressLink={(uri) => {
                console.log('Link pressed:', uri);
              }}
              enablePaging={false}
              horizontal={false}
              spacing={0}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#666', fontSize: 16 }}>No PDF loaded</Text>
            </View>
          )}
        </View>

        {/* Crop Overlay - OUTSIDE PDF container so it doesn't scroll */}
        {isCropping && totalPages > 0 && !isLocked && (
          <View 
            style={[
              StyleSheet.absoluteFill, 
              { 
                top: HEADER_HEIGHT, 
                bottom: FOOTER_HEIGHT,
              }
            ]} 
            pointerEvents="box-none"
          >
            {/* Dimmed overlays - these don't intercept touches */}
            <Animated.View style={overlayTopStyle} pointerEvents="none" />
            <Animated.View style={overlayBottomStyle} pointerEvents="none" />
            <Animated.View style={overlayLeftStyle} pointerEvents="none" />
            <Animated.View style={overlayRightStyle} pointerEvents="none" />

            {/* Crop rectangle - only border and handles intercept touches */}
            <GestureDetector gesture={panGesture}>
              <Animated.View style={[cropRectStyle, { pointerEvents: 'box-none' }]}>
                {/* Corner handles - these are the only touchable parts */}
                <GestureDetector gesture={topLeftGesture}>
                  <Animated.View style={[styles.handle, styles.handleTopLeft]} />
                </GestureDetector>
                <GestureDetector gesture={topRightGesture}>
                  <Animated.View style={[styles.handle, styles.handleTopRight]} />
                </GestureDetector>
                <GestureDetector gesture={bottomLeftGesture}>
                  <Animated.View style={[styles.handle, styles.handleBottomLeft]} />
                </GestureDetector>
                <GestureDetector gesture={bottomRightGesture}>
                  <Animated.View style={[styles.handle, styles.handleBottomRight]} />
                </GestureDetector>
              </Animated.View>
            </GestureDetector>
          </View>
        )}

        {/* Floating crop button - OUTSIDE overlay, always visible when cropping */}
        {isCropping && totalPages > 0 && !isLocked && (
          <View style={styles.fixedCropButtonContainer}>
            <TouchableOpacity 
              style={styles.floatingCropButton} 
              onPress={handleConfirm}
              activeOpacity={0.8}
            >
              <Feather name="check" size={22} color="#fff" />
              <Text style={styles.floatingCropButtonText}>Crop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer}>
          <View style={styles.footerContent}>
            <View style={styles.pageInfo}>
              <Text style={styles.pageText}>
                {totalPages > 0 ? `Page ${currentPage} of ${totalPages}` : 'Loading PDF...'}
              </Text>
            </View>

            {totalPages > 0 && isCropping && (
              <View style={styles.actionButtons}>
                <TouchableOpacity 
                  style={[styles.lockButton, isLocked && styles.lockButtonActive]} 
                  onPress={() => setIsLocked(!isLocked)}
                >
                  <Feather name={isLocked ? "lock" : "unlock"} size={18} color={isLocked ? "#14B8A6" : "#666"} />
                  <Text style={[styles.lockButtonText, isLocked && styles.lockButtonTextActive]}>
                    {isLocked ? 'Locked' : 'Unlock'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </View>

      {/* Preview Modal */}
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelPreview}
      >
        <View style={styles.previewModalOverlay}>
          <View style={styles.previewModalContent}>
            <View style={styles.previewHeader}>
              <Text style={styles.previewTitle}>Crop Preview</Text>
              <TouchableOpacity onPress={cancelPreview}>
                <Feather name="x" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <View style={styles.previewImageContainer}>
              {previewUri ? (
                <Image
                  source={{ uri: previewUri }}
                  style={styles.previewImage}
                  resizeMode="contain"
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <Feather name="image" size={48} color="#ccc" />
                  <Text style={styles.previewPlaceholderText}>Generating preview...</Text>
                </View>
              )}
            </View>

            <View style={styles.previewActions}>
              <TouchableOpacity
                style={styles.previewCancelButton}
                onPress={cancelPreview}
              >
                <Text style={styles.previewCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.previewConfirmButton}
                onPress={() => {
                  setShowPreview(false);
                  confirmCrop();
                }}
              >
                <Feather name="check" size={20} color="#fff" />
                <Text style={styles.previewConfirmText}>Confirm Crop</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  header: {
    height: HEADER_HEIGHT,
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  pdfContainer: {
    flex: 1,
    backgroundColor: '#E5E7EB',
    overflow: 'hidden',
  },
  pdf: {
    flex: 1,
    width: SCREEN_WIDTH,
    height: PDF_CONTAINER_HEIGHT,
    backgroundColor: '#E5E7EB',
  },
  footer: {
    height: FOOTER_HEIGHT,
    backgroundColor: '#fff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    justifyContent: 'center',
  },
  footerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pageInfo: {
    flex: 1,
  },
  pageText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  cropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  cropButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
  },
  lockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  lockButtonActive: {
    backgroundColor: '#E0F2F1',
    borderColor: '#14B8A6',
  },
  lockButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  lockButtonTextActive: {
    color: '#14B8A6',
  },
  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F3F4F6',
    paddingVertical: 12,
    borderRadius: 8,
  },
  cancelButtonText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  handle: {
    position: 'absolute',
    width: 24,
    height: 24,
    backgroundColor: '#14B8A6',
    borderWidth: 2,
    borderColor: '#fff',
    borderRadius: 12,
  },
  handleTopLeft: {
    top: -12,
    left: -12,
  },
  handleTopRight: {
    top: -12,
    right: -12,
  },
  handleBottomLeft: {
    bottom: -12,
    left: -12,
  },
  handleBottomRight: {
    bottom: -12,
    right: -12,
  },
  fixedCropButtonContainer: {
    position: 'absolute',
    bottom: 120, // Well above the footer (FOOTER_HEIGHT = 80)
    right: 20,
    zIndex: 10000, // Very high z-index to ensure visibility
  },
  floatingButtonContainer: {
    alignItems: 'flex-end',
    zIndex: 1000,
  },
  floatingCropButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#14B8A6',
    paddingHorizontal: 24,
    paddingVertical: 14,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
    zIndex: 10001,
    borderWidth: 3,
    borderColor: '#fff',
  },
  floatingCropButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  previewModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  previewModalContent: {
    backgroundColor: '#fff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  previewTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  previewImageContainer: {
    padding: 16,
    minHeight: 200,
    maxHeight: 400,
    justifyContent: 'center',
    alignItems: 'center',
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  previewPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewPlaceholderText: {
    marginTop: 12,
    color: '#9CA3AF',
    fontSize: 14,
  },
  previewActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  previewCancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewCancelText: {
    color: '#374151',
    fontSize: 16,
    fontWeight: '600',
  },
  previewConfirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#14B8A6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  previewConfirmText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
