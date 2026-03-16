'use client';

import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Image, StyleSheet, ScrollView, Pressable, TextInput } from 'react-native';
import { useAuth } from '@/contexts/auth-context';
import { coService, Subject } from '@/services/api/co-service';
import { Feather } from '@expo/vector-icons';
import { Alert } from '@/utils/alert';
import { API_ENDPOINTS } from '@/constants/api';

interface COCreationScreenProps {
    onSuccess?: () => void;
}

export const COCreationScreen: React.FC<COCreationScreenProps> = ({ onSuccess }) => {
    console.log('🌐 Using WEB version of COCreationScreen');
    const { token } = useAuth();
    const [selectedSemester, setSelectedSemester] = useState<string>('');
    const [subjects, setSubjects] = useState<Subject[]>([]);
    const [subjectName, setSubjectName] = useState('');
    const [selectedOption, setSelectedOption] = useState<'1' | '2' | null>(null);
    const [studentCount, setStudentCount] = useState<string>('');
    const [uploadedImage, setUploadedImage] = useState<string | null>(null);
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSemesterSelect = async (sem: string) => {
        setSelectedSemester(sem);
        const fetchedSubjects = await coService.fetchSubjects(sem);
        setSubjects(fetchedSubjects);
    };

    const handleImagePick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';

        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (file) {
                setImageFile(file);
                const reader = new FileReader();
                reader.onloadend = () => {
                    setUploadedImage(reader.result as string);
                };
                reader.readAsDataURL(file);
            }
        };

        input.click();
    };

    const handleSubmit = async () => {
        if (!selectedSemester || !subjectName || !selectedOption || !studentCount || !imageFile) {
            Alert.alert('Missing Information', 'Please fill all fields and upload CO table');
            return;
        }

        const studentCountNum = parseInt(studentCount, 10);
        if (isNaN(studentCountNum) || studentCountNum <= 0) {
            Alert.alert('Invalid Input', 'Please enter a valid student count');
            return;
        }

        if (!token) {
            Alert.alert('Authentication Error', 'Please login again');
            return;
        }

        console.log('=== CO Creation Debug (Web) ===');
        console.log('Token (first 50 chars):', token.substring(0, 50));
        console.log('Student Count:', studentCountNum);
        console.log('Image File:', imageFile.name, imageFile.type, imageFile.size);
        console.log('===============================');

        setIsSubmitting(true);

        try {
            const formData = new FormData();
            formData.append('subject_name', subjectName);
            formData.append('sem', selectedSemester);
            formData.append('ia_number', selectedOption);
            formData.append('student_count', studentCountNum.toString());
            formData.append('co_image', imageFile, imageFile.name);

            // Log FormData contents
            console.log('📤 FormData contents:');
            for (const [key, value] of formData.entries()) {
                if (value instanceof File) {
                    console.log(`  ${key}:`, {
                        name: value.name,
                        type: value.type,
                        size: value.size
                    });
                } else {
                    console.log(`  ${key}:`, value);
                }
            }

            console.log('📤 Sending FormData to:', API_ENDPOINTS.CO_CREATION);

            const response = await fetch(API_ENDPOINTS.CO_CREATION, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                },
                body: formData,
            });

            console.log('📥 Response status:', response.status);
            console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));

            const responseText = await response.text();
            console.log('📥 Response text:', responseText);

            let result;
            try {
                result = JSON.parse(responseText);
            } catch (e) {
                console.error('Failed to parse response as JSON:', responseText);
                throw new Error('Invalid response from server');
            }

            console.log('📥 Parsed result:', result);

            if (response.ok && result.status === 'success') {
                Alert.alert('Success', 'CO created successfully!', [
                    {
                        text: 'OK',
                        onPress: () => {
                            // Reset form
                            setSelectedSemester('');
                            setSubjectName('');
                            setSelectedOption(null);
                            setStudentCount('');
                            setUploadedImage(null);
                            setImageFile(null);
                            setSubjects([]);
                            // Navigate back to My CO's
                            onSuccess?.();
                        }
                    }
                ]);
            } else {
                Alert.alert('Error', result.message || 'Failed to create CO');
            }
        } catch (error: any) {
            console.error('CO Creation Error:', error);
            Alert.alert('Error', error.message || 'Failed to submit CO creation');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            <View style={styles.content}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.title}>Create CO Mapping</Text>
                    <Text style={styles.subtitle}>Define course outcomes for your class</Text>
                </View>

                {/* Semester Selection */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <View style={styles.stepBadge}>
                            <Text style={styles.stepNumber}>1</Text>
                        </View>
                        <View style={styles.stepContent}>
                            <Text style={styles.sectionTitle}>Select Semester</Text>
                            <Text style={styles.sectionDesc}>Choose the academic semester</Text>
                        </View>
                    </View>
                    <View style={styles.semesterGrid}>
                        {['1', '2', '3', '4', '5', '6', '7', '8'].map((sem) => (
                            <Pressable
                                key={sem}
                                style={[styles.semesterBtn, selectedSemester === sem && styles.semesterBtnActive]}
                                onPress={() => handleSemesterSelect(sem)}
                            >
                                <Text style={[styles.semesterText, selectedSemester === sem && styles.semesterTextActive]}>
                                    {sem}
                                </Text>
                            </Pressable>
                        ))}
                    </View>
                </View>

                {/* Subject Selection */}
                {selectedSemester && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepNumber}>2</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.sectionTitle}>Select Subject</Text>
                                <Text style={styles.sectionDesc}>Choose the subject for this CO</Text>
                            </View>
                        </View>
                        <View style={styles.subjectList}>
                            {subjects.map((subject, index) => (
                                <Pressable
                                    key={index}
                                    style={[styles.subjectBtn, subjectName === subject.name && styles.subjectBtnActive]}
                                    onPress={() => setSubjectName(subject.name)}
                                >
                                    <Text style={[styles.subjectText, subjectName === subject.name && styles.subjectTextActive]}>
                                        {subject.name}
                                    </Text>
                                    {subjectName === subject.name && (
                                        <Feather name="check" size={20} color="#000" />
                                    )}
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}

                {/* IA Selection */}
                {selectedSemester && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepNumber}>3</Text>
                            </View>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sectionTitle}>Assessment Type</Text>
                                <Text style={styles.sectionDesc}>Internal assessment 1 or 2</Text>
                            </View>
                        </View>
                        <View style={styles.iaGrid}>
                            {['1', '2'].map((option) => (
                                <Pressable
                                    key={option}
                                    style={[styles.iaBtn, selectedOption === option && styles.iaBtnActive]}
                                    onPress={() => setSelectedOption(option as '1' | '2')}
                                >
                                    <View
                                        style={[
                                            styles.iaRadio,
                                            selectedOption === option && styles.iaRadioActive,
                                        ]}
                                    >
                                        {selectedOption === option && (
                                            <View style={styles.iaRadioDot} />
                                        )}
                                    </View>
                                    <Text style={[styles.iaText, selectedOption === option && styles.iaTextActive]}>
                                        IA {option}
                                    </Text>
                                </Pressable>
                            ))}
                        </View>
                    </View>
                )}

                {/* Student Count */}
                {selectedSemester && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepNumber}>4</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.sectionTitle}>Number of Students</Text>
                                <Text style={styles.sectionDesc}>Total students in this class</Text>
                            </View>
                        </View>
                        <TextInput
                            style={styles.input}
                            placeholder="Enter student count (e.g., 60)"
                            placeholderTextColor="#999"
                            value={studentCount}
                            onChangeText={setStudentCount}
                            maxLength={3}
                        />
                    </View>
                )}

                {/* Image Upload */}
                {selectedSemester && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <View style={styles.stepBadge}>
                                <Text style={styles.stepNumber}>5</Text>
                            </View>
                            <View style={styles.stepContent}>
                                <Text style={styles.sectionTitle}>Upload CO Mapping</Text>
                                <Text style={styles.sectionDesc}>Photo of question to CO mapping</Text>
                            </View>
                        </View>
                        <Pressable style={styles.uploadBox} onPress={handleImagePick}>
                            {uploadedImage ? (
                                <>
                                    <Image
                                        source={{ uri: uploadedImage }}
                                        style={styles.uploadedImage}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.uploadedOverlay}>
                                        <Feather name="check-circle" size={32} color="#fff" />
                                    </View>
                                </>
                            ) : (
                                <View style={styles.uploadContent}>
                                    <View style={styles.uploadIconBox}>
                                        <Feather name="upload-cloud" size={28} color="#000" />
                                    </View>
                                    <Text style={styles.uploadText}>Tap to upload</Text>
                                    <Text style={styles.uploadSubtext}>PNG, JPG up to 5MB</Text>
                                </View>
                            )}
                        </Pressable>
                    </View>
                )}

                {/* Submit Button */}
                <Pressable
                    style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || !selectedSemester || !subjectName || !selectedOption || !studentCount || !imageFile}
                >
                    <Text style={styles.submitText}>
                        {isSubmitting ? 'Creating...' : 'Create CO Mapping'}
                    </Text>
                </Pressable>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#ffffff',
    },
    content: {
        paddingHorizontal: 20,
        paddingVertical: 16,
        paddingBottom: 32,
    },
    header: {
        marginBottom: 32,
    },
    title: {
        fontSize: 32,
        fontWeight: '700',
        color: '#000',
        marginBottom: 6,
        letterSpacing: -0.5,
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        fontWeight: '400',
    },
    section: {
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#e9ecef',
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16,
        gap: 12,
    },
    stepBadge: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: '#000000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepNumber: {
        fontSize: 14,
        fontWeight: '700',
        color: '#ffffff',
    },
    stepContent: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#000',
        marginBottom: 4,
    },
    sectionDesc: {
        fontSize: 13,
        color: '#666',
    },
    semesterGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'space-between',
    },
    semesterBtn: {
        width: '22%',
        aspectRatio: 1,
        backgroundColor: '#ffffff',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#e9ecef',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
        cursor: 'pointer',
    } as any,
    semesterBtnActive: {
        backgroundColor: '#000000',
        borderColor: '#000000',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    semesterText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333333',
    },
    semesterTextActive: {
        color: '#ffffff',
    },
    subjectList: {
        gap: 8,
    },
    subjectBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 14,
        paddingHorizontal: 16,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        cursor: 'pointer',
    } as any,
    subjectBtnActive: {
        backgroundColor: '#000',
        borderColor: '#000',
    },
    subjectText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    subjectTextActive: {
        color: '#fff',
    },
    iaGrid: {
        flexDirection: 'row',
        gap: 12,
    },
    iaBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        paddingHorizontal: 14,
        backgroundColor: '#f9f9f9',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#f0f0f0',
        gap: 10,
        cursor: 'pointer',
    } as any,
    iaBtnActive: {
        backgroundColor: '#000',
        borderColor: '#000',
    },
    iaRadio: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#d0d0d0',
        justifyContent: 'center',
        alignItems: 'center',
    },
    iaRadioActive: {
        borderColor: '#fff',
    },
    iaRadioDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#fff',
    },
    iaText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
    },
    iaTextActive: {
        color: '#fff',
    },
    input: {
        backgroundColor: '#ffffff',
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        paddingVertical: 14,
        paddingHorizontal: 16,
        fontSize: 15,
        color: '#000',
        fontWeight: '500',
        outlineStyle: 'none',
    } as any,
    uploadBox: {
        height: 160,
        backgroundColor: '#f9f9f9',
        borderRadius: 12,
        borderWidth: 2,
        borderColor: '#f0f0f0',
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
    } as any,
    uploadContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    uploadIconBox: {
        width: 56,
        height: 56,
        borderRadius: 12,
        backgroundColor: '#f0f0f0',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    uploadText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#000',
        marginBottom: 2,
    },
    uploadSubtext: {
        fontSize: 11,
        color: '#999',
    },
    uploadedImage: {
        width: '100%',
        height: '100%',
    },
    uploadedOverlay: {
        position: 'absolute',
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        width: '100%',
        height: '100%',
        justifyContent: 'center',
        alignItems: 'center',
    },
    submitBtn: {
        backgroundColor: '#000',
        paddingVertical: 16,
        borderRadius: 10,
        alignItems: 'center',
        marginTop: 8,
        cursor: 'pointer',
    } as any,
    submitBtnDisabled: {
        backgroundColor: '#ccc',
        cursor: 'not-allowed',
    } as any,
    submitText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '700',
    },
});
