'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, LineChart, ChartContainer } from '@/components/charts';
import type { BarChartData, LineChartData } from '@/components/charts';
import { apiFetch } from '@/lib/api';

interface PipelineStagesResponse {
  stage: string;
  count: number;
  value: number;
}

interface ProjectionsResponse {
  data: Array<{ date: string; value: number }>;
  projectedRevenue: number;
  conversionRate: number;
}

interface BarChartState {
  data: BarChartData[];
  xAxisKey: string;
  bars: Array<{ dataKey: string; name: string; color: string }>;
}

interface LineChartState {
  data: LineChartData[];
  xAxisKey: string;
  lines: Array<{ dataKey: string; name: string; color: string }>;
}

export function SalesCharts() {
  const [pipelineData, setPipelineData] = useState<BarChartState | null>(null);
  const [projectionsData, setProjectionsData] = useState<LineChartState | null>(null);
  const [projectionsSummary, setProjectionsSummary] = useState<{
    projectedRevenue: number;
    conversionRate: number;
  } | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Helper functions for null-safe formatting
  const formatCurrency = (val: number | null | undefined) =>
    val != null ? `$${val.toLocaleString()}` : 'N/A';

  const formatPercentage = (val: number | null | undefined) =>
    val != null ? `${val.toFixed(1)}%` : 'N/A';

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    // Define fetch functions inline
    const fetchPipelineStages = async () => {
      const response = await apiFetch('/api/admin/sales-charts/pipeline-stages');
      if (!response.ok) {
        throw new Error(`Failed to fetch pipeline stages: ${response.status}`);
      }
      const data: PipelineStagesResponse[] = await response.json();

      // Validate and transform
      if (!Array.isArray(data) || data.length === 0) {
        setPipelineData(null);
        return;
      }

      setPipelineData({
        data: data.map(item => ({
          stage: item.stage || 'Unknown',
          count: item.count ?? 0,
          value: item.value ?? 0,
        })),
        xAxisKey: 'stage',
        bars: [
          { dataKey: 'count', name: 'Count', color: '#3b82f6' },
          { dataKey: 'value', name: 'Value ($)', color: '#10b981' },
        ],
      });
    };

    const fetchProjections = async () => {
      const response = await apiFetch('/api/admin/sales-charts/projections');
      if (!response.ok) {
        throw new Error(`Failed to fetch projections: ${response.status}`);
      }
      const data: ProjectionsResponse = await response.json();

      // Validate and transform
      if (!data || !Array.isArray(data.data) || data.data.length === 0) {
        setProjectionsData(null);
        setProjectionsSummary(null);
        return;
      }

      setProjectionsData({
        data: data.data.map(item => ({
          date: item.date || 'Unknown',
          revenue: item.value ?? 0,
        })),
        xAxisKey: 'date',
        lines: [
          { dataKey: 'revenue', name: 'Revenue', color: '#3b82f6' },
        ],
      });

      setProjectionsSummary({
        projectedRevenue: data.projectedRevenue ?? 0,
        conversionRate: data.conversionRate ?? 0,
      });
    };

    const results = await Promise.allSettled([
      fetchPipelineStages(),
      fetchProjections(),
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
      {/* Error banner */}
      {errorMessage && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm text-yellow-700">{errorMessage}</p>
        </div>
      )}

      {/* Pipeline by Stage Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Pipeline by Stage</h2>
        <p className="text-sm text-gray-600 mb-4">Sales pipeline distribution across stages</p>
        <ChartContainer isLoading={loading} error={errorMessage}>
          {pipelineData && (
            <BarChart
              data={pipelineData.data}
              xAxisKey={pipelineData.xAxisKey}
              bars={pipelineData.bars}
              height={300}
              emptyMessage="No pipeline data available"
            />
          )}
        </ChartContainer>
      </div>

      {/* Revenue Projections Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Revenue Projections</h2>
        <p className="text-sm text-gray-600 mb-4">Projected revenue over time</p>

        {/* Summary Metrics */}
        {projectionsSummary && (
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Projected Revenue</p>
              <p className="text-2xl font-bold text-blue-700">
                {formatCurrency(projectionsSummary.projectedRevenue)}
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Conversion Rate</p>
              <p className="text-2xl font-bold text-green-700">
                {formatPercentage(projectionsSummary.conversionRate)}
              </p>
            </div>
          </div>
        )}

        <ChartContainer isLoading={loading} error={errorMessage}>
          {projectionsData && (
            <LineChart
              data={projectionsData.data}
              xAxisKey={projectionsData.xAxisKey}
              lines={projectionsData.lines}
              height={300}
              emptyMessage="No projection data available"
            />
          )}
        </ChartContainer>
      </div>
    </div>
  );
}
