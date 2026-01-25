import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  ScrollView,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  StatusBar,
  StyleSheet,
  View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SplashScreen } from '@/components/splash-screen';
import { Svg, Path } from 'react-native-svg';

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'home' | 'evaluation' | 'co' | 'profile'>('home');
  const [showMenu, setShowMenu] = useState(false);
  const [coSubScreen, setCoSubScreen] = useState<'creation' | 'studentSheet' | 'myCOs' | 'coDetails'>('creation');

  // CO Creation states
  const [coSelectedSemester, setCoSelectedSemester] = useState<string>('');
  const [subjects, setSubjects] = useState<Array<{ name: string }>>([]);
  const [coSubjectName, setCoSubjectName] = useState('');
  const [coSelectedOption, setCoSelectedOption] = useState<'1' | '2' | null>(null);
  const [coUploadedImage, setCoUploadedImage] = useState<string | null>(null);
  const [isSubmittingCO, setIsSubmittingCO] = useState(false);

  // Student Image states
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // My CO's states
  const [myCOs, setMyCOs] = useState<Array<{ id: number; ia: string; name: string; branch: string; sem: number }>>([]);
  const [selectedCOId, setSelectedCOId] = useState<number | null>(null);
  const [coDetails, setCoDetails] = useState<Array<{ q_no: string; co_no: string }>>([]);

  const DeleteIcon = () => (
    <Svg width="24" height="24" viewBox="0 0 24 24" fill="none">
      <Path
        d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"
        stroke="#4FD1C5"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );

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

  const fetchSubjects = async (semester: string) => {
    try {
      // For Android emulator use 10.0.2.2
      // For iOS simulator use localhost
      // For physical device, replace with your computer's IP (e.g., 192.168.1.5)
      const response = await fetch(`http://10.0.2.2:8000/subject_fetch/${semester}`);
      const data = await response.json();
      setSubjects(data);
    } catch (error) {
      Alert.alert('Connection Error', 'Make sure backend is running on port 8000');
      console.error(error);
    }
  };

  const handleCOSubmit = async () => {
    if (!coSelectedSemester || !coSubjectName || !coSelectedOption || !coUploadedImage) {
      Alert.alert('Missing Information', 'Please fill all fields and upload CO table');
      return;
    }

    setIsSubmittingCO(true);

    try {
      const formData = new FormData();
      formData.append('subject_name', coSubjectName);
      formData.append('sem', coSelectedSemester);
      formData.append('ia_number', coSelectedOption);

      // Prepare image for upload
      const uriParts = coUploadedImage.split('.');
      const fileType = uriParts[uriParts.length - 1];

      formData.append('co_image', {
        uri: coUploadedImage,
        name: `co_table.${fileType}`,
        type: `image/${fileType}`,
      } as any);

      const response = await fetch('http://10.0.2.2:8000/co_creation', {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      const result = await response.json();

      if (result.status === 'success') {
        Alert.alert('Success', 'CO created successfully!');
        // Reset form
        setCoSelectedSemester('');
        setCoSubjectName('');
        setCoSelectedOption(null);
        setCoUploadedImage(null);
        setSubjects([]);
      } else {
        Alert.alert('Error', result.message || 'Failed to create CO');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to submit CO creation');
      console.error(error);
    } finally {
      setIsSubmittingCO(false);
    }
  };

  const handleStudentSubmit = () => {
    if (!selectedImage) {
      Alert.alert('Missing Information', 'Please select or capture an image');
      return;
    }
    Alert.alert('Success', 'Student image submitted successfully!');
  };

  const fetchMyCOs = async () => {
    try {
      // Replace 1 with actual teacher_id from your auth system
      const teacherId = 1;
      const response = await fetch(`http://10.0.2.2:8000/co_fetch/${teacherId}`);
      const data = await response.json();
      setMyCOs(data);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch CO list');
      console.error(error);
    }
  };

  const fetchCODetails = async (subjectId: number) => {
    try {
      const response = await fetch(`http://10.0.2.2:8000/co_fetch_details/${subjectId}`);
      const data = await response.json();
      setCoDetails(data);
      setSelectedCOId(subjectId);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch CO details');
      console.error(error);
    }
  };

  const handleCOCardClick = (coId: number) => {
    fetchCODetails(coId);
    setCoSubScreen('coDetails');
  };

  const handleDeleteCO = (coId: number, coName: string) => {
    Alert.alert(
      'Delete CO',
      `Are you sure you want to delete ${coName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`http://10.0.2.2:8000/co_delete/${coId}`, {
                method: 'DELETE',
              });
              const result = await response.json();
              
              if (result.status === 'success') {
                Alert.alert('Success', 'CO deleted successfully');
                // Refresh the list
                fetchMyCOs();
              } else {
                Alert.alert('Error', result.message || 'Failed to delete CO');
              }
            } catch (error) {
              Alert.alert('Error', 'Failed to delete CO');
              console.error(error);
            }
          }
        }
      ]
    );
  };

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Header */}
      <View className="bg-white px-5 py-4 border-b border-gray-100">
        <View className="flex-row items-center justify-between">
          <TouchableOpacity
            className="p-2"
            onPress={() => {
              if (activeTab === 'co') {
                setShowMenu(!showMenu);
              }
            }}
          >
            <Text className="text-2xl text-gray-800">☰</Text>
          </TouchableOpacity>
          
          <Text className="text-lg font-semibold text-gray-900">Teachermate AI</Text>
  
          <TouchableOpacity>
            <Avatar>
              <AvatarFallback>
                <Text className="text-xl">👤</Text>
              </AvatarFallback>
            </Avatar>
          </TouchableOpacity>
        </View>
      </View>

      {/* Drawer Menu */}
      {showMenu && activeTab === 'co' && (
        <>
          <TouchableOpacity
            className="absolute top-0 left-0 right-0 bottom-0 bg-black/50 z-10"
            activeOpacity={1}
            onPress={() => setShowMenu(false)}
          />
          <View className="absolute top-0 left-0 bottom-0 w-72 bg-white z-20">
            <View className="bg-[#4FD1C5] py-10 px-5 border-b border-gray-100">
              <Text className="text-xl font-bold text-white">CO Mapper</Text>
            </View>
            <View className="flex-1 pt-2">
              <TouchableOpacity
                style={styles.drawerItem}
                onPress={() => {
                  setShowMenu(false);
                  setCoSubScreen('myCOs');
                  fetchMyCOs();
                }}
              >
                <Text style={styles.drawerItemIcon}>📋</Text>
                <Text style={styles.drawerItemText}>My CO's</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-row items-center py-4 px-5 border-b border-gray-50"
                onPress={() => {
                  setShowMenu(false);
                  setCoSubScreen('studentSheet');
                }}
              >
                <Text className="text-2xl mr-4 w-8">📷</Text>
                <Text className="text-base font-medium text-gray-900 flex-1">
                  Student Answer Sheet
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </>
      )}

      <ScrollView className="flex-1" contentContainerClassName="p-5 pb-24">
        {activeTab === 'home' ? (
          <View>
            {/* Welcome Section */}
            <View className="mb-6">
              <Text className="text-3xl font-bold text-gray-900 mb-1">Welcome, Teacher</Text>
              <Text className="text-base text-gray-500">Manage your evaluations efficiently</Text>
            </View>

            {/* Stats Cards */}
            <View className="flex-row gap-3 mb-5">
              <Card className="flex-1">
                <CardContent>
                  <Text className="text-2xl font-bold text-[#4FD1C5] mb-1">24</Text>
                  <Text className="text-xs text-gray-500 font-medium">Pending</Text>
                </CardContent>
              </Card>
              <Card className="flex-1">
                <CardContent>
                  <Text className="text-2xl font-bold text-green-500 mb-1">156</Text>
                  <Text className="text-xs text-gray-500 font-medium">Completed</Text>
                </CardContent>
              </Card>
            </View>

            {/* Menu Cards */}
            <TouchableOpacity
              onPress={() => setActiveTab('co')}
              activeOpacity={0.7}
            >
              <Card className="mb-4">
                <CardContent className="flex-row items-center">
                  <View className="w-14 h-14 bg-[#B8E6E1] rounded-xl items-center justify-center mr-4">
                    <Text className="text-3xl">☁️</Text>
                  </View>
                  <View className="flex-1">
                    <CardTitle className="mb-1">Upload Answer Schema</CardTitle>
                    <CardDescription>Upload the answer key document</CardDescription>
                  </View>
                  <Text className="text-gray-400 text-xl">›</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setActiveTab('evaluation')}
              activeOpacity={0.7}
            >
              <Card className="mb-4">
                <CardContent className="flex-row items-center">
                  <View className="w-14 h-14 bg-[#B8E6E1] rounded-xl items-center justify-center mr-4">
                    <Text className="text-3xl">📷</Text>
                  </View>
                  <View className="flex-1">
                    <CardTitle className="mb-1">Upload Answer Sheets</CardTitle>
                    <CardDescription>Capture or upload student answers</CardDescription>
                  </View>
                  <Text className="text-gray-400 text-xl">›</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>

            <TouchableOpacity activeOpacity={0.7}>
              <Card className="mb-4">
                <CardContent className="flex-row items-center">
                  <View className="w-14 h-14 bg-[#B8E6E1] rounded-xl items-center justify-center mr-4">
                    <Text className="text-3xl">📊</Text>
                  </View>
                  <View className="flex-1">
                    <CardTitle className="mb-1">View Evaluation Results</CardTitle>
                    <CardDescription>Check evaluation analytics</CardDescription>
                  </View>
                  <Text className="text-gray-400 text-xl">›</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>
          </View>
        ) : activeTab === 'co' ? (
          // CO Creation Full Screen
          coSubScreen === 'creation' ? (
            <View className="flex-1">
              <Text className="text-2xl font-bold text-gray-900 mb-6">CO Creation</Text>

              <View style={styles.formCard}>
                <Text style={styles.formLabel}>SEMESTER</Text>
                <View style={styles.semesterGrid}>
                  {['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => (
                    <TouchableOpacity
                      key={sem}
                      style={[
                        styles.semesterButton,
                        coSelectedSemester === sem && styles.semesterButtonActive
                      ]}
                      onPress={() => {
                        setCoSelectedSemester(sem);
                        fetchSubjects(sem);
                      }}
                    >
                      <Text style={[
                        styles.semesterText,
                        coSelectedSemester === sem && styles.semesterTextActive
                      ]}>
                        {sem}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {coSelectedSemester && (
                <View style={styles.formCard}>
                  <Text style={styles.formLabel}>SUBJECT NAME</Text>
                  <View style={styles.subjectList}>
                    {subjects.map((subject, index) => (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.subjectButton,
                          coSubjectName === subject.name && styles.subjectButtonActive
                        ]}
                        onPress={() => setCoSubjectName(subject.name)}
                      >
                        <Text style={[
                          styles.subjectButtonText,
                          coSubjectName === subject.name && styles.subjectButtonTextActive
                        ]}>
                          {subject.name}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              )}
              <Card className="mb-4">
                <CardContent>
                  <Text className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                    I4 1 OR 2
                  </Text>
                  <View className="flex-row gap-3">
                    <TouchableOpacity
                      className={`flex-1 flex-row items-center justify-center gap-3 py-4 px-5 rounded-xl border-2 ${
                        coSelectedOption === '1'
                          ? 'bg-[#4FD1C5] border-[#4FD1C5]'
                          : 'bg-white border-[#B8E6E1]'
                      }`}
                      onPress={() => setCoSelectedOption('1')}
                      activeOpacity={0.7}
                    >
                      <View
                        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                          coSelectedOption === '1'
                            ? 'border-white bg-[#4FD1C5]'
                            : 'border-[#B8E6E1] bg-white'
                        }`}
                      >
                        {coSelectedOption === '1' && (
                          <View className="w-3 h-3 rounded-full bg-white" />
                        )}
                      </View>
                      <Text
                        className={`text-lg font-bold ${
                          coSelectedOption === '1' ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        1
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      className={`flex-1 flex-row items-center justify-center gap-3 py-4 px-5 rounded-xl border-2 ${
                        coSelectedOption === '2'
                          ? 'bg-[#4FD1C5] border-[#4FD1C5]'
                          : 'bg-white border-[#B8E6E1]'
                      }`}
                      onPress={() => setCoSelectedOption('2')}
                      activeOpacity={0.7}
                    >
                      <View
                        className={`w-6 h-6 rounded-full border-2 items-center justify-center ${
                          coSelectedOption === '2'
                            ? 'border-white bg-[#4FD1C5]'
                            : 'border-[#B8E6E1] bg-white'
                        }`}
                      >
                        {coSelectedOption === '2' && (
                          <View className="w-3 h-3 rounded-full bg-white" />
                        )}
                      </View>
                      <Text
                        className={`text-lg font-bold ${
                          coSelectedOption === '2' ? 'text-white' : 'text-gray-900'
                        }`}
                      >
                        2
                      </Text>
                    </TouchableOpacity>
                  </View>
                </CardContent>
              </Card>

              <Card className="mb-6">
                <CardContent>
                  <Text className="text-xs font-semibold text-gray-600 mb-3 uppercase tracking-wider">
                    UPLOAD CO TABLE
                  </Text>
                  <TouchableOpacity
                    className="bg-gray-50 border-2 border-dashed border-[#B8E6E1] rounded-xl h-48 overflow-hidden"
                    onPress={pickCOImageFromGallery}
                    activeOpacity={0.7}
                  >
                    {coUploadedImage ? (
                      <Image source={{ uri: coUploadedImage }} className="w-full h-full" resizeMode="cover" />
                    ) : (
                      <View className="flex-1 items-center justify-center">
                        <View className="w-16 h-16 bg-[#B8E6E1] rounded-full items-center justify-center mb-3">
                          <Text className="text-3xl">📤</Text>
                        </View>
                        <Text className="text-base font-medium text-gray-600">Tap to upload document</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </CardContent>
              </Card>

              <TouchableOpacity
                style={[styles.submitButton, isSubmittingCO && styles.submitButtonDisabled]}
                onPress={handleCOSubmit}
                disabled={isSubmittingCO}
              >
                <Text style={styles.submitButtonText}>
                  {isSubmittingCO ? 'Processing...' : 'Create CO'}
                </Text>
              </TouchableOpacity>
           
            </View>
          ) : coSubScreen === 'myCOs' ? (
            // My CO's List
            <View style={styles.fullScreenForm}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCoSubScreen('creation')}
              >
                <Text style={styles.backButtonText}>← Back to CO Creation</Text>
              </TouchableOpacity>

              <Text style={styles.pageTitle}>My CO's</Text>

              {myCOs.length === 0 ? (
                <Text style={styles.comingSoonText}>No CO's created yet</Text>
              ) : (
                <View style={styles.coList}>
                  {myCOs.map((co, index) => (
                    <View key={index} style={styles.coCard}>
                      <TouchableOpacity
                        style={styles.coCardContent}
                        onPress={() => handleCOCardClick(co.id)}
                      >
                        <View style={styles.coCardHeader}>
                          <Text style={styles.coCardTitle}>{co.name}</Text>
                          <View style={styles.coCardBadge}>
                            <Text style={styles.coCardBadgeText}>{co.ia}</Text>
                          </View>
                        </View>
                        <View style={styles.coCardDetails}>
                          <Text style={styles.coCardDetailText}>Branch: {co.branch}</Text>
                          <Text style={styles.coCardDetailText}>Semester: {co.sem}</Text>
                        </View>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDeleteCO(co.id, co.name)}
                      >
                        <DeleteIcon />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ) : coSubScreen === 'coDetails' ? (
            // CO Details Screen
            <View style={styles.fullScreenForm}>
              <TouchableOpacity
                style={styles.backButton}
                onPress={() => setCoSubScreen('myCOs')}
              >
                <Text style={styles.backButtonText}>← Back to My CO's</Text>
              </TouchableOpacity>

              <Text style={styles.pageTitle}>CO Mapping Details</Text>

              {coDetails.length === 0 ? (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyStateIcon}>📋</Text>
                  <Text style={styles.emptyStateText}>No question mappings found</Text>
                </View>
              ) : (
                <ScrollView style={styles.detailsScrollView}>
                  <View style={styles.detailsGrid}>
                    {coDetails.map((detail, index) => (
                      <View key={index} style={styles.detailCardNew}>
                        <View style={styles.detailCardTop}>
                          <View style={styles.questionBadge}>
                            <Text style={styles.questionBadgeLabel}>Question</Text>
                            <Text style={styles.questionBadgeNumber}>{detail.q_no}</Text>
                          </View>
                        </View>
                        <View style={styles.detailCardDivider} />
                        <View style={styles.detailCardBottom}>
                          <Text style={styles.coLabel}>Course Outcome</Text>
                          <View style={styles.coValueContainer}>
                            <Text style={styles.coValue}>{detail.co_no}</Text>
                          </View>
                        </View>
                      </View>
                    ))}
                  </View>
                </ScrollView>
              )}
            </View>
          ) : (
            // Student Answer Sheet within CO Mapper
            <View className="flex-1">
              <TouchableOpacity
                className="mb-4"
                onPress={() => setCoSubScreen('creation')}
              >
                <Text className="text-base font-semibold text-[#4FD1C5]">← Back to CO Creation</Text>
              </TouchableOpacity>

              <Text className="text-2xl font-bold text-gray-900 mb-6">Student Answer Sheet</Text>

              <View className="flex-row gap-3 mb-5">
                <TouchableOpacity className="flex-1" onPress={pickImageFromCamera} activeOpacity={0.7}>
                  <Card>
                    <CardContent className="items-center py-2">
                      <View className="w-14 h-14 bg-[#B8E6E1] rounded-full items-center justify-center mb-3">
                        <Text className="text-3xl">📷</Text>
                      </View>
                      <Text className="text-sm font-semibold text-gray-900 text-center">Take Picture</Text>
                    </CardContent>
                  </Card>
                </TouchableOpacity>

                <TouchableOpacity className="flex-1" onPress={pickStudentImageFromGallery} activeOpacity={0.7}>
                  <Card>
                    <CardContent className="items-center py-2">
                      <View className="w-14 h-14 bg-[#B8E6E1] rounded-full items-center justify-center mb-3">
                        <Text className="text-3xl">📁</Text>
                      </View>
                      <Text className="text-sm font-semibold text-gray-900 text-center">Upload Manually</Text>
                    </CardContent>
                  </Card>
                </TouchableOpacity>
              </View>

              {selectedImage && (
                <Card className="mb-5">
                  <CardContent className="p-0">
                    <Image source={{ uri: selectedImage }} className="w-full h-72 rounded-xl" resizeMode="cover" />
                  </CardContent>
                </Card>
              )}

              <Button onPress={handleStudentSubmit} size="lg">
                Submit Answer Sheet
              </Button>
            </View>
          )
        ) : activeTab === 'evaluation' ? (
          // Student Image Full Screen
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 mb-6">Upload Answer Sheets</Text>

            <TouchableOpacity onPress={pickImageFromCamera} activeOpacity={0.7}>
              <Card className="mb-5">
                <CardContent className="items-center py-6">
                  <View className="w-16 h-16 bg-[#B8E6E1] rounded-full items-center justify-center mb-3">
                    <Text className="text-4xl">📷</Text>
                  </View>
                  <Text className="text-base font-semibold text-gray-900 text-center">Take Picture</Text>
                </CardContent>
              </Card>
            </TouchableOpacity>
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
              <Card className="mb-5">
                <CardContent className="p-0">
                  <Image source={{ uri: selectedImage }} className="w-full h-72 rounded-xl" resizeMode="cover" />
                </CardContent>
              </Card>
            )}

            <Button onPress={handleStudentSubmit} size="lg">
              Submit Answer Sheet
            </Button>
          </View>
        ) : activeTab === 'profile' ? (
          <View className="flex-1">
            <Text className="text-2xl font-bold text-gray-900 mb-6">Profile</Text>
            <Card>
              <CardContent className="items-center py-8">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarFallback>
                    <Text className="text-4xl">👤</Text>
                  </AvatarFallback>
                </Avatar>
                <Text className="text-xl font-bold text-gray-900 mb-1">Teacher Name</Text>
                <Badge variant="secondary" className="mb-6">
                  <Text>Active</Text>
                </Badge>
                <Separator className="mb-6" />
                <Text className="text-sm text-gray-500 text-center">Profile page coming soon...</Text>
              </CardContent>
            </Card>
          </View>
        ) : null}
      </ScrollView>

      {/* Bottom Navigation */}
      <View className="absolute bottom-0 left-0 right-0 bg-white flex-row py-3 px-2 border-t border-gray-100">
        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => setActiveTab('home')}
        >
          <Text className={`text-2xl mb-1 ${activeTab === 'home' ? 'opacity-100' : 'opacity-50'}`}>🏠</Text>
          <Text className={`text-xs font-medium ${activeTab === 'home' ? 'text-[#4FD1C5]' : 'text-gray-500'}`}>
            Home
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => setActiveTab('evaluation')}
        >
          <Text className={`text-2xl mb-1 ${activeTab === 'evaluation' ? 'opacity-100' : 'opacity-50'}`}>✓</Text>
          <Text className={`text-xs font-medium ${activeTab === 'evaluation' ? 'text-[#4FD1C5]' : 'text-gray-500'}`}>
            Evaluation
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => {
            setActiveTab('co');
            setCoSubScreen('creation');
          }}
        >
          <Text className={`text-2xl mb-1 ${activeTab === 'co' ? 'opacity-100' : 'opacity-50'}`}>🗺️</Text>
          <Text className={`text-xs font-medium ${activeTab === 'co' ? 'text-[#4FD1C5]' : 'text-gray-500'}`}>
            CO Mapper
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          className="flex-1 items-center py-2"
          onPress={() => setActiveTab('profile')}
        >
          <Text className={`text-2xl mb-1 ${activeTab === 'profile' ? 'opacity-100' : 'opacity-50'}`}>👤</Text>
          <Text className={`text-xs font-medium ${activeTab === 'profile' ? 'text-[#4FD1C5]' : 'text-gray-500'}`}>
            Profile
          </Text>
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
    paddingTop: (StatusBar.currentHeight || 0) + 0,
    paddingBottom: 16,
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
  submitButtonDisabled: {
    backgroundColor: '#A0AEC0',
    shadowColor: '#A0AEC0',
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
  semesterGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'flex-start',
  },
  semesterButton: {
    width: '22.5%',
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#B8E6E1',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  semesterButtonActive: {
    backgroundColor: '#4FD1C5',
    borderColor: '#4FD1C5',
  },
  semesterText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    textAlign: 'center',
    marginBottom: 12
  },
  semesterTextActive: {
    color: '#FFFFFF',
  },
  subjectList: {
    gap: 10,
  },
  subjectButton: {
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#B8E6E1',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  subjectButtonActive: {
    backgroundColor: '#4FD1C5',
    borderColor: '#4FD1C5',
  },
  subjectButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#2D3748',
    textAlign: 'center',
  },
  subjectButtonTextActive: {
    color: '#FFFFFF',
  },
  coList: {
    gap: 12,
  },
  coCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    marginBottom: 12,
  },
  coCardContent: {
    flex: 1,
  },
  coCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  coCardTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2D3748',
    flex: 1,
  },
  coCardBadge: {
    backgroundColor: '#4FD1C5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  coCardBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  coCardDetails: {
    flexDirection: 'row',
    gap: 16,
  },
  coCardDetailText: {
    fontSize: 14,
    color: '#718096',
    fontWeight: '500',
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
    backgroundColor: '#ffffffff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
  },
  emptyStateIcon: {
    fontSize: 64,
    marginBottom: 16,
    opacity: 0.5,
  },
  emptyStateText: {
    fontSize: 16,
    color: '#718096',
    textAlign: 'center',
  },
  detailsScrollView: {
    flex: 1,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  detailCardNew: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
    marginBottom: 12,
  },
  detailCardTop: {
    backgroundColor: '#4FD1C5',
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  questionBadge: {
    alignItems: 'center',
  },
  questionBadgeLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFFFFF',
    opacity: 0.9,
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  questionBadgeNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  detailCardDivider: {
    height: 1,
    backgroundColor: '#E2E8F0',
  },
  detailCardBottom: {
    padding: 16,
    alignItems: 'center',
  },
  coLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#718096',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
  },
  coValueContainer: {
    backgroundColor: '#F7FAFC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4FD1C5',
  },
  coValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2D3748',
  },
});
