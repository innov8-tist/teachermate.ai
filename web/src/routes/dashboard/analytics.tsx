import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authStorage } from '@/lib/auth';
import { analyticsAPI, type Context, type SummaryData, type PerformanceData, type ScoreRange, type QuestionInsightsData, type COAttainmentData, type ClassTrendData } from '@/lib/analytics-api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight, RefreshCw, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export const Route = createFileRoute('/dashboard/analytics')({
  component: AnalyticsDashboard,
});

function AnalyticsDashboard() {
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
      const token = authStorage.getToken();
      if (!token) return;

      const response = await analyticsAPI.getContexts(token);
      setContexts(response.contexts);
      
      if (response.contexts.length > 0) {
        fetchAnalyticsForContext(response.contexts[0]);
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
      const token = authStorage.getToken();
      if (!token) return;

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
        analyticsAPI.getSummary(token, params),
        analyticsAPI.getPerformanceOverview(token, params),
        analyticsAPI.getScoreDistribution(token, params),
        analyticsAPI.getQuestionInsights(token, params),
        analyticsAPI.getCOAttainment(token, params),
        analyticsAPI.getClassPerformanceTrend(token, { semester: params.semester, branch: params.branch })
      ]);

      setSummary(summaryRes);
      setPerformance(performanceRes);
      setDistribution(distributionRes.ranges);
      setQuestionInsights(questionRes);
      setCoAttainment(coRes);
      setClassTrend(trendRes);
    } catch (error) {
      console.error('Error fetching analytics:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const cycleContext = (direction: 'prev' | 'next') => {
    if (contexts.length <= 1) return;
    
    setCurrentContextIndex((prev) => {
      if (direction === 'next') {
        return (prev + 1) % contexts.length;
      } else {
        return prev === 0 ? contexts.length - 1 : prev - 1;
      }
    });
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchContexts();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-10 h-10 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-lg text-gray-600 font-medium">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (contexts.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-screen p-8">
        <div className="text-center max-w-md">
          <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <TrendingUp className="w-12 h-12 text-gray-400" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Data Available</h2>
          <p className="text-gray-600">Start by creating CO mappings and evaluating students to see analytics.</p>
        </div>
      </div>
    );
  }

  const currentContext = contexts[currentContextIndex];

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-[1600px] mx-auto p-8">
        {/* Header Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-4xl font-bold text-gray-900 mb-2">Analytics Dashboard</h1>
              <p className="text-lg text-gray-600">Real-time insights into student performance and CO attainment</p>
            </div>
            <Button
              onClick={onRefresh}
              disabled={refreshing}
              variant="outline"
              className="h-11 px-6"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </div>

          {/* Context Selector */}
          <Card className="bg-gradient-to-r from-gray-900 to-gray-800 border-0 shadow-xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Current Context</p>
                  <h3 className="text-2xl font-bold text-white mb-1">
                    {currentContext.semester} • {currentContext.ia} • {currentContext.branch}
                  </h3>
                  <p className="text-base text-gray-300">{currentContext.subjectName}</p>
                </div>
                {contexts.length > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      onClick={() => cycleContext('prev')}
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </Button>
                    <div className="px-4 py-2 bg-white/10 rounded-full">
                      <span className="text-sm font-medium text-white">
                        {currentContextIndex + 1} / {contexts.length}
                      </span>
                    </div>
                    <Button
                      onClick={() => cycleContext('next')}
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 text-white"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border hover:shadow-lg transition-shadow">
            <CardContent className="p-8 text-center">
              <div className="text-5xl font-extrabold text-gray-900 mb-3">{summary?.totalEvaluations || 0}</div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Evaluations</p>
            </CardContent>
          </Card>

          <Card className="border hover:shadow-lg transition-shadow">
            <CardContent className="p-8 text-center">
              <div className="text-5xl font-extrabold text-gray-900 mb-3">{summary?.totalStudentsEvaluated || 0}</div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Students Evaluated</p>
            </CardContent>
          </Card>

          <Card className="border hover:shadow-lg transition-shadow">
            <CardContent className="p-8 text-center">
              <div className="text-5xl font-extrabold text-gray-900 mb-3">{summary?.totalSubjects || 0}</div>
              <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Subjects</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Overview */}
        <Card className="mb-8 border shadow-lg">
          <CardHeader>
            <CardTitle className="text-2xl">Student Performance Overview</CardTitle>
            <CardDescription>Average scores and pass rates</CardDescription>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              <div className="text-center">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Average Score</p>
                <div className="text-6xl font-extrabold text-gray-900 mb-2">{performance?.averageScore.toFixed(1) || 0}%</div>
              </div>
              <div className="text-center border-l border-gray-200">
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-4">Pass Rate</p>
                <div className="text-6xl font-extrabold text-gray-900 mb-2">{performance?.passRate.toFixed(1) || 0}%</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Score Distribution & Question Insights */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Score Distribution */}
          <Card className="border shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Score Distribution</CardTitle>
              <CardDescription>Students by performance range</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                {distribution.map((item, index) => (
                  <div
                    key={index}
                    className="p-6 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all"
                  >
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">{item.label}</p>
                    <div className="text-4xl font-extrabold text-gray-900 mb-2">{item.count}</div>
                    <p className="text-xs text-gray-500 font-medium">{item.range} marks</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Question Insights */}
          <Card className="border shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Question Insights</CardTitle>
              <CardDescription>Performance by question</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
                <span className="text-sm font-semibold text-gray-700">Average Performance</span>
                <span className="text-2xl font-bold text-gray-900">{questionInsights?.averageMarksPerQuestion.toFixed(1) || 0}%</span>
              </div>

              {questionInsights && questionInsights.lowestPerforming.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Lowest Performing</h4>
                  <div className="space-y-2">
                    {questionInsights.lowestPerforming.map((q, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                        <span className="text-sm font-bold text-gray-900">Question {q.questionNo}</span>
                        <span className="text-sm font-bold text-red-600">{q.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {questionInsights && questionInsights.highestPerforming.length > 0 && (
                <div>
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">Highest Performing</h4>
                  <div className="space-y-2">
                    {questionInsights.highestPerforming.map((q, idx) => (
                      <div key={idx} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                        <span className="text-sm font-bold text-gray-900">Question {q.questionNo}</span>
                        <span className="text-sm font-bold text-green-600">{q.percentage}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* CO Attainment & Class Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* CO Attainment */}
          <Card className="border shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">CO Attainment</CardTitle>
              <CardDescription>Course outcome performance metrics</CardDescription>
            </CardHeader>
            <CardContent>
              {coAttainment && coAttainment.cos.length > 0 ? (
                <>
                  <div className="space-y-6 mb-6">
                    {coAttainment.cos.map((co, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">{co.label}</span>
                          <span className="text-sm font-bold text-gray-600">{co.percentage}%</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-900 rounded-full transition-all"
                            style={{ width: `${co.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {(coAttainment.strongCOs.length > 0 || coAttainment.weakCOs.length > 0) && (
                    <div className="grid grid-cols-2 gap-4 pt-6 border-t">
                      {coAttainment.strongCOs.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Strong</p>
                          <p className="text-sm font-bold text-gray-900">{coAttainment.strongCOs.join(', ')}</p>
                        </div>
                      )}
                      {coAttainment.weakCOs.length > 0 && (
                        <div>
                          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Needs Focus</p>
                          <p className="text-sm font-bold text-gray-900">{coAttainment.weakCOs.join(', ')}</p>
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">No CO data available</p>
              )}
            </CardContent>
          </Card>

          {/* Class Performance Trend */}
          <Card className="border shadow-lg">
            <CardHeader>
              <CardTitle className="text-2xl">Class Performance Trend</CardTitle>
              <CardDescription>Progress across IAs</CardDescription>
            </CardHeader>
            <CardContent>
              {classTrend && classTrend.hasData && classTrend.trend.length > 0 ? (
                <>
                  <div className="space-y-6 mb-6">
                    {classTrend.trend.map((item, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-bold text-gray-900">{item.label}</span>
                          <span className="text-sm font-bold text-gray-600">{item.value}/50</span>
                        </div>
                        <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gray-900 rounded-full transition-all"
                            style={{ width: `${(item.value / 50) * 100}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  {classTrend.trend.length > 1 && (
                    <div className="text-center pt-6 border-t">
                      <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-50 rounded-lg">
                        {classTrend.trend[classTrend.trend.length - 1].value > classTrend.trend[0].value ? (
                          <>
                            <TrendingUp className="w-5 h-5 text-green-600" />
                            <span className="text-sm font-bold text-gray-900">Improving</span>
                          </>
                        ) : classTrend.trend[classTrend.trend.length - 1].value < classTrend.trend[0].value ? (
                          <>
                            <TrendingDown className="w-5 h-5 text-red-600" />
                            <span className="text-sm font-bold text-gray-900">Declining</span>
                          </>
                        ) : (
                          <>
                            <Minus className="w-5 h-5 text-gray-600" />
                            <span className="text-sm font-bold text-gray-900">Stable</span>
                          </>
                        )}
                        <span className="text-sm text-gray-500">
                          ({Math.abs(classTrend.trend[classTrend.trend.length - 1].value - classTrend.trend[0].value).toFixed(1)} marks change)
                        </span>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-500 py-8">No trend data available. Complete evaluations for multiple IAs to see trends.</p>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
