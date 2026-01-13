'use client';

import { useState, useEffect, useCallback } from 'react';
import { LineChart, BarChart, ChartContainer } from '@/components/charts';
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

// Helper functions for safe number formatting
const formatCurrency = (val: number | null | undefined) =>
  val != null ? `$${val.toFixed(2)}` : 'N/A';

const formatPercentage = (val: number | null | undefined) =>
  val != null ? `${val.toFixed(1)}%` : 'N/A';

const formatInteger = (val: number | null | undefined) =>
  val != null ? val.toString() : 'N/A';

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

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    // Define all fetch functions inline to avoid dependency issues
    const fetchEvaluationCosts = async () => {
      try {
        const response = await apiFetch('/admin/analytics-charts/evaluation-costs');
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
        const response = await apiFetch('/admin/analytics-charts/email-health');
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
        const response = await apiFetch('/admin/analytics-charts/user-growth');
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
        const response = await apiFetch('/admin/analytics-charts/revenue');
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
                {formatCurrency(costsSummary.totalCost)}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-gray-600">Avg per Book</p>
              <p className="text-lg font-semibold text-blue-700">
                {formatCurrency(costsSummary.averageCostPerBook)}
              </p>
            </div>
            <div className="bg-blue-50 p-3 rounded">
              <p className="text-xs text-gray-600">Current Month</p>
              <p className="text-lg font-semibold text-blue-700">
                {formatCurrency(costsSummary.currentMonthCost)}
              </p>
            </div>
          </div>
        )}
        <ChartContainer isLoading={loading} error={errorMessage}>
          <LineChart
            data={costsData?.data || []}
            xAxisKey={costsData?.xAxisKey || 'date'}
            lines={costsData?.lines || []}
            height={300}
            emptyMessage="No cost data available"
          />
        </ChartContainer>
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
                {formatCurrency(revenueSummary.totalRevenue)}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-gray-600">MRR</p>
              <p className="text-lg font-semibold text-green-700">
                {formatCurrency(revenueSummary.mrr)}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-gray-600">Subscriptions</p>
              <p className="text-lg font-semibold text-green-700">
                {formatInteger(revenueSummary.subscriptionCount)}
              </p>
            </div>
            <div className="bg-green-50 p-3 rounded">
              <p className="text-xs text-gray-600">Growth Rate</p>
              <p className="text-lg font-semibold text-green-700">
                {formatPercentage(revenueSummary.growthRate)}
              </p>
            </div>
          </div>
        )}
        <ChartContainer isLoading={loading} error={errorMessage}>
          <LineChart
            data={revenueData?.data || []}
            xAxisKey={revenueData?.xAxisKey || 'date'}
            lines={revenueData?.lines || []}
            height={300}
            emptyMessage="No revenue data available"
          />
        </ChartContainer>
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
                  {formatPercentage(emailSummary.bounceRate)}
                </p>
              </div>
              <div className="bg-green-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Open</p>
                <p className="text-sm font-semibold text-green-700">
                  {formatPercentage(emailSummary.openRate)}
                </p>
              </div>
              <div className="bg-blue-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Click</p>
                <p className="text-sm font-semibold text-blue-700">
                  {formatPercentage(emailSummary.clickRate)}
                </p>
              </div>
            </div>
          )}
          <ChartContainer isLoading={loading} error={errorMessage}>
            <LineChart
              data={emailData?.data || []}
              xAxisKey={emailData?.xAxisKey || 'date'}
              lines={emailData?.lines || []}
              height={250}
              emptyMessage="No email data available"
            />
          </ChartContainer>
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
                  {formatInteger(usersSummary.totalUsers)}
                </p>
              </div>
              <div className="bg-purple-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Active</p>
                <p className="text-sm font-semibold text-purple-700">
                  {formatInteger(usersSummary.activeUsers)}
                </p>
              </div>
              <div className="bg-purple-50 p-2 rounded text-center">
                <p className="text-xs text-gray-600">Growth</p>
                <p className="text-sm font-semibold text-purple-700">
                  {formatPercentage(usersSummary.growthRate)}
                </p>
              </div>
            </div>
          )}
          <ChartContainer isLoading={loading} error={errorMessage}>
            <BarChart
              data={usersData?.data || []}
              xAxisKey={usersData?.xAxisKey || 'date'}
              bars={usersData?.bars || []}
              height={250}
              emptyMessage="No user data available"
            />
          </ChartContainer>
        </div>
      </div>
    </div>
  );
}
