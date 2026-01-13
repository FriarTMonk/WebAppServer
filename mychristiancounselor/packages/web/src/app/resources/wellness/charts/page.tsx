'use client';

import { useState, useEffect, useCallback } from 'react';
import { ChartContainer, LineChart } from '@/components/charts';
import type { LineChartData } from '@/components/charts';
import { apiFetch } from '@/lib/api';

interface MoodTrendData {
  trend: Array<{ date: string; moodRating: number }>;
  averageMood: number;
}

interface SleepTrendData {
  trend: Array<{ date: string; sleepHours: number }>;
  averageSleep: number;
}

interface ExerciseTrendData {
  trend: Array<{ date: string; exerciseMinutes: number }>;
  totalExercise: number;
}

interface CorrelationData {
  correlation: number;
  interpretation: string;
}

export default function WellnessChartsPage() {
  const [moodData, setMoodData] = useState<MoodTrendData | null>(null);
  const [sleepData, setSleepData] = useState<SleepTrendData | null>(null);
  const [exerciseData, setExerciseData] = useState<ExerciseTrendData | null>(null);
  const [correlationData, setCorrelationData] = useState<CorrelationData | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Date range: default last 30 days
  const [startDate, setStartDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() - 30);
    return date.toISOString().split('T')[0];
  });
  const [endDate, setEndDate] = useState(() => new Date().toISOString().split('T')[0]);

  const fetchMoodData = async (start: string, end: string) => {
    const params = new URLSearchParams({ startDate: start, endDate: end });
    const response = await apiFetch(`/resources/wellness-charts/mood-trend?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch mood data: ${response.status}`);
    }
    const data = await response.json();
    setMoodData(data);
  };

  const fetchSleepData = async (start: string, end: string) => {
    const params = new URLSearchParams({ startDate: start, endDate: end });
    const response = await apiFetch(`/resources/wellness-charts/sleep-trend?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch sleep data: ${response.status}`);
    }
    const data = await response.json();
    setSleepData(data);
  };

  const fetchExerciseData = async (start: string, end: string) => {
    const params = new URLSearchParams({ startDate: start, endDate: end });
    const response = await apiFetch(`/resources/wellness-charts/exercise-trend?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch exercise data: ${response.status}`);
    }
    const data = await response.json();
    setExerciseData(data);
  };

  const fetchCorrelationData = async (start: string, end: string) => {
    const params = new URLSearchParams({
      startDate: start,
      endDate: end,
      metric1: 'mood',
      metric2: 'sleep'
    });
    const response = await apiFetch(`/resources/wellness-charts/correlation?${params}`);
    if (!response.ok) {
      throw new Error(`Failed to fetch correlation data: ${response.status}`);
    }
    const data = await response.json();
    setCorrelationData(data);
  };

  const fetchAllData = useCallback(async () => {
    setLoading(true);
    setError(null);

    const results = await Promise.allSettled([
      fetchMoodData(startDate, endDate),
      fetchSleepData(startDate, endDate),
      fetchExerciseData(startDate, endDate),
      fetchCorrelationData(startDate, endDate),
    ]);

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      setError(`Failed to load ${failures.length} chart(s)`);
    }

    setLoading(false);
  }, [startDate, endDate]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Chart data transformations
  const moodChartData: LineChartData[] =
    moodData?.trend.map(d => ({ date: d.date, value: d.moodRating })) || [];

  const sleepChartData: LineChartData[] =
    sleepData?.trend.map(d => ({ date: d.date, value: d.sleepHours })) || [];

  const exerciseChartData: LineChartData[] =
    exerciseData?.trend.map(d => ({ date: d.date, value: d.exerciseMinutes })) || [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Wellness Tracking</h1>

      {/* Date Range Selector */}
      <div className="bg-white p-4 rounded-lg shadow mb-6 flex gap-4 items-end">
        <div>
          <label htmlFor="start-date" className="block text-sm font-medium text-gray-700 mb-1">
            Start Date
          </label>
          <input
            type="date"
            id="start-date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <div>
          <label htmlFor="end-date" className="block text-sm font-medium text-gray-700 mb-1">
            End Date
          </label>
          <input
            type="date"
            id="end-date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="border rounded px-3 py-2"
          />
        </div>
        <button
          onClick={fetchAllData}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Update
        </button>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Mood Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Mood Trend</h2>
          <ChartContainer isLoading={loading} error={error}>
            <LineChart
              data={moodChartData}
              xAxisKey="date"
              lines={[{ dataKey: 'value', name: 'Mood', color: '#3b82f6' }]}
              height={300}
            />
          </ChartContainer>
          {moodData && (
            <p className="mt-2 text-sm text-gray-600">
              Average Mood: {moodData.averageMood.toFixed(1)}
            </p>
          )}
        </div>

        {/* Sleep Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Sleep Trend</h2>
          <ChartContainer isLoading={loading} error={error}>
            <LineChart
              data={sleepChartData}
              xAxisKey="date"
              lines={[{ dataKey: 'value', name: 'Sleep', color: '#10b981' }]}
              height={300}
            />
          </ChartContainer>
          {sleepData && (
            <p className="mt-2 text-sm text-gray-600">
              Average Sleep: {sleepData.averageSleep.toFixed(1)} hours
            </p>
          )}
        </div>

        {/* Exercise Trend */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Exercise Trend</h2>
          <ChartContainer isLoading={loading} error={error}>
            <LineChart
              data={exerciseChartData}
              xAxisKey="date"
              lines={[{ dataKey: 'value', name: 'Exercise', color: '#f59e0b' }]}
              height={300}
            />
          </ChartContainer>
          {exerciseData && (
            <p className="mt-2 text-sm text-gray-600">
              Total Exercise: {exerciseData.totalExercise} minutes
            </p>
          )}
        </div>

        {/* Mood vs Sleep Correlation */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Mood vs Sleep Correlation</h2>
          {correlationData && (
            <div className="text-center py-12">
              <p className="text-4xl font-bold text-blue-600">
                {correlationData.correlation.toFixed(2)}
              </p>
              <p className="text-gray-600 mt-2">{correlationData.interpretation}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
