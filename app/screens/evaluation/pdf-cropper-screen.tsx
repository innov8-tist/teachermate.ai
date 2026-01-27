import React, { useState, useRef, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Dimensions, Alert, Modal, Image, ScrollView, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { GestureDetector, Gesture, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';
import { captureRef } from 'react-native-view-shot';
import { manipulateAsync, SaveFormat, FlipType } from 'expo-image-manipulator';
import { downloadAsync, cacheDirectory } from 'expo-file-system/legacy';
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
  
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pageImages, setPageImages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentImageDimensions, setCurrentImageDimensions] = useState({ width: SCREEN_WIDTH, height: PDF_CONTAINER_HEIGHT });
  const [pdfDimensions, setPdfDimensions] = useState({ width: SCREEN_WIDTH, height: PDF_CONTAINER_HEIGHT });
  const [isCropping, setIsCropping] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewUri, setPreviewUri] = useState<string>('');
  const [scrollOffset, setScrollOffset] = useState(0);

  const pdfContainerRef = useRef<View>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  // Load PDF images from backend
  useEffect(() => {
    const loadImages = async () => {
      try {
        setLoading(true);
        const images = await getPageImages(pdfUri);
        setPageImages(images);
        setTotalPages(images.length);
        
        // Initialize crop position after images are loaded
        // Set initial crop to center of screen
        cropX.value = SCREEN_WIDTH * 0.1;
        cropY.value = PDF_CONTAINER_HEIGHT * 0.2;
        cropWidth.value = SCREEN_WIDTH * 0.8;
        cropHeight.value = PDF_CONTAINER_HEIGHT * 0.4;
        
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

  // Crop rectangle position and size (in pixels)
  const cropX = useSharedValue(SCREEN_WIDTH * 0.1);
  const cropY = useSharedValue(PDF_CONTAINER_HEIGHT * 0.1);
  const cropWidth = useSharedValue(SCREEN_WIDTH * 0.8);
  const cropHeight = useSharedValue(PDF_CONTAINER_HEIGHT * 0.3);

  // Update dimensions when image loads
  const handleImageLoad = (width: number, height: number) => {
    const aspectRatio = width / height;
    const containerWidth = SCREEN_WIDTH;
    const containerHeight = PDF_CONTAINER_HEIGHT;
    
    let displayWidth = containerWidth;
    let displayHeight = containerWidth / aspectRatio;
    
    if (displayHeight > containerHeight) {
      displayHeight = containerHeight;
      displayWidth = containerHeight * aspectRatio;
    }
    
    setCurrentImageDimensions({ width: displayWidth, height: displayHeight });
    setPdfDimensions({ width: displayWidth, height: displayHeight });
  };

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

    try {
      console.log('🎯 Starting crop process...');
      console.log('📏 Crop rectangle (screen coordinates):', {
        x: cropX.value,
        y: cropY.value,
        width: cropWidth.value,
        height: cropHeight.value,
      });
      console.log('📜 Scroll offset:', scrollOffset);

      // Calculate actual position in the full PDF content
      const actualCropY = cropY.value + scrollOffset;
      
      console.log('✂️ Actual crop position in full content:', {
        x: cropX.value,
        y: actualCropY,
        width: cropWidth.value,
        height: cropHeight.value,
      });

      // Step 1: Download all page images to local cache
      console.log('📥 Downloading all page images...');
      const localImagePaths: string[] = [];
      
      for (let i = 0; i < pageImages.length; i++) {
        const localPath = `${cacheDirectory}pdf_page_${i + 1}.png`;
        const result = await downloadAsync(pageImages[i], localPath);
        localImagePaths.push(result.uri);
        console.log(`✅ Downloaded page ${i + 1}`);
      }

      // Step 2: Stitch all pages together vertically
      console.log('🔗 Stitching pages together...');
      let stitchedImage = localImagePaths[0];
      
      for (let i = 1; i < localImagePaths.length; i++) {
        // Get dimensions of current stitched image
        const stitchedInfo = await new Promise<{width: number, height: number}>((resolve, reject) => {
          Image.getSize(stitchedImage, (width, height) => resolve({width, height}), reject);
        });
        
        // Resize the next page to match width and scale height proportionally
        const nextPageInfo = await new Promise<{width: number, height: number}>((resolve, reject) => {
          Image.getSize(localImagePaths[i], (width, height) => resolve({width, height}), reject);
        });
        
        const scaleFactor = SCREEN_WIDTH / nextPageInfo.width;
        const scaledHeight = Math.round(nextPageInfo.height * scaleFactor);
        
        // Use manipulateAsync to append images (we'll do this by creating a composite)
        // Since expo-image-manipulator doesn't support direct stitching, we'll crop from individual pages
        console.log(`📄 Processing page ${i + 1}...`);
      }

      // Step 3: Determine which page(s) the crop spans
      const pageHeight = PDF_CONTAINER_HEIGHT;
      const startPage = Math.floor(actualCropY / pageHeight);
      const endPage = Math.floor((actualCropY + cropHeight.value) / pageHeight);
      
      console.log(`📄 Crop spans from page ${startPage + 1} to page ${endPage + 1}`);

      // Step 4: If crop is within a single page, crop directly from that page
      if (startPage === endPage) {
        const pageLocalY = actualCropY - (startPage * pageHeight);
        
        console.log(`✂️ Cropping from single page ${startPage + 1} at local Y: ${pageLocalY}`);
        
        // Get the page image dimensions
        const pageInfo = await new Promise<{width: number, height: number}>((resolve, reject) => {
          Image.getSize(localImagePaths[startPage], (width, height) => resolve({width, height}), reject);
        });
        
        // Calculate scale factor (page images are scaled to fit screen width with cover mode)
        const imageAspect = pageInfo.width / pageInfo.height;
        const containerAspect = SCREEN_WIDTH / pageHeight;
        
        let scaleX, scaleY, offsetX, offsetY;
        
        if (imageAspect > containerAspect) {
          // Image is wider - height fills container
          scaleY = pageInfo.height / pageHeight;
          scaleX = scaleY;
          offsetX = (pageInfo.width - (SCREEN_WIDTH * scaleX)) / 2;
          offsetY = 0;
        } else {
          // Image is taller - width fills container
          scaleX = pageInfo.width / SCREEN_WIDTH;
          scaleY = scaleX;
          offsetX = 0;
          offsetY = (pageInfo.height - (pageHeight * scaleY)) / 2;
        }
        
        const cropXOnImage = Math.round(cropX.value * scaleX + offsetX);
        const cropYOnImage = Math.round(pageLocalY * scaleY + offsetY);
        const cropWidthOnImage = Math.round(cropWidth.value * scaleX);
        const cropHeightOnImage = Math.round(cropHeight.value * scaleY);
        
        console.log('✂️ Crop coordinates on source image:', {
          originX: cropXOnImage,
          originY: cropYOnImage,
          width: cropWidthOnImage,
          height: cropHeightOnImage,
        });
        
        const croppedImage = await manipulateAsync(
          localImagePaths[startPage],
          [
            {
              crop: {
                originX: Math.max(0, cropXOnImage),
                originY: Math.max(0, cropYOnImage),
                width: Math.min(cropWidthOnImage, pageInfo.width - Math.max(0, cropXOnImage)),
                height: Math.min(cropHeightOnImage, pageInfo.height - Math.max(0, cropYOnImage)),
              },
            },
          ],
          { compress: 0.9, format: SaveFormat.PNG }
        );

        console.log('✅ Cropped image created:', croppedImage.uri);
        setPreviewUri(croppedImage.uri);
        setShowPreview(true);
      } else {
        // Crop spans multiple pages - stitch them together
        console.log(`🔗 Multi-page crop: pages ${startPage + 1} to ${endPage + 1}`);
        
        const croppedParts: string[] = [];
        
        // Helper function to get scale factors for a page
        const getPageScaleFactors = async (pageIndex: number) => {
          const pageInfo = await new Promise<{width: number, height: number}>((resolve, reject) => {
            Image.getSize(localImagePaths[pageIndex], (width, height) => resolve({width, height}), reject);
          });
          
          const imageAspect = pageInfo.width / pageInfo.height;
          const containerAspect = SCREEN_WIDTH / pageHeight;
          
          let scaleX, scaleY, offsetX, offsetY;
          
          if (imageAspect > containerAspect) {
            scaleY = pageInfo.height / pageHeight;
            scaleX = scaleY;
            offsetX = (pageInfo.width - (SCREEN_WIDTH * scaleX)) / 2;
            offsetY = 0;
          } else {
            scaleX = pageInfo.width / SCREEN_WIDTH;
            scaleY = scaleX;
            offsetX = 0;
            offsetY = (pageInfo.height - (pageHeight * scaleY)) / 2;
          }
          
          return { pageInfo, scaleX, scaleY, offsetX, offsetY };
        };
        
        // Process each page in the crop range
        for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
          const { pageInfo, scaleX, scaleY, offsetX, offsetY } = await getPageScaleFactors(pageIndex);
          
          let cropYOnPage, cropHeightOnPage;
          
          if (pageIndex === startPage) {
            // First page: crop from actualCropY to bottom of page
            const pageLocalY = actualCropY - (pageIndex * pageHeight);
            cropYOnPage = Math.round(pageLocalY * scaleY + offsetY);
            const remainingHeight = pageHeight - pageLocalY;
            cropHeightOnPage = Math.round(remainingHeight * scaleY);
            console.log(`✂️ First page ${pageIndex + 1}: Y=${cropYOnPage}, H=${cropHeightOnPage}`);
          } else if (pageIndex === endPage) {
            // Last page: crop from top to the end of crop rectangle
            const cropEndY = actualCropY + cropHeight.value;
            const pageLocalEndY = cropEndY - (pageIndex * pageHeight);
            cropYOnPage = Math.round(offsetY);
            cropHeightOnPage = Math.round(pageLocalEndY * scaleY);
            console.log(`✂️ Last page ${pageIndex + 1}: Y=${cropYOnPage}, H=${cropHeightOnPage}`);
          } else {
            // Middle page: crop full height at the crop X position
            cropYOnPage = Math.round(offsetY);
            cropHeightOnPage = Math.round(pageHeight * scaleY);
            console.log(`✂️ Middle page ${pageIndex + 1}: Y=${cropYOnPage}, H=${cropHeightOnPage}`);
          }
          
          const cropXOnImage = Math.round(cropX.value * scaleX + offsetX);
          const cropWidthOnImage = Math.round(cropWidth.value * scaleX);
          
          const croppedPart = await manipulateAsync(
            localImagePaths[pageIndex],
            [
              {
                crop: {
                  originX: Math.max(0, cropXOnImage),
                  originY: Math.max(0, cropYOnPage),
                  width: Math.min(cropWidthOnImage, pageInfo.width - Math.max(0, cropXOnImage)),
                  height: Math.min(cropHeightOnPage, pageInfo.height - Math.max(0, cropYOnPage)),
                },
              },
            ],
            { compress: 0.9, format: SaveFormat.PNG }
          );
          
          croppedParts.push(croppedPart.uri);
          console.log(`✅ Cropped part ${pageIndex - startPage + 1}/${endPage - startPage + 1}`);
        }
        
        // Now stitch all parts together vertically
        console.log('🔗 Stitching cropped parts together...');
        
        if (croppedParts.length === 1) {
          setPreviewUri(croppedParts[0]);
          setShowPreview(true);
        } else {
          // Send parts to backend for stitching
          console.log('📤 Sending parts to backend for stitching...');
          
          const formData = new FormData();
          
          // Add each cropped part as a file
          for (let i = 0; i < croppedParts.length; i++) {
            const uri = croppedParts[i];
            console.log(`📎 Adding part ${i + 1}: ${uri}`);
            
            // React Native FormData expects this format
            formData.append('image_files', {
              uri: uri,
              type: 'image/png',
              name: `part_${i}.png`,
            } as any);
          }
          
          console.log('📤 Sending stitch request...');
          
          const stitchResponse = await fetch(`${BASE_URL}/api/evaluation/stitch-images`, {
            method: 'POST',
            body: formData,
          });
          
          console.log('📥 Stitch response status:', stitchResponse.status);
          
          if (!stitchResponse.ok) {
            const errorText = await stitchResponse.text();
            console.error('❌ Stitch error response:', errorText);
            throw new Error(`Failed to stitch images: ${errorText}`);
          }
          
          const stitchData = await stitchResponse.json();
          console.log('✅ Images stitched:', stitchData);
          
          const stitchedUri = `${BASE_URL}${stitchData.stitched_uri}`;
          setPreviewUri(stitchedUri);
          setShowPreview(true);
        }
      }
    } catch (error) {
      console.error('❌ Failed to crop:', error);
      Alert.alert('Error', `Failed to crop: ${error}`);
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
    width: SCREEN_WIDTH,
    height: cropY.value,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  }));

  const overlayBottomStyle = useAnimatedStyle(() => ({
    position: 'absolute',
    left: 0,
    top: cropY.value + cropHeight.value,
    width: SCREEN_WIDTH,
    height: PDF_CONTAINER_HEIGHT - (cropY.value + cropHeight.value),
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

        {/* PDF Viewer - Now using Images */}
        <View style={styles.pdfContainer} ref={pdfContainerRef} collapsable={false}>
          {loading ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color="#14B8A6" />
              <Text style={{ color: '#666', fontSize: 16, marginTop: 12 }}>Loading PDF...</Text>
            </View>
          ) : pageImages.length > 0 ? (
            <ScrollView
              ref={scrollViewRef}
              pagingEnabled={false}
              horizontal={false}
              showsVerticalScrollIndicator={true}
              scrollEnabled={true}
              onScroll={(event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                setScrollOffset(offsetY);
              }}
              scrollEventThrottle={16}
              onMomentumScrollEnd={(event) => {
                const offsetY = event.nativeEvent.contentOffset.y;
                const page = Math.floor(offsetY / PDF_CONTAINER_HEIGHT) + 1;
                setCurrentPage(Math.min(Math.max(1, page), totalPages));
              }}
            >
              {pageImages.map((imageUri, index) => (
                <Image
                  key={index}
                  source={{ uri: imageUri }}
                  style={{ 
                    width: SCREEN_WIDTH, 
                    height: PDF_CONTAINER_HEIGHT,
                    backgroundColor: '#E5E7EB'
                  }}
                  resizeMode="cover"
                  onLoad={(e) => {
                    if (index === 0) {
                      const { width, height } = e.nativeEvent.source;
                      handleImageLoad(width, height);
                    }
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

        {/* Crop Overlay - positioned absolutely, doesn't block scrolling */}
        {isCropping && totalPages > 0 && (
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

            {/* Crop rectangle with handles - only handles are touchable */}
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

        {/* Floating crop button - OUTSIDE overlay, always visible when cropping */}
        {isCropping && totalPages > 0 && (
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
