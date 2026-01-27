import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, Modal, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { BASE_URL } from '../../constants/api';

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
  pdfUri: string; // This will be the PDF ID from backend
  questionId: string;
  onBack: () => void;
  onConfirm: (croppedSection: CroppedSection) => void;
}

// Helper to get page images from backend
const getPageImages = async (pdfId: string): Promise<string[]> => {
  try {
    const response = await fetch(`${BASE_URL}/api/evaluation/pdf-images/${pdfId}`);
    if (!response.ok) throw new Error('Failed to fetch PDF images');
    const data = await response.json();
    // Convert relative URLs to absolute
    return data.images.map((img: string) => `${BASE_URL}${img}`);
  } catch (error) {
    console.error('Error fetching PDF images:', error);
    throw error;
  }
};

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
  console.log('='.repeat(50));
  
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUri, setPreviewUri] = useState<string>('');
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number }[]>([]);
  const [totalContentHeight, setTotalContentHeight] = useState(0);

  const scrollViewRef = useRef<ScrollView>(null);

  // Load PDF images from backend
  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        const images = await getPageImages(pdfUri);
        setPageImages(images);
        
        // Initialize crop position after images are loaded
        cropX.value = SCREEN_WIDTH * 0.1;
        cropY.value = 100;
        cropWidth.value = SCREEN_WIDTH * 0.8;
        cropHeight.value = 200;
        
        setLoading(false);
      } catch (error) {
        Alert.alert('Error', 'Failed to load PDF images', [
          { text: 'Go Back', onPress: onBack }
        ]);
        setLoading(false);
      }
    };
    loadImages();
  }, [pdfUri]);

  // Crop rectangle position and size (absolute pixels from top of content)
  const cropX = useSharedValue(SCREEN_WIDTH * 0.1);
  const cropY = useSharedValue(100);
  const cropWidth = useSharedValue(SCREEN_WIDTH * 0.8);
  const cropHeight = useSharedValue(200);
  const scrollY = useSharedValue(0);

  const handleImageLoad = (index: number, width: number, height: number) => {
    setImageDimensions(prev => {
      const newDims = [...prev];
      newDims[index] = { width, height };
      
      // Calculate total height
      if (newDims.length === pageImages.length && newDims.every(d => d)) {
        const total = newDims.reduce((sum, dim) => sum + (SCREEN_WIDTH / dim.width) * dim.height, 0);
        setTotalContentHeight(total);
      }
      
      return newDims;
    });
  };

  const handleConfirm = async () => {
    // Calculate which pages the crop spans
    let accumulatedHeight = 0;
    let startPage = -1;
    let endPage = -1;
    let startYInPage = 0;
    let endYInPage = 0;
    
    const cropEndY = cropY.value + cropHeight.value;
    
    // Find start page
    for (let i = 0; i < imageDimensions.length; i++) {
      const dim = imageDimensions[i];
      if (!dim) continue;
      
      const imageHeight = (SCREEN_WIDTH / dim.width) * dim.height;
      const pageStartY = accumulatedHeight;
      const pageEndY = accumulatedHeight + imageHeight;
      
      // Check if crop starts in this page
      if (startPage === -1 && cropY.value >= pageStartY && cropY.value < pageEndY) {
        startPage = i + 1;
        startYInPage = cropY.value - pageStartY;
      }
      
      // Check if crop ends in this page
      if (cropEndY > pageStartY && cropEndY <= pageEndY) {
        endPage = i + 1;
        endYInPage = cropEndY - pageStartY;
        break;
      }
      
      accumulatedHeight += imageHeight;
    }
    
    // If crop extends beyond last page
    if (endPage === -1) {
      endPage = imageDimensions.length;
      const lastDim = imageDimensions[endPage - 1];
      endYInPage = (SCREEN_WIDTH / lastDim.width) * lastDim.height;
    }
    
    console.log('🎯 Crop spans pages:', startPage, 'to', endPage);
    
    // Validate crop
    if (cropWidth.value < 50 || cropHeight.value < 50) {
      Alert.alert('Invalid Crop', 'Crop area is too small. Please select a larger area.');
      return;
    }
    
    if (startPage === endPage) {
      // Single page crop - use existing logic
      await handleSinglePageCrop(startPage, startYInPage, endYInPage);
    } else {
      // Multi-page crop - need to crop multiple pages and stitch
      await handleMultiPageCrop(startPage, endPage, startYInPage, endYInPage);
    }
  };
  
  const handleSinglePageCrop = async (pageNum: number, startY: number, endY: number) => {
    const pageDim = imageDimensions[pageNum - 1];
    const displayedImageHeight = (SCREEN_WIDTH / pageDim.width) * pageDim.height;
    
    const xPercent = (cropX.value / SCREEN_WIDTH) * 100;
    const yPercent = (startY / displayedImageHeight) * 100;
    const widthPercent = (cropWidth.value / SCREEN_WIDTH) * 100;
    const heightPercent = ((endY - startY) / displayedImageHeight) * 100;
    
    console.log('📄 Single page crop:', pageNum);
    console.log('📏 Percentages:', { x: xPercent.toFixed(1), y: yPercent.toFixed(1), w: widthPercent.toFixed(1), h: heightPercent.toFixed(1) });

    try {
      const response = await fetch(`${BASE_URL}/api/evaluation/crop-pdf-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdf_uri: pdfUri,
          page_number: pageNum,
          x: xPercent,
          y: yPercent,
          width: widthPercent,
          height: heightPercent,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to crop PDF');
      }

      const result = await response.json();
      console.log('✅ Backend crop successful:', result);

      const croppedImageUri = `${BASE_URL}${result.crop_uri}`;
      setPreviewUri(croppedImageUri);
      setShowPreview(true);
    } catch (error) {
      console.error('❌ Failed to crop:', error);
      Alert.alert('Error', `Failed to crop: ${error}`);
    }
  };
  
  const handleMultiPageCrop = async (startPage: number, endPage: number, startY: number, endY: number) => {
    console.log('📄 Multi-page crop from page', startPage, 'to', endPage);
    
    try {
      const crops = [];
      let accumulatedHeight = 0;
      
      // Calculate crop for each page
      for (let i = 0; i < imageDimensions.length; i++) {
        const pageNum = i + 1;
        if (pageNum < startPage || pageNum > endPage) {
          const dim = imageDimensions[i];
          accumulatedHeight += (SCREEN_WIDTH / dim.width) * dim.height;
          continue;
        }
        
        const pageDim = imageDimensions[i];
        const displayedImageHeight = (SCREEN_WIDTH / pageDim.width) * pageDim.height;
        const pageStartY = accumulatedHeight;
        const pageEndY = accumulatedHeight + displayedImageHeight;
        
        // Calculate crop bounds for this page
        let cropStartY, cropEndY;
        
        if (pageNum === startPage) {
          cropStartY = startY;
          cropEndY = pageNum === endPage ? endY : displayedImageHeight;
        } else if (pageNum === endPage) {
          cropStartY = 0;
          cropEndY = endY;
        } else {
          // Middle page - crop entire height
          cropStartY = 0;
          cropEndY = displayedImageHeight;
        }
        
        const xPercent = (cropX.value / SCREEN_WIDTH) * 100;
        const yPercent = (cropStartY / displayedImageHeight) * 100;
        const widthPercent = (cropWidth.value / SCREEN_WIDTH) * 100;
        const heightPercent = ((cropEndY - cropStartY) / displayedImageHeight) * 100;
        
        crops.push({
          page_number: pageNum,
          x: xPercent,
          y: yPercent,
          width: widthPercent,
          height: heightPercent,
        });
        
        accumulatedHeight += displayedImageHeight;
      }
      
      console.log('📏 Multi-page crops:', crops);
      
      // Send multi-page crop request to backend
      const response = await fetch(`${BASE_URL}/api/evaluation/crop-pdf-multi-page`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pdf_uri: pdfUri,
          crops: crops,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to crop PDF');
      }

      const result = await response.json();
      console.log('✅ Multi-page crop successful:', result);

      const croppedImageUri = `${BASE_URL}${result.crop_uri}`;
      setPreviewUri(croppedImageUri);
      setShowPreview(true);
    } catch (error) {
      console.error('❌ Failed to crop:', error);
      Alert.alert('Error', `Failed to crop: ${error}`);
    }
  };

  const confirmCrop = () => {
    // Calculate page and percentages again for the final crop data
    let accumulatedHeight = 0;
    let targetPage = 1;
    let yOffsetInPage = cropY.value;
    
    for (let i = 0; i < imageDimensions.length; i++) {
      const dim = imageDimensions[i];
      if (!dim) continue;
      
      const imageHeight = (SCREEN_WIDTH / dim.width) * dim.height;
      
      if (cropY.value < accumulatedHeight + imageHeight) {
        targetPage = i + 1;
        yOffsetInPage = cropY.value - accumulatedHeight;
        break;
      }
      
      accumulatedHeight += imageHeight;
    }
    
    const pageDim = imageDimensions[targetPage - 1];
    const displayedImageHeight = (SCREEN_WIDTH / pageDim.width) * pageDim.height;
    
    const crop: CropRect = {
      x: (cropX.value / SCREEN_WIDTH) * 100,
      y: (yOffsetInPage / displayedImageHeight) * 100,
      width: (cropWidth.value / SCREEN_WIDTH) * 100,
      height: (cropHeight.value / displayedImageHeight) * 100,
    };
    
    const croppedSection: CroppedSection = {
      questionId,
      pdfUri,
      pageNumber: targetPage,
      crop,
      timestamp: Date.now(),
      previewUri: previewUri,
    };

    onConfirm(croppedSection);
  };

  const cancelPreview = () => {
    setShowPreview(false);
    setPreviewUri('');
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

      // Constrain within screen width
      cropX.value = Math.max(0, Math.min(newX, SCREEN_WIDTH - cropWidth.value));
      
      // Constrain within total content height, but also check page boundaries
      const constrainedY = Math.max(0, Math.min(newY, totalContentHeight - cropHeight.value));
      cropY.value = constrainedY;
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

          if (newWidth >= MIN_CROP_SIZE && startX.value + newWidth <= SCREEN_WIDTH) {
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
          if (newHeight >= MIN_CROP_SIZE && startY.value + newHeight <= totalContentHeight) {
            cropHeight.value = newHeight;
          }
        } else if (corner === 'bottomRight') {
          const newWidth = startWidth.value + event.translationX;
          const newHeight = startHeight.value + event.translationY;

          if (newWidth >= MIN_CROP_SIZE && startX.value + newWidth <= SCREEN_WIDTH) {
            cropWidth.value = newWidth;
          }
          if (newHeight >= MIN_CROP_SIZE && startY.value + newHeight <= totalContentHeight) {
            cropHeight.value = newHeight;
          }
        }
      });
  };

  const topLeftGesture = createCornerGesture('topLeft');
  const topRightGesture = createCornerGesture('topRight');
  const bottomLeftGesture = createCornerGesture('bottomLeft');
  const bottomRightGesture = createCornerGesture('bottomRight');

  // Animated styles - crop markers positioned absolutely in content coordinates
  const cropRectStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cropX.value,
    top: cropY.value - scrollY.value, // Adjust for scroll position
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
    width: SCREEN_WIDTH,
    height: Math.max(0, cropY.value - scrollY.value),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }));

  const overlayBottomStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: cropY.value - scrollY.value + cropHeight.value,
    width: SCREEN_WIDTH,
    height: PDF_CONTAINER_HEIGHT - (cropY.value - scrollY.value + cropHeight.value),
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }));

  const overlayLeftStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: cropY.value - scrollY.value,
    width: cropX.value,
    height: cropHeight.value,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }));

  const overlayRightStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: cropX.value + cropWidth.value,
    top: cropY.value - scrollY.value,
    width: SCREEN_WIDTH - (cropX.value + cropWidth.value),
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

        {/* PDF Viewer - All pages in one scrollable view */}
        <View style={styles.pdfContainer}>
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#14B8A6" />
              <Text style={{ color: '#666', fontSize: 16, marginTop: 12 }}>Loading PDF...</Text>
            </View>
          ) : pageImages.length > 0 ? (
            <ScrollView
              ref={scrollViewRef}
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              onScroll={(event) => {
                scrollY.value = event.nativeEvent.contentOffset.y;
              }}
              scrollEventThrottle={16}
            >
              {pageImages.map((imageUri, index) => (
                <Image
                  key={index}
                  source={{ uri: imageUri }}
                  style={{ 
                    width: SCREEN_WIDTH,
                    height: undefined,
                    aspectRatio: imageDimensions[index] ? imageDimensions[index].width / imageDimensions[index].height : 1,
                    backgroundColor: '#E5E7EB'
                  }}
                  resizeMode="contain"
                  onLoad={(e) => {
                    const { width, height } = e.nativeEvent.source;
                    handleImageLoad(index, width, height);
                  }}
                />
              ))}
            </ScrollView>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ color: '#666', fontSize: 16 }}>No PDF loaded</Text>
            </View>
          )}
        </View>

        {/* Crop Overlay - positioned absolutely, moves with scroll */}
        {pageImages.length > 0 && (
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
            {/* Dimmed overlays */}
            <Animated.View style={overlayTopStyle} pointerEvents="none" />
            <Animated.View style={overlayBottomStyle} pointerEvents="none" />
            <Animated.View style={overlayLeftStyle} pointerEvents="none" />
            <Animated.View style={overlayRightStyle} pointerEvents="none" />

            {/* Crop rectangle with handles */}
            <Animated.View style={cropRectStyle} pointerEvents="box-none">
              <GestureDetector gesture={panGesture}>
                <Animated.View style={StyleSheet.absoluteFill} />
              </GestureDetector>
              
              {/* Corner handles */}
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
          </View>
        )}

        {/* Floating crop button */}
        {pageImages.length > 0 && (
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
                {pageImages.length > 0 ? `${pageImages.length} pages loaded` : 'Loading PDF...'}
              </Text>
            </View>
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
