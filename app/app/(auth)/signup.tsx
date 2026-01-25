import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView, Image, Alert } from 'react-native';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth-context';
import { authService } from '@/services/api/auth-service';

export default function SignupScreen() {
  const { login } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [institution, setInstitution] = useState('');
  const [profileImage, setProfileImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Please grant camera roll permissions to upload a profile picture');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      setProfileImage(result.assets[0]);
    }
  };

  const handleSignup = async () => {
    if (!name || !email || !password) {
      setError('Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authService.signup({
        teacher_name: name,
        email,
        password,
        institution: institution || undefined,
        pfp: profileImage ? {
          uri: profileImage.uri,
          name: `profile_${Date.now()}.jpg`,
          type: 'image/jpeg',
        } : undefined,
      });
      await login(response.access_token, response.teacher);
      router.replace('/(tabs)');
    } catch (err: any) {
      setError(err.message || 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      className="flex-1 bg-white"
    >
      <ScrollView contentContainerStyle={{ flexGrow: 1 }}>
        <View className="flex-1 justify-center px-8 py-8">
          {/* Header */}
          <View className="mb-8">
            <Text className="text-4xl font-bold text-black mb-2">Create Account</Text>
            <Text className="text-base text-gray-600">Sign up to get started</Text>
          </View>

          {/* Profile Picture Upload */}
          <View className="mb-6 items-center">
            <TouchableOpacity
              onPress={pickImage}
              className="w-24 h-24 rounded-full bg-gray-100 items-center justify-center border-2 border-gray-300 overflow-hidden"
              disabled={loading}
            >
              {profileImage ? (
                <Image source={{ uri: profileImage.uri }} className="w-full h-full" />
              ) : (
                <Feather name="camera" size={32} color="#999" />
              )}
            </TouchableOpacity>
            <Text className="text-xs text-gray-500 mt-2">Tap to upload profile picture</Text>
          </View>

          {/* Error Message */}
          {error ? (
            <View className="mb-4 p-3 bg-red-50 rounded-lg">
              <Text className="text-red-600 text-sm">{error}</Text>
            </View>
          ) : null}

          {/* Name Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Full Name *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="Enter your name"
              value={name}
              onChangeText={setName}
              editable={!loading}
            />
          </View>

          {/* Email Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Email *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="Enter your email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
          </View>

          {/* Institution Input */}
          <View className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-2">Institution</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="Enter your institution (optional)"
              value={institution}
              onChangeText={setInstitution}
              editable={!loading}
            />
          </View>

          {/* Password Input */}
          <View className="mb-6">
            <Text className="text-sm font-medium text-gray-700 mb-2">Password *</Text>
            <TextInput
              className="border border-gray-300 rounded-lg px-4 py-3 text-base"
              placeholder="Enter your password (min 6 characters)"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />
          </View>

          {/* Signup Button */}
          <TouchableOpacity
            className={`rounded-lg py-4 items-center mb-4 ${loading ? 'bg-gray-400' : 'bg-black'}`}
            onPress={handleSignup}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text className="text-white text-base font-semibold">Sign Up</Text>
            )}
          </TouchableOpacity>

          {/* Login Link */}
          <View className="flex-row justify-center">
            <Text className="text-gray-600">Already have an account? </Text>
            <TouchableOpacity onPress={() => router.push('/(auth)/login')}>
              <Text className="text-black font-semibold">Sign In</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
