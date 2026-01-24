import * as ImagePicker from 'expo-image-picker';
import React, { useState } from 'react';
import {
  Alert,
  Image,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { SplashScreen } from '@/components/splash-screen';

export default function HomeScreen() {
  const [isLoading, setIsLoading] = useState(true);
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

              <Card className="mb-4">
                <CardContent>
                  <Input
                    label="SUBJECT NAME"
                    value={coSubjectName}
                    onChangeText={setCoSubjectName}
                    placeholder="Enter subject name"
                    containerClassName="mb-0"
                  />
                </CardContent>
              </Card>

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

              <Button onPress={handleCOSubmit} size="lg">
                Create CO
              </Button>
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
