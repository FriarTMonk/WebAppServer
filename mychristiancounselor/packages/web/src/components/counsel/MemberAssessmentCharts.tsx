'use client';

import { useState, useEffect, useCallback } from 'react';
import { LineChart, PieChart, BarChart, ChartContainer } from '@/components/charts';
import type { LineChartData, PieChartData, BarChartData } from '@/components/charts';
import { apiFetch } from '@/lib/api';

interface MemberAssessmentChartsProps {
  memberId: string;
}

interface ScoreTrendResponse {
  scores: Array<{ date: string; score: number }>;
  averageScore: number;
  latestScore: number | null;
  trend: 'improving' | 'stable' | 'declining' | 'insufficient_data';
}

interface ProgressOverviewResponse {
  phq9: ScoreTrendResponse;
  gad7: ScoreTrendResponse;
  sessions: number;
  tasksCompleted: number;
}

interface SessionActivityResponse {
  activity: Array<{ week: string; sessionCount: number }>;
}

export function MemberAssessmentCharts({ memberId }: MemberAssessmentChartsProps) {
  const [phq9Data, setPhq9Data] = useState<LineChartData[] | null>(null);
  const [gad7Data, setGad7Data] = useState<LineChartData[] | null>(null);
  const [taskCompletion, setTaskCompletion] = useState<PieChartData[] | null>(null);
  const [assessmentCompletion, setAssessmentCompletion] = useState<PieChartData[] | null>(null);
  const [sessionFrequency, setSessionFrequency] = useState<BarChartData[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [errors, setErrors] = useState<string[]>([]);

  const fetchPHQ9Data = async (id: string) => {
    const response = await apiFetch(`/api/counsel/assessment-charts/phq9-trend?memberId=${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch PHQ-9 data: ${response.status}`);
    }
    const data: ScoreTrendResponse = await response.json();
    setPhq9Data(data.scores.map(s => ({ date: s.date, value: s.score })));
  };

  const fetchGAD7Data = async (id: string) => {
    const response = await apiFetch(`/api/counsel/assessment-charts/gad7-trend?memberId=${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch GAD-7 data: ${response.status}`);
    }
    const data: ScoreTrendResponse = await response.json();
    setGad7Data(data.scores.map(s => ({ date: s.date, value: s.score })));
  };

  const fetchProgressOverview = async (id: string) => {
    const response = await apiFetch(`/api/counsel/assessment-charts/progress-overview?memberId=${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch progress overview data: ${response.status}`);
    }
    const data: ProgressOverviewResponse = await response.json();

    // Use progress overview data to create both assessment and task completion charts
    // For assessment completion, count the number of assessments with data
    const phq9Count = data.phq9.scores.length;
    const gad7Count = data.gad7.scores.length;
    const totalAssessments = phq9Count + gad7Count;

    setAssessmentCompletion([
      { name: 'Completed', value: totalAssessments },
    ]);

    // For task completion, use the tasksCompleted field
    setTaskCompletion([
      { name: 'Completed', value: data.tasksCompleted },
    ]);
  };

  const fetchSessionActivity = async (id: string) => {
    const response = await apiFetch(`/api/counsel/assessment-charts/session-activity?memberId=${id}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch session activity data: ${response.status}`);
    }
    const data: SessionActivityResponse = await response.json();
    setSessionFrequency(data.activity.map(a => ({ week: a.week, count: a.sessionCount })));
  };

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    setErrors([]);

    const results = await Promise.allSettled([
      fetchPHQ9Data(memberId),
      fetchGAD7Data(memberId),
      fetchProgressOverview(memberId), // Gets both assessment & task data
      fetchSessionActivity(memberId),
    ]);

    const failures = results.filter(r => r.status === 'rejected') as PromiseRejectedResult[];
    if (failures.length > 0) {
      const errorMessages = failures.map(f => f.reason?.message || 'Unknown error');
      setErrors(errorMessages);
    }

    setLoading(false);
  }, [memberId]);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  const taskColors = ['#10b981', '#f59e0b', '#ef4444']; // green, orange, red
  const assessmentColors = ['#3b82f6', '#9ca3af']; // blue, gray
  const errorMessage = errors.length > 0 ? `Failed to load ${errors.length} chart(s)` : null;

  return (
    <div className="space-y-6">
      <h2 className="text-xl font-semibold text-gray-900">Progress Charts</h2>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* PHQ-9 Depression Scores */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">PHQ-9 Depression Scores</h3>
          <p className="text-sm text-gray-600 mb-4">Lower scores indicate improvement</p>
          <ChartContainer isLoading={loading} error={errorMessage}>
            <LineChart
              data={phq9Data || []}
              xAxisKey="date"
              lines={[{ dataKey: 'value', name: 'PHQ-9 Score', color: '#ef4444' }]}
              height={300}
              emptyMessage="No PHQ-9 assessment data available"
            />
          </ChartContainer>
        </div>

        {/* GAD-7 Anxiety Scores */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">GAD-7 Anxiety Scores</h3>
          <p className="text-sm text-gray-600 mb-4">Lower scores indicate improvement</p>
          <ChartContainer isLoading={loading} error={errorMessage}>
            <LineChart
              data={gad7Data || []}
              xAxisKey="date"
              lines={[{ dataKey: 'value', name: 'GAD-7 Score', color: '#f59e0b' }]}
              height={300}
              emptyMessage="No GAD-7 assessment data available"
            />
          </ChartContainer>
        </div>

        {/* Task Completion */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Task Completion</h3>
          <p className="text-sm text-gray-600 mb-4">Distribution of assigned tasks</p>
          <ChartContainer isLoading={loading} error={errorMessage}>
            <PieChart
              data={taskCompletion || []}
              colors={taskColors}
              height={300}
              emptyMessage="No task data available"
            />
          </ChartContainer>
        </div>

        {/* Assessment Completion */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-2">Assessment Completion</h3>
          <p className="text-sm text-gray-600 mb-4">Status of assigned assessments</p>
          <ChartContainer isLoading={loading} error={errorMessage}>
            <PieChart
              data={assessmentCompletion || []}
              colors={assessmentColors}
              height={300}
              emptyMessage="No assessment data available"
            />
          </ChartContainer>
        </div>
      </div>

      {/* Session Frequency - full width */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h3 className="text-lg font-semibold mb-2">Session Frequency</h3>
        <p className="text-sm text-gray-600 mb-4">Number of counseling sessions per week</p>
        <ChartContainer isLoading={loading} error={errorMessage}>
          <BarChart
            data={sessionFrequency || []}
            xAxisKey="week"
            bars={[{ dataKey: 'count', name: 'Sessions', color: '#8b5cf6' }]}
            height={300}
            emptyMessage="No session data available"
          />
        </ChartContainer>
      </div>
    </div>
  );
}
