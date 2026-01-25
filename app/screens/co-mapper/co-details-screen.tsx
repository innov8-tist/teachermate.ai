'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Pressable } from 'react-native';
import { coService, CODetail } from '@/services/api/co-service';
import { Feather } from '@expo/vector-icons';

interface CODetailsScreenProps {
  coId: number;
  onBack: () => void;
}

export const CODetailsScreen: React.FC<CODetailsScreenProps> = ({ coId, onBack }) => {
  const [coDetails, setCoDetails] = useState<CODetail[]>([]);

  useEffect(() => {
    fetchDetails();
  }, [coId]);

  const fetchDetails = async () => {
    const data = await coService.fetchCODetails(coId);
    setCoDetails(data);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Question-to-CO Mapping</Text>
            <Text style={styles.subtitle}>
              {coDetails.length} mapping{coDetails.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {coDetails.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="inbox" size={48} color="#d0d0d0" />
              </View>
              <Text style={styles.emptyTitle}>No mappings yet</Text>
              <Text style={styles.emptyText}>Create your first CO mapping to get started</Text>
            </View>
          ) : (
            <View style={styles.mappingsList}>
              {coDetails.map((detail, index) => (
                <View key={index} style={styles.mappingCard}>
                  <View style={styles.questionSection}>
                    <Text style={styles.labelSmall}>Question</Text>
                    <View style={styles.questionBox}>
                      <Text style={styles.questionNumber}>{detail.q_no}</Text>
                    </View>
                  </View>
                  
                  <View style={styles.arrowSection}>
                    <View style={styles.divider} />
                    <Feather name="arrow-right" size={20} color="#d0d0d0" />
                    <View style={styles.divider} />
                  </View>

                  <View style={styles.coSection}>
                    <Text style={styles.labelSmall}>CO</Text>
                    <View style={styles.coBox}>
                      <Text style={styles.coValue}>{detail.co_no}</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
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
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginBottom: 24,
    borderRadius: 8,
    width: 80,
  },
  backText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
    marginLeft: 6,
  },
  header: {
    marginBottom: 28,
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
  },
  mappingsList: {
    gap: 12,
  },
  mappingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  questionSection: {
    flex: 1,
    alignItems: 'center',
  },
  labelSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#999',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  questionBox: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    minWidth: 60,
    alignItems: 'center',
  },
  questionNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
  },
  arrowSection: {
    alignItems: 'center',
    marginHorizontal: 12,
    gap: 8,
  },
  divider: {
    width: 1,
    height: 12,
    backgroundColor: '#e0e0e0',
  },
  coSection: {
    flex: 1,
    alignItems: 'center',
  },
  coBox: {
    backgroundColor: '#000',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    minWidth: 60,
    alignItems: 'center',
  },
  coValue: {
    fontSize: 16,
    fontWeight: '700',
    color: '#fff',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 60,
  },
  emptyIcon: {
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000',
    marginBottom: 6,
  },
  emptyText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
  },
});
