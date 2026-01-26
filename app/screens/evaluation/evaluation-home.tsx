import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { Card, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { evaluationService, type EvaluationSchema } from '@/services/api';

interface EvaluationHomeProps {
  onCreateNew: () => void;
  onViewSchema: (schema: EvaluationSchema) => void;
}

export function EvaluationHome({ onCreateNew, onViewSchema }: EvaluationHomeProps) {
  const [schemas, setSchemas] = useState<EvaluationSchema[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadSchemas = async () => {
    try {
      const data = await evaluationService.fetchEvaluationSchemas();
      setSchemas(data);
    } catch (error) {
      console.error('Failed to load schemas:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSchemas();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadSchemas();
  };

  const groupedSchemas = schemas.reduce((acc, schema) => {
    if (!acc[schema.subject_name]) {
      acc[schema.subject_name] = [];
    }
    acc[schema.subject_name].push(schema);
    return acc;
  }, {} as Record<string, EvaluationSchema[]>);

  return (
    <View className="flex-1 bg-gray-50">
      <View className="bg-white px-6 pt-12 pb-6 border-b border-gray-100">
        <Text className="text-3xl font-bold text-gray-900">Evaluation</Text>
        <Text className="text-gray-500 mt-1">Manage answer schemas and evaluations</Text>
      </View>

      <ScrollView
        className="flex-1 px-6 pt-6"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4FD1C5" />
        }
      >
        {loading ? (
          <View className="flex-1 items-center justify-center py-20">
            <Text className="text-gray-400">Loading...</Text>
          </View>
        ) : schemas.length === 0 ? (
          <View className="flex-1 items-center justify-center py-20">
            <View className="bg-white rounded-full w-24 h-24 items-center justify-center mb-6">
              <Text className="text-5xl">📄</Text>
            </View>
            <Text className="text-xl font-semibold text-gray-900 mb-2">
              No evaluation records found
            </Text>
            <Text className="text-gray-500 text-center px-8">
              Upload an answer schema to get started
            </Text>
          </View>
        ) : (
          <View className="pb-24">
            {Object.entries(groupedSchemas).map(([subject, subjectSchemas]) => (
              <View key={subject} className="mb-6">
                <Text className="text-sm font-semibold text-gray-600 uppercase tracking-wider mb-3 px-1">
                  {subject}
                </Text>
                {subjectSchemas.map((schema) => (
                  <TouchableOpacity
                    key={schema.id}
                    onPress={() => onViewSchema(schema)}
                    activeOpacity={0.7}
                    className="mb-3"
                  >
                    <Card>
                      <CardHeader>
                        <CardTitle>{schema.subject_name}</CardTitle>
                        <CardDescription>
                          {schema.question_count} questions • Created{' '}
                          {new Date(schema.created_at).toLocaleDateString()}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  </TouchableOpacity>
                ))}
              </View>
            ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        onPress={onCreateNew}
        className="absolute bottom-24 right-6 bg-[#4FD1C5] w-16 h-16 rounded-full items-center justify-center"
        style={{
          shadowColor: '#4FD1C5',
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.3,
          shadowRadius: 8,
          elevation: 8,
        }}
      >
        <Text className="text-white text-3xl font-light">+</Text>
      </TouchableOpacity>
    </View>
  );
}
