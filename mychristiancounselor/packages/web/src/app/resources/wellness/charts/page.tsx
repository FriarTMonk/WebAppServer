'use client';

import { useState, useEffect } from 'react';
import { ChartContainer, LineChart } from '@/components/charts';
import type { LineChartData } from '@/components/charts';
import { apiFetch } from '@/lib/api';

interface MoodTrendData {
  data: Array<{ date: string; value: number }>;
  average: number;
}

interface SleepTrendData {
  data: Array<{ date: string; value: number }>;
  averageHours: number;
}

interface ExerciseTrendData {
  data: Array<{ date: string; value: number }>;
  totalMinutes: number;
}

interface CorrelationData {
  metric1: string;
  metric2: string;
  correlation: number;
  data: Array<{ x: number; y: number }>;
}

export default function WellnessChartsPage() {
  const [moodData, setMoodData] = useState<MoodTrendData | null>(null);
  const [sleepData, setSleepData] = useState<SleepTrendData | null>(null);
  const [exerciseData, setExerciseData] = useState<ExerciseTrendData | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);

  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [loadingMood, setLoadingMood] = useState(true);
  const [loadingSleep, setLoadingSleep] = useState(true);
  const [loadingExercise, setLoadingExercise] = useState(true);
  const [loadingCorrelation, setLoadingCorrelation] = useState(true);

  const [errorMood, setErrorMood] = useState<string | null>(null);
  const [errorSleep, setErrorSleep] = useState<string | null>(null);
  const [errorExercise, setErrorExercise] = useState<string | null>(null);
  const [errorCorrelation, setErrorCorrelation] = useState<string | null>(null);

  // Set default date range (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setStartDate(start.toISOString().split('T')[0]);
    setEndDate(end.toISOString().split('T')[0]);
  }, []);

  // Fetch data when date range changes
  useEffect(() => {
    if (startDate && endDate) {
      fetchMoodData();
      fetchSleepData();
      fetchExerciseData();
      fetchCorrelationData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startDate, endDate]);

  const fetchMoodData = async () => {
    setLoadingMood(true);
    setErrorMood(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await apiFetch(`/api/resources/wellness-charts/mood-trend?${params}`);

      if (!response.ok) throw new Error('Failed to fetch mood data');

      const data = await response.json();
      setMoodData(data);
    } catch (error) {
      setErrorMood(error instanceof Error ? error.message : 'Failed to load mood data');
    } finally {
      setLoadingMood(false);
    }
  };

  const fetchSleepData = async () => {
    setLoadingSleep(true);
    setErrorSleep(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await apiFetch(`/api/resources/wellness-charts/sleep-trend?${params}`);

      if (!response.ok) throw new Error('Failed to fetch sleep data');

      const data = await response.json();
      setSleepData(data);
    } catch (error) {
      setErrorSleep(error instanceof Error ? error.message : 'Failed to load sleep data');
    } finally {
      setLoadingSleep(false);
    }
  };

  const fetchExerciseData = async () => {
    setLoadingExercise(true);
    setErrorExercise(null);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const response = await apiFetch(`/api/resources/wellness-charts/exercise-trend?${params}`);

      if (!response.ok) throw new Error('Failed to fetch exercise data');

      const data = await response.json();
      setExerciseData(data);
    } catch (error) {
      setErrorExercise(error instanceof Error ? error.message : 'Failed to load exercise data');
    } finally {
      setLoadingExercise(false);
    }
  };

  const fetchCorrelationData = async () => {
    setLoadingCorrelation(true);
    setErrorCorrelation(null);
    try {
      const params = new URLSearchParams({
        metric1: 'mood',
        metric2: 'sleep',
        startDate,
        endDate,
      });
      const response = await apiFetch(`/api/resources/wellness-charts/correlation?${params}`);

      if (!response.ok) throw new Error('Failed to fetch correlation data');

      const data = await response.json();
      setCorrelationData(data);
    } catch (error) {
      setErrorCorrelation(error instanceof Error ? error.message : 'Failed to load correlation data');
    } finally {
      setLoadingCorrelation(false);
    }
  };

  const handleDateRangeChange = () => {
    if (startDate && endDate) {
      fetchMoodData();
      fetchSleepData();
      fetchExerciseData();
      fetchCorrelationData();
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Wellness Trends</h1>
        <p className="text-gray-600 mt-2">Track your mood, sleep, and exercise patterns over time</p>
      </div>

      {/* Date Range Filter */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              Start Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              End Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button
            onClick={handleDateRangeChange}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Update
          </button>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="space-y-6">
        {/* Mood Trend */}
        <ChartContainer
          title="Mood Trend"
          description={moodData ? `Average mood: ${moodData.average.toFixed(1)}/10` : undefined}
          isLoading={loadingMood}
          error={errorMood}
        >
          {moodData && (
            <LineChart
              data={moodData.data as LineChartData[]}
              xAxisKey="date"
              lines={[
                { dataKey: 'value', name: 'Mood Rating', color: '#3b82f6' },
              ]}
              height={300}
              emptyMessage="No mood data available for this period"
            />
          )}
        </ChartContainer>

        {/* Sleep Trend */}
        <ChartContainer
          title="Sleep Trend"
          description={sleepData ? `Average sleep: ${sleepData.averageHours.toFixed(1)} hours` : undefined}
          isLoading={loadingSleep}
          error={errorSleep}
        >
          {sleepData && (
            <LineChart
              data={sleepData.data as LineChartData[]}
              xAxisKey="date"
              lines={[
                { dataKey: 'value', name: 'Sleep Hours', color: '#8b5cf6' },
              ]}
              height={300}
              emptyMessage="No sleep data available for this period"
            />
          )}
        </ChartContainer>

        {/* Exercise Trend */}
        <ChartContainer
          title="Exercise Trend"
          description={exerciseData ? `Total exercise: ${exerciseData.totalMinutes} minutes` : undefined}
          isLoading={loadingExercise}
          error={errorExercise}
        >
          {exerciseData && (
            <LineChart
              data={exerciseData.data as LineChartData[]}
              xAxisKey="date"
              lines={[
                { dataKey: 'value', name: 'Exercise Minutes', color: '#10b981' },
              ]}
              height={300}
              emptyMessage="No exercise data available for this period"
            />
          )}
        </ChartContainer>

        {/* Mood vs Sleep Correlation */}
        <ChartContainer
          title="Mood vs Sleep Correlation"
          description={
            correlationData
              ? `Correlation coefficient: ${correlationData.correlation.toFixed(3)}`
              : undefined
          }
          isLoading={loadingCorrelation}
          error={errorCorrelation}
        >
          {correlationData && correlationData.data.length > 0 && (
            <div className="h-64 flex items-center justify-center">
              <p className="text-sm text-gray-600">
                {correlationData.correlation > 0.7
                  ? 'Strong positive correlation: Better sleep tends to improve mood'
                  : correlationData.correlation > 0.3
                  ? 'Moderate positive correlation between sleep and mood'
                  : correlationData.correlation < -0.3
                  ? 'Negative correlation detected'
                  : 'Weak or no significant correlation'}
              </p>
            </div>
          )}
        </ChartContainer>
      </div>
    </div>
  );
}
