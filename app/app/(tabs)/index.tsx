import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<'home' | 'evaluation' | 'co' | 'profile'>('home');
  const [showMenu, setShowMenu] = useState(false);
  const [coSubScreen, setCoSubScreen] = useState<'creation' | 'studentSheet'>('creation');
  
  // CO Creation states
  const [coSubjectName, setCoSubjectName] = useState('');
  const [coSelectedOption, setCoSelectedOption] = useState<'1' | '2' | null>(null);
  const [coUploadedImage, setCoUploadedImage] = useState<string | null>(null);
  
  // Student Image states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  const pickCOImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setCoUploadedImage(result.assets[0].uri);
    }
  };

  const pickStudentImageFromGallery = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const pickImageFromCamera = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Camera permission is required');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 1,
    });

    if (!result.canceled) {
      setSelectedImage(result.assets[0].uri);
    }
  };

  const handleCOSubmit = () => {
    if (!coSubjectName || !coSelectedOption || !coUploadedImage) {
      Alert.alert('Missing Information', 'Please fill all fields and upload CO table');
      return;
    }
    Alert.alert('Success', 'CO created successfully!');
  };

  const handleStudentSubmit = () => {
    if (!selectedImage) {
      Alert.alert('Missing Information', 'Please select or capture an image');
      return;
    }
    Alert.alert('Success', 'Student image submitted successfully!');
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.menuButton}
          onPress={() => {
            if (activeTab === 'co') {
              setShowMenu(!showMenu);
            }
          }}
        >
          <Text style={styles.menuIcon}>☰</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Teachermate AI</Text>
        
        <TouchableOpacity style={styles.profileButton}>
          <View style={styles.profileIcon}>
            <Text style={styles.profileIconText}>👤</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Dropdown Menu */}
      {showMenu && activeTab === 'co' && (
        <>
          <TouchableOpacity 
            style={styles.drawerOverlay}
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          />
          <View style={styles.drawer}>
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerHeaderText}>CO Mapper</Text>
            </View>
            <View style={styles.drawerContent}>
              <TouchableOpacity 
                style={styles.drawerItem}
                onPress={() => {
                  setShowMenu(false);
                  setCoSubScreen('studentSheet');
                }}
              >
                <Text style={styles.drawerItemIcon}>📷</Text>
                <Text style={styles.drawerItemText}>Student Answer Sheet</Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        {activeTab === 'home' ? (
          <>
            {/* Welcome Section */}
            <Text style={styles.welcomeText}>Welcome, Teacher</Text>

            {/* Menu Cards */}
            <TouchableOpacity 
              style={styles.menuCard}
              onPress={() => setActiveTab('co')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#B8E6E1' }]}>
                <Text style={styles.cardIcon}>☁️</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Upload Answer Schema</Text>
                <Text style={styles.cardSubtitle}>Upload the answer key document</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.menuCard}
              onPress={() => setActiveTab('evaluation')}
            >
              <View style={[styles.iconContainer, { backgroundColor: '#B8E6E1' }]}>
                <Text style={styles.cardIcon}>📷</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>Upload Answer Sheets</Text>
                <Text style={styles.cardSubtitle}>Capture or upload student answers</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuCard}>
              <View style={[styles.iconContainer, { backgroundColor: '#B8E6E1' }]}>
                <Text style={styles.cardIcon}>📊</Text>
              </View>
              <View style={styles.cardContent}>
                <Text style={styles.cardTitle}>View Evaluation Results</Text>
                <Text style={styles.cardSubtitle}>Check evaluation analytics</Text>
              </View>
            </TouchableOpacity>
          </>
        ) : activeTab === 'co' ? (
          // CO Creation Full Screen
          coSubScreen === 'creation' ? (
            <View style={styles.fullScreenForm}>
              <Text style={styles.pageTitle}>CO Creation</Text>

              <View style={styles.formCard}>
                <Text style={styles.formLabel}>SUBJECT NAME</Text>
                <TextInput
                  style={styles.formInput}
                  value={coSubjectName}
                  onChangeText={setCoSubjectName}
                  placeholder="Enter subject name"
                  placeholderTextColor="#9ca3af"
                />
              </View>

              <View style={styles.formCard}>
                <Text style={styles.formLabel}>I4 1 OR 2</Text>
                <View style={styles.radioGroup}>
                  <TouchableOpacity
                    style={[styles.radioButton, coSelectedOption === '1' && styles.radioButtonActive]}
                    onPress={() => setCoSelectedOption('1')}
                  >
                    <View style={[styles.radioOuter, coSelectedOption === '1' && styles.radioOuterActive]}>
                      {coSelectedOption === '1' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.radioText, coSelectedOption === '1' && styles.radioTextActive]}>1</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.radioButton, coSelectedOption === '2' && styles.radioButtonActive]}
                    onPress={() => setCoSelectedOption('2')}
                  >
                    <View style={[styles.radioOuter, coSelectedOption === '2' && styles.radioOuterActive]}>
                      {coSelectedOption === '2' && <View style={styles.radioInner} />}
                    </View>
                    <Text style={[styles.radioText, coSelectedOption === '2' && styles.radioTextActive]}>2</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formCard}>
                <Text style={styles.formLabel}>UPLOAD CO TABLE</Text>
                <TouchableOpacity style={styles.uploadArea} onPress={pickCOImageFromGallery}>
                  {coUploadedImage ? (
                    <Image source={{ uri: coUploadedImage }} style={styles.uploadedImage} />
                  ) : (
                    <View style={styles.uploadPlaceholder}>
                      <View style={styles.uploadIconCircle}>
                        <Text style={styles.uploadIcon}>📤</Text>
                      </View>
                      <Text style={styles.uploadText}>Tap to upload document</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={styles.submitButton} onPress={handleCOSubmit}>
                <Text style={styles.submitButtonText}>Create CO</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // Student Answer Sheet within CO Mapper
            <View style={styles.fullScreenForm}>
              <TouchableOpacity 
                style={styles.backButton}
                onPress={() => setCoSubScreen('creation')}
              >
                <Text style={styles.backButtonText}>← Back to CO Creation</Text>
              </TouchableOpacity>

              <Text style={styles.pageTitle}>Student Answer Sheet</Text>

              <View style={styles.actionButtonsRow}>
                <TouchableOpacity style={styles.actionCard} onPress={pickImageFromCamera}>
                  <View style={styles.actionIconCircle}>
                    <Text style={styles.actionIcon}>📷</Text>
                  </View>
                  <Text style={styles.actionText}>Take Picture</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.actionCard} onPress={pickStudentImageFromGallery}>
                  <View style={styles.actionIconCircle}>
                    <Text style={styles.actionIcon}>📁</Text>
                  </View>
                  <Text style={styles.actionText}>Upload Manually</Text>
                </TouchableOpacity>
              </View>

              {selectedImage && (
                <View style={styles.imagePreviewContainer}>
                  <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
                </View>
              )}

              <TouchableOpacity style={styles.submitButton} onPress={handleStudentSubmit}>
                <Text style={styles.submitButtonText}>Submit Answer Sheet</Text>
              </TouchableOpacity>
            </View>
          )
        ) : activeTab === 'evaluation' ? (
          // Student Image Full Screen
          <View style={styles.fullScreenForm}>
            <Text style={styles.pageTitle}>Upload Answer Sheets</Text>

            <View style={styles.actionButtonsRow}>
              <TouchableOpacity 
                style={[styles.actionCard, { flex: 0, width: '100%' }]} 
                onPress={pickImageFromCamera}
              >
                <View style={styles.actionIconCircle}>
                  <Text style={styles.actionIcon}>📷</Text>
                </View>
                <Text style={styles.actionText}>Take Picture</Text>
              </TouchableOpacity>
            </View>

            {selectedImage && (
              <View style={styles.imagePreviewContainer}>
                <Image source={{ uri: selectedImage }} style={styles.imagePreview} />
              </View>
            )}

            <TouchableOpacity style={styles.submitButton} onPress={handleStudentSubmit}>
              <Text style={styles.submitButtonText}>Submit Answer Sheet</Text>
            </TouchableOpacity>
          </View>
        ) : activeTab === 'profile' ? (
          <View style={styles.fullScreenForm}>
            <Text style={styles.pageTitle}>Profile</Text>
            <Text style={styles.comingSoonText}>Profile page coming soon...</Text>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Navigation */}
      <View style={styles.bottomNav}>
        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('home')}
        >
          <Text style={[styles.navIcon, activeTab === 'home' && styles.navIconActive]}>🏠</Text>
          <Text style={[styles.navLabel, activeTab === 'home' && styles.navLabelActive]}>Home</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('evaluation')}
        >
          <Text style={[styles.navIcon, activeTab === 'evaluation' && styles.navIconActive]}>✓</Text>
          <Text style={[styles.navLabel, activeTab === 'evaluation' && styles.navLabelActive]}>Evaluation</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => {
            setActiveTab('co');
            setCoSubScreen('creation');
          }}
        >
          <Text style={[styles.navIcon, activeTab === 'co' && styles.navIconActive]}>🗺️</Text>
          <Text style={[styles.navLabel, activeTab === 'co' && styles.navLabelActive]}>CO Mapper</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.navItem}
          onPress={() => setActiveTab('profile')}
        >
          <Text style={[styles.navIcon, activeTab === 'profile' && styles.navIconActive]}>👤</Text>
          <Text style={[styles.navLabel, activeTab === 'profile' && styles.navLabelActive]}>Profile</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  menuButton: {
    padding: 8,
  },
  menuIcon: {
    fontSize: 24,
    color: '#2D3748',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#2D3748',
  },
  profileButton: {
    padding: 4,
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#B8E6E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileIconText: {
    fontSize: 20,
  },
  menuDotsIcon: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3748',
    lineHeight: 28,
  },
  dropdownMenu: {
    position: 'absolute',
    top: 60,
    left: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
    zIndex: 1000,
    minWidth: 200,
  },
  drawerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 999,
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 280,
    backgroundColor: '#FFFFFF',
    zIndex: 1000,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 16,
  },
  drawerHeader: {
    backgroundColor: '#4FD1C5',
    paddingVertical: 40,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  drawerHeaderText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  drawerContent: {
    flex: 1,
    paddingTop: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  drawerItemIcon: {
    fontSize: 24,
    marginRight: 16,
    width: 32,
  },
  drawerItemText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
    flex: 1,
  },
  drawerItemActive: {
    backgroundColor: '#F0FDFA',
  },
  menuItem: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2D3748',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  welcomeText: {
    fontSize: 32,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 24,
  },
  fullScreenForm: {
    flex: 1,
  },
  pageTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2D3748',
    marginBottom: 24,
  },
  formCard: {
    marginBottom: 20,
  },
  formLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#718096',
    marginBottom: 10,
    letterSpacing: 1.5,
  },
  formInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#B8E6E1',
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
  },
  radioGroup: {
    flexDirection: 'row',
    gap: 12,
  },
  radioButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#B8E6E1',
    backgroundColor: '#FFFFFF',
  },
  radioButtonActive: {
    backgroundColor: '#4FD1C5',
    borderColor: '#4FD1C5',
  },
  radioOuter: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#B8E6E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOuterActive: {
    borderColor: '#FFFFFF',
    backgroundColor: '#4FD1C5',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#FFFFFF',
  },
  radioText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
  },
  radioTextActive: {
    color: '#FFFFFF',
  },
  comingSoonText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
    marginTop: 40,
  },
  backButton: {
    marginBottom: 16,
  },
  backButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#4FD1C5',
  },
  menuCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  cardIcon: {
    fontSize: 28,
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#2D3748',
    marginBottom: 4,
  },
  cardSubtitle: {
    fontSize: 14,
    color: '#718096',
  },
  modal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
  closeButton: {
    fontSize: 24,
    color: '#718096',
    fontWeight: '300',
  },
  uploadArea: {
    backgroundColor: '#F7FAFC',
    borderWidth: 2,
    borderColor: '#B8E6E1',
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 200,
    marginBottom: 20,
    overflow: 'hidden',
  },
  uploadPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadIconCircle: {
    width: 64,
    height: 64,
    backgroundColor: '#B8E6E1',
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  uploadIcon: {
    fontSize: 32,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#4A5568',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  actionCard: {
    flex: 1,
    backgroundColor: '#F7FAFC',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  actionIconCircle: {
    width: 56,
    height: 56,
    backgroundColor: '#B8E6E1',
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  actionIcon: {
    fontSize: 28,
  },
  actionText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
  },
  imagePreviewContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    height: 300,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  imagePreview: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  submitButton: {
    backgroundColor: '#4FD1C5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#4FD1C5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  bottomNav: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  navItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  navIcon: {
    fontSize: 24,
    marginBottom: 4,
    opacity: 0.5,
  },
  navIconActive: {
    opacity: 1,
  },
  navLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#718096',
  },
  navLabelActive: {
    color: '#4FD1C5',
    fontWeight: '600',
  },
});
