'use client';

import { useState, useEffect, useCallback } from 'react';
import { LineChart, BarChart } from '@/components/charts';
import { apiFetch } from '@/lib/api';

interface EvaluationCostsResponse {
  data: Array<{ date: string; value: number }>;
  totalCost: number;
  averageCostPerBook: number;
  currentMonthCost: number;
}

interface EmailHealthResponse {
  bounceRate: number;
  openRate: number;
  clickRate: number;
  trendData: Array<{
    date: string;
    bounces: number;
    opens: number;
    clicks: number;
  }>;
}

interface UserGrowthResponse {
  data: Array<{ date: string; value: number }>;
  totalUsers: number;
  activeUsers: number;
  growthRate: number;
}

interface RevenueResponse {
  data: Array<{ date: string; value: number }>;
  totalRevenue: number;
  subscriptionCount: number;
  mrr: number;
  growthRate: number;
}

interface ChartData {
  data: Array<{ [key: string]: string | number }>;
  xAxisKey: string;
  lines?: Array<{ dataKey: string; name: string; color: string }>;
  bars?: Array<{ dataKey: string; name: string; color: string }>;
}

export function AdminAnalyticsCharts() {
  const [costsData, setCostsData] = useState<ChartData | null>(null);
  const [emailData, setEmailData] = useState<ChartData | null>(null);
  const [usersData, setUsersData] = useState<ChartData | null>(null);
  const [revenueData, setRevenueData] = useState<ChartData | null>(null);

  const [costsSummary, setCostsSummary] = useState<Omit<EvaluationCostsResponse, 'data'> | null>(null);
  const [emailSummary, setEmailSummary] = useState<Omit<EmailHealthResponse, 'trendData'> | null>(null);
  const [usersSummary, setUsersSummary] = useState<Omit<UserGrowthResponse, 'data'> | null>(null);
  const [revenueSummary, setRevenueSummary] = useState<Omit<RevenueResponse, 'data'> | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchEvaluationCosts = async () => {
    try {
      const response = await apiFetch('/api/admin/analytics-charts/evaluation-costs');
      if (!response.ok) {
        throw new Error(`Failed to fetch costs: ${response.status}`);
      }
      const data: EvaluationCostsResponse = await response.json();

      // Validate data
      if (!data.data || !Array.isArray(data.data)) {
        setCostsData(null);
        return;
      }

      // Store summary data
      setCostsSummary({
        totalCost: data.totalCost,
        averageCostPerBook: data.averageCostPerBook,
        currentMonthCost: data.currentMonthCost,
      });

      setCostsData({
        data: data.data.map(d => ({ date: d.date, value: d.value })),
        xAxisKey: 'date',
        lines: [{ dataKey: 'value', name: 'Daily Cost', color: '#3b82f6' }],
      });
    } catch (error) {
      console.error('Error fetching evaluation costs:', error);
      setCostsData(null);
      throw error;
    }
  };

  const fetchEmailHealth = async () => {
    try {
      const response = await apiFetch('/api/admin/analytics-charts/email-health');
      if (!response.ok) {
        throw new Error(`Failed to fetch email health: ${response.status}`);
      }
      const data: EmailHealthResponse = await response.json();

      // Validate data
      if (!data.trendData || !Array.isArray(data.trendData)) {
        setEmailData(null);
        return;
      }

      // Store summary data
      setEmailSummary({
        bounceRate: data.bounceRate,
        openRate: data.openRate,
        clickRate: data.clickRate,
      });

      setEmailData({
        data: data.trendData.map(d => ({
          date: d.date,
          bounces: d.bounces,
          opens: d.opens,
          clicks: d.clicks,
        })),
        xAxisKey: 'date',
        lines: [
          { dataKey: 'bounces', name: 'Bounces', color: '#ef4444' },
          { dataKey: 'opens', name: 'Opens', color: '#10b981' },
          { dataKey: 'clicks', name: 'Clicks', color: '#3b82f6' },
        ],
      });
    } catch (error) {
      console.error('Error fetching email health:', error);
      setEmailData(null);
      throw error;
    }
  };

  const fetchUserGrowth = async () => {
    try {
      const response = await apiFetch('/api/admin/analytics-charts/user-growth');
      if (!response.ok) {
        throw new Error(`Failed to fetch user growth: ${response.status}`);
      }
      const data: UserGrowthResponse = await response.json();

      // Validate data
      if (!data.data || !Array.isArray(data.data)) {
        setUsersData(null);
        return;
      }

      // Store summary data
      setUsersSummary({
        totalUsers: data.totalUsers,
        activeUsers: data.activeUsers,
        growthRate: data.growthRate,
      });

      setUsersData({
        data: data.data.map(d => ({ date: d.date, value: d.value })),
        xAxisKey: 'date',
        bars: [{ dataKey: 'value', name: 'New Users', color: '#8b5cf6' }],
      });
    } catch (error) {
      console.error('Error fetching user growth:', error);
      setUsersData(null);
      throw error;
    }
  };

  const fetchRevenue = async () => {
    try {
      const response = await apiFetch('/api/admin/analytics-charts/revenue');
      if (!response.ok) {
        throw new Error(`Failed to fetch revenue: ${response.status}`);
      }
      const data: RevenueResponse = await response.json();

      // Validate data
      if (!data.data || !Array.isArray(data.data)) {
        setRevenueData(null);
        return;
      }

      // Store summary data
      setRevenueSummary({
        totalRevenue: data.totalRevenue,
        subscriptionCount: data.subscriptionCount,
        mrr: data.mrr,
        growthRate: data.growthRate,
      });

      setRevenueData({
        data: data.data.map(d => ({ date: d.date, value: d.value })),
        xAxisKey: 'date',
        lines: [{ dataKey: 'value', name: 'Daily Revenue', color: '#10b981' }],
      });
    } catch (error) {
      console.error('Error fetching revenue:', error);
      setRevenueData(null);
      throw error;
    }
  };

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    const results = await Promise.allSettled([
      fetchEvaluationCosts(),
      fetchEmailHealth(),
      fetchUserGrowth(),
      fetchRevenue(),
    ]);

    const failures = results.filter(r => r.status === 'rejected');
    if (failures.length > 0) {
      setErrorMessage(`Failed to load ${failures.length} chart(s)`);
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [fetchChartData]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="h-64 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {errorMessage && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-yellow-800 text-sm">{errorMessage}</p>
        </div>
      )}

      {/* Evaluation Cost Trends */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">AI Evaluation Costs</h2>
        <p className="text-sm text-gray-600 mb-4">Daily spend on book evaluations</p>
        {costsSummary && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-gray-600">Total Cost</p>
              <p className="text-lg font-semibold text-blue-700">
                ${costsSummary.totalCost.toFixed(2)}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-gray-600">Avg per Book</p>
              <p className="text-lg font-semibold text-blue-700">
                ${costsSummary.averageCostPerBook.toFixed(2)}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-gray-600">Current Month</p>
              <p className="text-lg font-semibold text-blue-700">
                ${costsSummary.currentMonthCost.toFixed(2)}
              </p>
            </div>
          </div>
        )}
        {costsData && costsData.lines ? (
          <LineChart
            data={costsData.data}
            xAxisKey={costsData.xAxisKey}
            lines={costsData.lines}
            height={300}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No cost data available
          </div>
        )}
      </div>

      {/* Revenue Trends */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Revenue Trends</h2>
        <p className="text-sm text-gray-600 mb-4">Daily revenue and subscription metrics</p>
        {revenueSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-gray-600">Total Revenue</p>
              <p className="text-lg font-semibold text-green-700">
                ${revenueSummary.totalRevenue.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-gray-600">MRR</p>
              <p className="text-lg font-semibold text-green-700">
                ${revenueSummary.mrr.toFixed(2)}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-gray-600">Subscriptions</p>
              <p className="text-lg font-semibold text-green-700">
                {revenueSummary.subscriptionCount}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-gray-600">Growth Rate</p>
              <p className="text-lg font-semibold text-green-700">
                {revenueSummary.growthRate.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
        {revenueData && revenueData.lines ? (
          <LineChart
            data={revenueData.data}
            xAxisKey={revenueData.xAxisKey}
            lines={revenueData.lines}
            height={300}
          />
        ) : (
          <div className="h-64 flex items-center justify-center text-gray-500">
            No revenue data available
          </div>
        )}
      </div>

      {/* Grid for smaller charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Email Health */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Email Health</h2>
          <p className="text-sm text-gray-600 mb-4">Bounce, open, and click rates over time</p>
          {emailSummary && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-red-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Bounce</p>
                <p className="text-sm font-semibold text-red-700">
                  {emailSummary.bounceRate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-green-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Open</p>
                <p className="text-sm font-semibold text-green-700">
                  {emailSummary.openRate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-blue-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Click</p>
                <p className="text-sm font-semibold text-blue-700">
                  {emailSummary.clickRate.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
          {emailData && emailData.lines ? (
            <LineChart
              data={emailData.data}
              xAxisKey={emailData.xAxisKey}
              lines={emailData.lines}
              height={250}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No email data available
            </div>
          )}
        </div>

        {/* User Growth */}
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">User Growth</h2>
          <p className="text-sm text-gray-600 mb-4">New user registrations over time</p>
          {usersSummary && (
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-purple-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Total</p>
                <p className="text-sm font-semibold text-purple-700">
                  {usersSummary.totalUsers}
                </p>
              </div>
              <div className="bg-purple-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Active</p>
                <p className="text-sm font-semibold text-purple-700">
                  {usersSummary.activeUsers}
                </p>
              </div>
              <div className="bg-purple-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Growth</p>
                <p className="text-sm font-semibold text-purple-700">
                  {usersSummary.growthRate.toFixed(1)}%
                </p>
              </div>
            </div>
          )}
          {usersData && usersData.bars ? (
            <BarChart
              data={usersData.data}
              xAxisKey={usersData.xAxisKey}
              bars={usersData.bars}
              height={250}
            />
          ) : (
            <div className="h-64 flex items-center justify-center text-gray-500">
              No user data available
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
