import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, Dimensions, ActivityIndicator, RefreshControl } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { PieChart, LineChart } from 'react-native-gifted-charts';
import axios from 'axios';
import { BASE_URL } from '@/constants/api';
import { useAuth } from '@/contexts/auth-context';

interface HomeScreenProps {
  onNavigateToCO: () => void;
  onNavigateToEvaluation: () => void;
}

interface SummaryData {
  totalEvaluations: number;
  pendingEvaluations: number;
  completedEvaluations: number;
  totalStudentsEvaluated: number;
}

interface EvaluationOverview {
  averageScore: number;
  totalQuestionsEvaluated: number;
}

interface EvaluationStatus {
  pending: number;
  completed: number;
  total: number;
}

interface PerformanceRange {
  range: string;
  count: number;
}

interface TrendData {
  label: string;
  value: number;
}

interface COData {
  label: string;
  percentage: number;
}

export const HomeScreen: React.FC<HomeScreenProps> = () => {
  const { token } = useAuth();
  const screenWidth = Dimensions.get('window').width - 80;

  // State
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [overview, setOverview] = useState<EvaluationOverview | null>(null);
  const [status, setStatus] = useState<EvaluationStatus | null>(null);
  const [distribution, setDistribution] = useState<PerformanceRange[]>([]);
  const [trend, setTrend] = useState<TrendData[]>([]);
  const [coAttainment, setCoAttainment] = useState<COData[]>([]);

  useEffect(() => {
    fetchAllData();
  }, []);

  const fetchAllData = async () => {
    try {
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const [
        summaryRes,
        overviewRes,
        statusRes,
        distributionRes,
        trendRes,
        coRes
      ] = await Promise.all([
        axios.get(`${BASE_URL}/api/analytics/summary`, { headers }),
        axios.get(`${BASE_URL}/api/analytics/evaluation-overview`, { headers }),
        axios.get(`${BASE_URL}/api/analytics/evaluation-status`, { headers }),
        axios.get(`${BASE_URL}/api/analytics/student-distribution`, { headers }),
        axios.get(`${BASE_URL}/api/analytics/evaluation-trend`, { headers }),
        axios.get(`${BASE_URL}/api/analytics/co-attainment`, { headers })
      ]);

      setSummary(summaryRes.data);
      setOverview(overviewRes.data);
      setStatus(statusRes.data);
      setDistribution(distributionRes.data.ranges);
      setTrend(trendRes.data.data);
      setCoAttainment(coRes.data.cos);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchAllData();
  };

  const pieData = status ? [
    { value: status.pending, color: '#9CA3AF', text: status.pending.toString() },
    { value: status.completed, color: '#111827', text: status.completed.toString() },
  ] : [];

  const trendData = trend.map(item => ({
    value: item.value,
    label: item.label
  }));

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#111827" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#111827']} />
      }
    >
      {/* KPI Summary Section */}
      <View style={styles.section}>
        <View style={styles.kpiGrid}>
          <Card style={styles.kpiCard}>
            <CardContent style={styles.kpiContent}>
              <Text style={styles.kpiMicro}>TOTAL</Text>
              <Text style={styles.kpiNumber}>{summary?.totalEvaluations || 0}</Text>
              <Text style={styles.kpiLabel}>Evaluations</Text>
            </CardContent>
          </Card>

          <Card style={styles.kpiCard}>
            <CardContent style={styles.kpiContent}>
              <Text style={styles.kpiMicro}>PENDING</Text>
              <Text style={styles.kpiNumber}>{summary?.pendingEvaluations || 0}</Text>
              <Text style={styles.kpiLabel}>Evaluations</Text>
            </CardContent>
          </Card>

          <Card style={styles.kpiCard}>
            <CardContent style={styles.kpiContent}>
              <Text style={styles.kpiMicro}>COMPLETED</Text>
              <Text style={styles.kpiNumber}>{summary?.completedEvaluations || 0}</Text>
              <Text style={styles.kpiLabel}>Evaluations</Text>
            </CardContent>
          </Card>

          <Card style={styles.kpiCard}>
            <CardContent style={styles.kpiContent}>
              <Text style={styles.kpiMicro}>STUDENTS</Text>
              <Text style={styles.kpiNumber}>{summary?.totalStudentsEvaluated || 0}</Text>
              <Text style={styles.kpiLabel}>Evaluated</Text>
            </CardContent>
          </Card>
        </View>
      </View>

      {/* Evaluation Overview - Emphasized Card */}
      <View style={styles.section}>
        <Card style={styles.emphasisCard}>
          <CardContent style={styles.emphasisContent}>
            <View style={styles.emphasisPrimary}>
              <Text style={styles.emphasisLabel}>Average Score</Text>
              <Text style={styles.emphasisNumber}>{overview?.averageScore.toFixed(1) || 0}%</Text>
            </View>
            <View style={styles.divider} />
            <View style={styles.emphasisSecondary}>
              <Text style={styles.secondaryLabel}>Total Questions Evaluated</Text>
              <Text style={styles.secondaryNumber}>{overview?.totalQuestionsEvaluated.toLocaleString() || 0}</Text>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Evaluation Status Pie Chart */}
      <View style={styles.section}>
        <Card style={styles.chartCard}>
          <CardContent style={styles.chartContent}>
            <Text style={styles.sectionTitle}>Evaluation Status</Text>
            <View style={styles.chartWrapper}>
              <PieChart
                data={pieData}
                donut
                radius={80}
                innerRadius={50}
                centerLabelComponent={() => (
                  <View style={styles.pieCenter}>
                    <Text style={styles.pieCenterNumber}>{status?.total || 0}</Text>
                    <Text style={styles.pieCenterLabel}>Total</Text>
                  </View>
                )}
              />
            </View>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#9CA3AF' }]} />
                <Text style={styles.legendText}>Pending ({status?.pending || 0})</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: '#111827' }]} />
                <Text style={styles.legendText}>Completed ({status?.completed || 0})</Text>
              </View>
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Student Performance Distribution */}
      <View style={styles.section}>
        <Card style={styles.chartCard}>
          <CardContent style={styles.chartContent}>
            <Text style={styles.sectionTitle}>Student Performance Distribution</Text>
            <View style={styles.distributionGrid}>
              {distribution.map((item, index) => (
                <View key={index} style={styles.distributionCard}>
                  <Text style={styles.distributionRange}>{item.range}</Text>
                  <Text style={styles.distributionCount}>{item.count}</Text>
                  <Text style={styles.distributionLabel}>students</Text>
                </View>
              ))}
            </View>
          </CardContent>
        </Card>
      </View>

      {/* Evaluation Trend Line Chart */}
      <View style={styles.section}>
        <Card style={styles.chartCard}>
          <CardContent style={styles.chartContent}>
            <Text style={styles.sectionTitle}>Evaluation Trend</Text>
            <View style={styles.chartWrapper}>
              <LineChart
                data={trendData}
                width={screenWidth}
                height={240}
                spacing={50}
                color="#111827"
                thickness={2.5}
                startFillColor="rgba(17, 24, 39, 0.08)"
                endFillColor="rgba(17, 24, 39, 0.01)"
                startOpacity={0.3}
                endOpacity={0.1}
                initialSpacing={10}
                noOfSections={4}
                yAxisColor="#E5E7EB"
                xAxisColor="#E5E7EB"
                yAxisThickness={1}
                xAxisThickness={1}
                yAxisTextStyle={styles.axisText}
                xAxisLabelTextStyle={styles.axisText}
                curved
                areaChart
              />
            </View>
          </CardContent>
        </Card>
      </View>

      {/* CO Attainment Overview */}
      <View style={[styles.section, styles.lastSection]}>
        <Card style={styles.chartCard}>
          <CardContent style={styles.chartContent}>
            <Text style={styles.sectionTitle}>CO Attainment Overview</Text>
            <View style={styles.coList}>
              {coAttainment.map((co, index) => (
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
          </CardContent>
        </Card>
      </View>
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
  section: {
    marginBottom: 24,
  },
  lastSection: {
    marginBottom: 40,
  },

  // KPI Cards
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  kpiCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  kpiContent: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  kpiMicro: {
    fontSize: 10,
    fontWeight: '700',
    color: '#9CA3AF',
    letterSpacing: 1.2,
    marginBottom: 8,
  },
  kpiNumber: {
    fontSize: 42,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 48,
    marginBottom: 4,
  },
  kpiLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#6B7280',
  },

  // Emphasis Card
  emphasisCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
  },
  emphasisContent: {
    paddingVertical: 32,
  },
  emphasisPrimary: {
    alignItems: 'center',
    marginBottom: 24,
  },
  emphasisLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    letterSpacing: 0.3,
  },
  emphasisNumber: {
    fontSize: 56,
    fontWeight: '700',
    color: '#111827',
    lineHeight: 64,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginHorizontal: 32,
    marginBottom: 24,
  },
  emphasisSecondary: {
    alignItems: 'center',
  },
  secondaryLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: '#9CA3AF',
    marginBottom: 8,
  },
  secondaryNumber: {
    fontSize: 28,
    fontWeight: '600',
    color: '#374151',
  },

  // Chart Cards
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E5E7EB',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  chartContent: {
    paddingVertical: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 20,
    letterSpacing: 0.2,
  },
  chartWrapper: {
    alignItems: 'center',
    paddingVertical: 16,
  },

  // Pie Chart
  pieCenter: {
    alignItems: 'center',
  },
  pieCenterNumber: {
    fontSize: 28,
    fontWeight: '700',
    color: '#111827',
  },
  pieCenterLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '500',
    marginTop: 2,
  },
  legend: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 24,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
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
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  distributionRange: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  distributionCount: {
    fontSize: 36,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 4,
  },
  distributionLabel: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '500',
  },

  // Line Chart
  axisText: {
    color: '#9CA3AF',
    fontSize: 10,
    fontWeight: '500',
  },

  // CO Attainment
  coList: {
    gap: 20,
  },
  coRow: {
    gap: 10,
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
    letterSpacing: 0.3,
  },
  coPercentage: {
    fontSize: 15,
    fontWeight: '700',
    color: '#111827',
  },
  coBarContainer: {
    height: 10,
    backgroundColor: '#F3F4F6',
    borderRadius: 5,
    overflow: 'hidden',
  },
  coBar: {
    height: '100%',
    backgroundColor: '#111827',
    borderRadius: 5,
  },
});
