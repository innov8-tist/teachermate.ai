import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import axios from 'axios';
import { BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';

interface HomeScreenProps {
  onNavigateToCO: () => void;
  onNavigateToEvaluation: () => void;
}

interface Context {
  semester: string;
  ia: string;
  branch: string;
  templateId: number;
  subjectName: string;
}

interface SummaryData {
  totalEvaluations: number;
  totalStudentsEvaluated: number;
  totalSubjects: number;
}

interface PerformanceData {
  averageScore: number;
  passRate: number;
  totalStudents: number;
}

interface ScoreRange {
  range: string;
  count: number;
  label: string;
}

interface QuestionInsight {
  questionNo: string;
  percentage: number;
  averageMarks: number;
}

interface QuestionInsightsData {
  averageMarksPerQuestion: number;
  lowestPerforming: QuestionInsight[];
  highestPerforming: QuestionInsight[];
}

interface COData {
  label: string;
  percentage: number;
  coNo: string;
}

interface COAttainmentData {
  cos: COData[];
  strongCOs: string[];
  weakCOs: string[];
  coverageComplete: boolean;
}

interface TrendData {
  label: string;
  value: number;
}

interface ClassTrendData {
  trend: TrendData[];
  hasData: boolean;
}

export const HomeScreen: React.FC<HomeScreenProps> = () => {
  const { token } = useAuth();

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [contexts, setContexts] = useState<Context[]>([]);
  const [currentContextIndex, setCurrentContextIndex] = useState(0);
  
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [performance, setPerformance] = useState<PerformanceData | null>(null);
  const [distribution, setDistribution] = useState<ScoreRange[]>([]);
  const [questionInsights, setQuestionInsights] = useState<QuestionInsightsData | null>(null);
  const [coAttainment, setCoAttainment] = useState<COAttainmentData | null>(null);
  const [classTrend, setClassTrend] = useState<ClassTrendData | null>(null);

  useEffect(() => {
    fetchContexts();
  }, []);

  useEffect(() => {
    if (contexts.length > 0) {
      fetchAnalyticsForContext(contexts[currentContextIndex]);
    }
  }, [currentContextIndex, contexts]);

  const fetchContexts = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const response = await axios.get(`${BASE_URL}/api/analytics/contexts`, { headers });
      setContexts(response.data.contexts);
      
      if (response.data.contexts.length > 0) {
        fetchAnalyticsForContext(response.data.contexts[0]);
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Error fetching contexts:', error);
      setLoading(false);
    }
  };

  const fetchAnalyticsForContext = async (context: Context) => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const params = {
        semester: context.semester,
        ia: context.ia,
        branch: context.branch
      };

      const [
        summaryRes,
        performanceRes,
        distributionRes,
        questionRes,
        coRes,
        trendRes
      ] = await Promise.all([
        axios.get(`${BASE_URL}/api/analytics/summary`, { headers, params }),
        axios.get(`${BASE_URL}/api/analytics/performance-overview`, { headers, params }),
        axios.get(`${BASE_URL}/api/analytics/score-distribution`, { headers, params }),
        axios.get(`${BASE_URL}/api/analytics/question-insights`, { headers, params }),
        axios.get(`${BASE_URL}/api/analytics/co-attainment`, { headers, params }),
        axios.get(`${BASE_URL}/api/analytics/class-performance-trend`, { headers, params })
      ]);

      setSummary(summaryRes.data);
      setPerformance(performanceRes.data);
      setDistribution(distributionRes.data.ranges);
      setQuestionInsights(questionRes.data);
      setCoAttainment(coRes.data);
      setClassTrend(trendRes.data);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cycleContext = () => {
    if (contexts.length > 1) {
      setCurrentContextIndex((prev) => (prev + 1) % contexts.length);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchContexts();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading analytics...</Text>
      </View>
    );
  }

  if (contexts.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyTitle}>No Data Available</Text>
        <Text style={styles.emptyText}>Start by creating CO mappings and evaluating students.</Text>
      </View>
    );
  }

  const currentContext = contexts[currentContextIndex];

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#111827']} />
      }
    >
      {/* Context Indicator */}
      <TouchableOpacity 
        style={styles.contextBanner} 
        onPress={cycleContext}
        activeOpacity={0.7}
      >
        <View style={styles.contextContent}>
          <Text style={styles.contextLabel}>Current Context</Text>
          <Text style={styles.contextValue}>
            {currentContext.semester} • {currentContext.ia} • {currentContext.branch}
          </Text>
          <Text style={styles.contextSubject}>{currentContext.subjectName}</Text>
        </View>
        {contexts.length > 1 && (
          <Text style={styles.contextCycle}>Tap to cycle →</Text>
        )}
      </TouchableOpacity>

      {/* Workload & Coverage Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionHeader}>Workload & Coverage</Text>
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <CardContent style={styles.kpiContent}>
              <Text style={styles.kpiNumber}>{summary?.totalEvaluations || 0}</Text>
              <Text style={styles.kpiLabel}>Evaluations</Text>
            </CardContent>
          </Card>

          <Card style={styles.kpiCard}>
            <CardContent style={styles.kpiContent}>
              <Text style={styles.kpiNumber}>{summary?.totalStudentsEvaluated || 0}</Text>
              <Text style={styles.kpiLabel}>Students</Text>
            </CardContent>
          </Card>

          <Card style={styles.kpiCard}>
            <CardContent style={styles.kpiContent}>
              <Text style={styles.kpiNumber}>{summary?.totalSubjects || 0}</Text>
              <Text style={styles.kpiLabel}>Subjects</Text>
            </CardContent>
          </Card>
        </View>
      </View>

      {/* Student Performance Overview */}
      <TouchableOpacity 
        style={styles.section} 
        onPress={cycleContext}
        activeOpacity={0.9}
      >
        <Text style={styles.sectionHeader}>Student Performance</Text>
        <Card style={styles.emphasisCard}>
          <CardContent style={styles.emphasisContent}>
            <View style={styles.performanceRow}>
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Average Score</Text>
                <Text style={styles.performanceNumber}>{performance?.averageScore.toFixed(1) || 0}%</Text>
              </View>
              <View style={styles.dividerVertical} />
              <View style={styles.performanceItem}>
                <Text style={styles.performanceLabel}>Pass Rate</Text>
                <Text style={styles.performanceNumber}>{performance?.passRate.toFixed(1) || 0}%</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>

      {/* Score Distribution */}
      <TouchableOpacity 
        style={styles.section} 
        onPress={cycleContext}
        activeOpacity={0.9}
      >
        <Text style={styles.sectionHeader}>Score Distribution</Text>
        <Card style={styles.chartCard}>
          <CardContent style={styles.chartContent}>
            <View style={styles.distributionGrid}>
              {distribution.map((item, index) => (
                <View key={index} style={styles.distributionCard}>
                  <Text style={styles.distributionLabel}>{item.label}</Text>
                  <Text style={styles.distributionCount}>{item.count}</Text>
                  <Text style={styles.distributionRange}>{item.range}</Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </TouchableOpacity>

      {/* Question-Level Insights */}
      <TouchableOpacity 
        style={styles.section} 
        onPress={cycleContext}
        activeOpacity={0.9}
      >
        <Text style={styles.sectionHeader}>Question Insights</Text>
        <Card style={styles.chartCard}>
          <CardContent style={styles.chartContent}>
            <View style={styles.insightRow}>
              <Text style={styles.insightLabel}>Average Performance</Text>
              <Text style={styles.insightValue}>{questionInsights?.averageMarksPerQuestion.toFixed(1) || 0}%</Text>
            </View>
            
            {questionInsights && questionInsights.lowestPerforming.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.insightSubheader}>Lowest Performing</Text>
                {questionInsights.lowestPerforming.map((q, idx) => (
                  <View key={idx} style={styles.questionRow}>
                    <Text style={styles.questionNo}>Q{q.questionNo}</Text>
                    <Text style={styles.questionPercentage}>{q.percentage}%</Text>
                  </View>
                ))}
              </>
            )}
            
            {questionInsights && questionInsights.highestPerforming.length > 0 && (
              <>
                <View style={styles.divider} />
                <Text style={styles.insightSubheader}>Highest Performing</Text>
                {questionInsights.highestPerforming.map((q, idx) => (
                  <View key={idx} style={styles.questionRow}>
                    <Text style={styles.questionNo}>Q{q.questionNo}</Text>
                    <Text style={styles.questionPercentage}>{q.percentage}%</Text>
                  </View>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </TouchableOpacity>

      {/* CO Attainment */}
      <TouchableOpacity 
        style={styles.section} 
        onPress={cycleContext}
        activeOpacity={0.9}
      >
        <Text style={styles.sectionHeader}>CO Attainment</Text>
        <Card style={styles.chartCard}>
          <CardContent style={styles.chartContent}>
            {coAttainment && coAttainment.cos.length > 0 ? (
              <>
                <View style={styles.coList}>
                  {coAttainment.cos.map((co, index) => (
                    <View key={index} style={styles.coRow}>
                      <View style={styles.coHeader}>
                        <Text style={styles.coLabel}>{co.label}</Text>
                        <Text style={styles.coPercentage}>{co.percentage}%</Text>
                      </View>
                      <View style={styles.coBarContainer}>
                        <View style={[styles.coBar, { width: `${co.percentage}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
                
                {(coAttainment.strongCOs.length > 0 || coAttainment.weakCOs.length > 0) && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.coSummaryRow}>
                      {coAttainment.strongCOs.length > 0 && (
                        <View style={styles.coSummaryItem}>
                          <Text style={styles.coSummaryLabel}>Strong</Text>
                          <Text style={styles.coSummaryValue}>{coAttainment.strongCOs.join(', ')}</Text>
                        </View>
                      )}
                      {coAttainment.weakCOs.length > 0 && (
                        <View style={styles.coSummaryItem}>
                          <Text style={styles.coSummaryLabel}>Needs Focus</Text>
                          <Text style={styles.coSummaryValue}>{coAttainment.weakCOs.join(', ')}</Text>
                        </View>
                      )}
                    </View>
                  </>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>No CO data available</Text>
            )}
          </CardContent>
        </Card>
      </TouchableOpacity>

      {/* Class Performance Trend */}
      <TouchableOpacity 
        style={[styles.section, styles.lastSection]} 
        onPress={cycleContext}
        activeOpacity={0.9}
      >
        <Text style={styles.sectionHeader}>Class Performance Trend</Text>
        <Card style={styles.chartCard}>
          <CardContent style={styles.chartContent}>
            {classTrend && classTrend.hasData && classTrend.trend.length > 0 ? (
              <>
                <View style={styles.trendList}>
                  {classTrend.trend.map((item, index) => (
                    <View key={index} style={styles.trendRow}>
                      <View style={styles.trendHeader}>
                        <Text style={styles.trendLabel}>{item.label}</Text>
                        <Text style={styles.trendValue}>{item.value}/50</Text>
                      </View>
                      <View style={styles.trendBarContainer}>
                        <View style={[styles.trendBar, { width: `${(item.value / 50) * 100}%` }]} />
                      </View>
                    </View>
                  ))}
                </View>
                
                {classTrend.trend.length > 1 && (
                  <>
                    <View style={styles.divider} />
                    <View style={styles.trendSummary}>
                      <Text style={styles.trendSummaryLabel}>
                        {classTrend.trend[classTrend.trend.length - 1].value > classTrend.trend[0].value 
                          ? '📈 Improving' 
                          : classTrend.trend[classTrend.trend.length - 1].value < classTrend.trend[0].value
                          ? '📉 Declining'
                          : '➡️ Stable'}
                      </Text>
                      <Text style={styles.trendSummaryText}>
                        {Math.abs(classTrend.trend[classTrend.trend.length - 1].value - classTrend.trend[0].value).toFixed(1)} marks change
                      </Text>
                    </View>
                  </>
                )}
              </>
            ) : (
              <Text style={styles.emptyText}>No trend data available. Complete evaluations for multiple IAs to see trends.</Text>
            )}
          </CardContent>
        </Card>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#6B7280',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
  },
  
  // Context Banner
  contextBanner: {
    backgroundColor: '#000000',
    padding: 20,
    marginBottom: 24,
    borderRadius: 12,
  },
  contextContent: {
    marginBottom: 8,
  },
  contextLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 1,
    marginBottom: 6,
  },
  contextValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  contextSubject: {
    fontSize: 13,
    color: '#D1D5DB',
  },
  contextCycle: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    textAlign: 'right',
  },
  
  // Sections
  section: {
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 40,
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 12,
    letterSpacing: 0.3,
  },

  // KPI Cards
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  kpiCard: {
    flex: 1,
    minWidth: '30%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  kpiContent: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  kpiNumber: {
    fontSize: 32,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Emphasis Card
  emphasisCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  emphasisContent: {
    paddingVertical: 24,
  },
  performanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  performanceItem: {
    flex: 1,
    alignItems: 'center',
  },
  performanceLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 8,
  },
  performanceNumber: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
  },
  dividerVertical: {
    width: 1,
    height: 60,
    backgroundColor: '#E5E7EB',
  },

  // Chart Cards
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
  },
  chartContent: {
    paddingVertical: 20,
  },

  // Distribution Grid
  distributionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  distributionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  distributionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  distributionCount: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  distributionRange: {
    fontSize: 10,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Question Insights
  insightRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  insightLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
  },
  insightValue: {
    fontSize: 20,
    fontWeight: '700',
    color: '#111827',
  },
  insightSubheader: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    marginTop: 12,
    marginBottom: 8,
    letterSpacing: 0.5,
  },
  questionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#FAFAFA',
    borderRadius: 6,
    marginBottom: 6,
  },
  questionNo: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },
  questionPercentage: {
    fontSize: 13,
    fontWeight: '600',
    color: '#6B7280',
  },

  // CO Attainment
  coList: {
    gap: 16,
  },
  coRow: {
    gap: 8,
  },
  coHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  coLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  coPercentage: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  coBarContainer: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  coBar: {
    height: '100%',
    backgroundColor: '#111827',
    borderRadius: 4,
  },
  coSummaryRow: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 12,
  },
  coSummaryItem: {
    flex: 1,
  },
  coSummaryLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  coSummaryValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#111827',
  },

  // Class Performance Trend
  trendList: {
    gap: 16,
  },
  trendRow: {
    gap: 8,
  },
  trendHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  trendLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
  },
  trendValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#111827',
  },
  trendBarContainer: {
    height: 8,
    backgroundColor: '#F3F4F6',
    borderRadius: 4,
    overflow: 'hidden',
  },
  trendBar: {
    height: '100%',
    backgroundColor: '#111827',
    borderRadius: 4,
  },
  trendSummary: {
    alignItems: 'center',
    marginTop: 8,
  },
  trendSummaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  trendSummaryText: {
    fontSize: 13,
    color: '#6B7280',
  },

  // Documentation Readiness (kept for backward compatibility, but not used)
  readinessGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  readinessItem: {
    alignItems: 'center',
    gap: 8,
  },
  readinessIndicator: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F3F4F6',
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  readinessComplete: {
    backgroundColor: '#111827',
    borderColor: '#111827',
  },
  readinessLabel: {
    fontSize: 11,
    fontWeight: '500',
    color: '#6B7280',
    textAlign: 'center',
  },
  completionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  completionLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },
  completionPercentage: {
    fontSize: 18,
    fontWeight: '700',
    color: '#111827',
  },
  completionBarContainer: {
    height: 12,
    backgroundColor: '#F3F4F6',
    borderRadius: 6,
    overflow: 'hidden',
  },
  completionBar: {
    height: '100%',
    backgroundColor: '#111827',
    borderRadius: 6,
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 16,
  },
});
