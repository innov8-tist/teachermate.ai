'use client';

import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, Alert, StyleSheet, ScrollView, Pressable } from 'react-native';
import { coService, CO } from '@/services/api/co-service';
import { useAuth } from '@/contexts/auth-context';
import { Feather } from '@expo/vector-icons';

interface MyCOsScreenProps {
  onCOClick: (coId: number) => void;
}

export const MyCOsScreen: React.FC<MyCOsScreenProps> = ({ 
  onCOClick
}) => {
  const { teacher } = useAuth();
  const [myCOs, setMyCOs] = useState<CO[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (teacher) {
      fetchCOs();
    }
  }, [teacher]);

  const fetchCOs = async () => {
    setIsLoading(true);
    if (!teacher) return;
    const data = await coService.fetchMyCOs(teacher.id);
    setMyCOs(data);
    setIsLoading(false);
  };

  const handleDelete = (coId: number, coName: string) => {
    Alert.alert('Delete CO', `Are you sure you want to delete ${coName}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const result = await coService.deleteCO(coId);
          if (result.status === 'success') {
            Alert.alert('Success', 'CO deleted successfully');
            fetchCOs();
          } else {
            Alert.alert('Error', result.message || 'Failed to delete CO');
          }
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false} style={styles.scrollView}>
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>CO Mappings</Text>
            {/* <Text style={styles.subtitle}>
              {myCOs.length} {myCOs.length === 1 ? 'mapping' : 'mappings'}
            </Text> */}
          </View>

          {isLoading ? (
            <View style={styles.loadingContainer}>
              <View style={styles.loadingSpinner}>
                <Text style={styles.loadingText}>Loading...</Text>
              </View>
            </View>
          ) : myCOs.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <Feather name="folder" size={48} color="#d0d0d0" />
              </View>
              <Text style={styles.emptyTitle}>No mappings yet</Text>
              <Text style={styles.emptyText}>Create your first CO mapping to get started</Text>
            </View>
          ) : (
            <View style={styles.coList}>
              {myCOs.map((co) => (
                <Pressable
                  key={co.id}
                  style={styles.coCard}
                  onPress={() => onCOClick(co.id)}
                >
                  <View style={styles.coContent}>
                    <View style={styles.coHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.coTitle}>{co.name}</Text>
                        <View style={styles.coMeta}>
                          <View style={styles.metaItem}>
                            <Feather name="book" size={13} color="#999" />
                            <Text style={styles.metaText}>{co.branch}</Text>
                          </View>
                          <View style={styles.metaDivider} />
                          <View style={styles.metaItem}>
                            <Feather name="layers" size={13} color="#999" />
                            <Text style={styles.metaText}>Sem {co.sem}</Text>
                          </View>
                          <View style={styles.metaDivider} />
                          <View style={styles.metaItem}>
                            <Feather name="check-square" size={13} color="#999" />
                            <Text style={styles.metaText}> {co.ia}</Text>
                          </View>
                        </View>
                      </View>
                      <Feather name="chevron-right" size={20} color="#d0d0d0" />
                    </View>
                  </View>
                  <Pressable
                    style={styles.deleteBtn}
                    onPress={() => handleDelete(co.id, co.name)}
                  >
                    <Feather name="trash-2" size={18} color="#999" />
                  </Pressable>
                </Pressable>
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
    position: 'relative',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    paddingBottom: 120, // Extra space for FABs
  },
  header: {
    marginBottom: 24,
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
  coList: {
    gap: 10,
  },
  coCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#e5e5e5',
    marginBottom: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  coContent: {
    flex: 1,
  },
  coHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  coTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#000',
    marginBottom: 8,
  },
  coMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 11,
    color: '#999',
    fontWeight: '500',
  },
  metaDivider: {
    width: 1,
    height: 12,
    backgroundColor: '#e0e0e0',
    marginHorizontal: 2,
  },
  deleteBtn: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginLeft: 8,
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
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 60,
    marginBottom: 60,
  },
  loadingSpinner: {
    padding: 20,
  },
  loadingText: {
    fontSize: 16,
    color: '#999',
    fontWeight: '500',
  },
});
