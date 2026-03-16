import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Image, TextInput, ActivityIndicator, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Feather } from '@expo/vector-icons';
import { useAuth } from '@/contexts/auth-context';
import { authService } from '@/services/api/auth-service';
import { Alert } from '@/utils/alert';

export function EditProfileScreen() {
  const { teacher, token, updateTeacher } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  
  const [fullName, setFullName] = useState(teacher?.teacher_name || '');
  const [institution, setInstitution] = useState(teacher?.institution || '');
  const [profileImage, setProfileImage] = useState<string | undefined>(teacher?.pfp_url);
  const [newImageFile, setNewImageFile] = useState<File | null>(null);

  const pickImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (file) {
        setNewImageFile(file);
        const reader = new FileReader();
        reader.onloadend = () => {
          setProfileImage(reader.result as string);
        };
        reader.readAsDataURL(file);
      }
    };
    
    input.click();
  };

  const handleSave = async () => {
    if (!token) {
      Alert.alert('Error', 'You must be logged in to update your profile');
      return;
    }

    if (!fullName.trim()) {
      Alert.alert('Validation Error', 'Full name is required');
      return;
    }

    setIsLoading(true);
    try {
      const updateData: any = {};
      
      if (fullName !== teacher?.teacher_name) {
        updateData.teacher_name = fullName.trim();
      }
      
      if (institution !== teacher?.institution) {
        updateData.institution = institution.trim();
      }
      
      if (newImageFile) {
        updateData.pfp = newImageFile;
      }

      const updatedTeacher = await authService.updateProfile(token, updateData);
      
      updateTeacher(updatedTeacher);
      
      Alert.alert('Success', 'Profile updated successfully', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } catch (error: any) {
      console.error('Failed to update profile:', error);
      Alert.alert('Error', error.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Profile</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Profile Picture */}
        <View style={styles.imageSection}>
          <TouchableOpacity onPress={pickImage} style={styles.imageContainer}>
            {profileImage ? (
              <Image 
                source={{ uri: profileImage }} 
                style={styles.profileImage}
                resizeMode="cover"
              />
            ) : (
              <Feather name="user" size={48} color="#999" />
            )}
            <View style={styles.editBadge}>
              <Feather name="camera" size={16} color="#fff" />
            </View>
          </TouchableOpacity>
          <Text style={styles.imageHint}>Tap to change profile picture</Text>
        </View>

        {/* Form Fields */}
        <View style={styles.form}>
          {/* Full Name */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Full Name *</Text>
            <View style={styles.inputWrapper}>
              <Feather name="user" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={fullName}
                onChangeText={setFullName}
                placeholder="Enter your full name"
                placeholderTextColor="#999"
              />
            </View>
          </View>

          {/* Email (Read-only) */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Email</Text>
            <View style={[styles.inputWrapper, styles.disabledInput]}>
              <Feather name="mail" size={20} color="#999" style={styles.inputIcon} />
              <Text style={styles.disabledText}>{teacher?.email}</Text>
            </View>
            <Text style={styles.hint}>Email cannot be changed</Text>
          </View>

          {/* Institution */}
          <View style={styles.fieldContainer}>
            <Text style={styles.label}>Institution</Text>
            <View style={styles.inputWrapper}>
              <Feather name="briefcase" size={20} color="#666" style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={institution}
                onChangeText={setInstitution}
                placeholder="Enter your institution"
                placeholderTextColor="#999"
              />
            </View>
          </View>
        </View>

        {/* Save Button */}
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, isLoading && styles.saveButtonDisabled]}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Feather name="check" size={20} color="#fff" />
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </>
          )}
        </TouchableOpacity>

        {/* Cancel Button */}
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.cancelButton}
          disabled={isLoading}
        >
          <Text style={styles.cancelButtonText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#000',
  },
  placeholder: {
    width: 40,
  },
  imageSection: {
    alignItems: 'center',
    marginBottom: 32,
  },
  imageContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#e5e5e5',
    overflow: 'hidden',
    position: 'relative',
  },
  profileImage: {
    width: '100%',
    height: '100%',
  },
  editBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#000',
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 3,
    borderColor: '#fff',
  },
  imageHint: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  form: {
    marginBottom: 24,
  },
  fieldContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginBottom: 8,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: '#e5e5e5',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#000',
    outlineStyle: 'none',
  } as any,
  disabledInput: {
    backgroundColor: '#f5f5f5',
  },
  disabledText: {
    flex: 1,
    fontSize: 16,
    color: '#999',
  },
  hint: {
    fontSize: 12,
    color: '#999',
    marginTop: 6,
  },
  saveButton: {
    backgroundColor: '#000',
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
    fontWeight: '600',
  },
});
