'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, PieChart, ChartContainer } from '@/components/charts';
import type { BarChartData, PieChartData } from '@/components/charts';
import { apiFetch } from '@/lib/api';

interface CampaignPerformanceResponse {
  campaignName: string;
  sent: number;
  opened: number;
  clicked: number;
  bounced: number;
  openRate: number;
  clickRate: number;
  bounceRate: number;
}

interface LeadConversionResponse {
  stage: string;
  count: number;
  percentage: number;
}

interface ChartState {
  data: BarChartData[];
  xAxisKey: string;
  bars: Array<{ dataKey: string; name: string; color: string }>;
}

export function MarketingCharts() {
  const [campaignData, setCampaignData] = useState<ChartState | null>(null);
  const [conversionData, setConversionData] = useState<PieChartData[] | null>(null);

  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchChartData = useCallback(async () => {
    setLoading(true);
    setErrorMessage(null);

    // Define fetch functions inline
    const fetchCampaignPerformance = async () => {
      try {
        const response = await apiFetch('/api/admin/marketing-charts/campaign-performance');
        if (!response.ok) {
          throw new Error(`Failed to fetch campaigns: ${response.status}`);
        }
        const data: CampaignPerformanceResponse[] = await response.json();

        // Validate and transform
        if (!Array.isArray(data) || data.length === 0) {
          setCampaignData(null);
          return;
        }

        setCampaignData({
          data: data.map(c => ({
            campaign: c.campaignName || 'Unknown',
            sent: c.sent ?? 0,
            opened: c.opened ?? 0,
            clicked: c.clicked ?? 0,
          })),
          xAxisKey: 'campaign',
          bars: [
            { dataKey: 'sent', name: 'Sent', color: '#3b82f6' },
            { dataKey: 'opened', name: 'Opened', color: '#10b981' },
            { dataKey: 'clicked', name: 'Clicked', color: '#f59e0b' },
          ],
        });
      } catch (error) {
        console.error('Error fetching campaign performance:', error);
        setCampaignData(null);
        throw error;
      }
    };

    const fetchLeadConversion = async () => {
      try {
        const response = await apiFetch('/api/admin/marketing-charts/lead-conversion');
        if (!response.ok) {
          throw new Error(`Failed to fetch lead conversion: ${response.status}`);
        }
        const data: LeadConversionResponse[] = await response.json();

        // Validate and transform
        if (!Array.isArray(data) || data.length === 0) {
          setConversionData(null);
          return;
        }

        setConversionData(
          data.map(item => ({
            name: item.stage || 'Unknown',
            value: item.count ?? 0,
            fill: getStageColor(item.stage),
          }))
        );
      } catch (error) {
        console.error('Error fetching lead conversion:', error);
        setConversionData(null);
        throw error;
      }
    };

    const results = await Promise.allSettled([
      fetchCampaignPerformance(),
      fetchLeadConversion(),
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

  // Helper to assign colors to conversion stages
  const getStageColor = (stage: string): string => {
    const colors: Record<string, string> = {
      'New Lead': '#3b82f6',
      'Contacted': '#8b5cf6',
      'Qualified': '#10b981',
      'Proposal': '#f59e0b',
      'Negotiation': '#ef4444',
      'Closed Won': '#22c55e',
      'Closed Lost': '#6b7280',
    };
    return colors[stage] || '#64748b';
  };

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {errorMessage && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
          <p className="text-sm text-yellow-700">{errorMessage}</p>
        </div>
      )}

      {/* Campaign Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Campaign Performance</h2>
        <p className="text-sm text-gray-600 mb-4">Email campaign metrics comparison</p>
        <ChartContainer isLoading={loading} error={errorMessage}>
          {campaignData && (
            <BarChart
              data={campaignData.data}
              xAxisKey={campaignData.xAxisKey}
              bars={campaignData.bars}
              height={300}
              emptyMessage="No campaign data available"
            />
          )}
        </ChartContainer>
      </div>

      {/* Lead Conversion Funnel Chart */}
      <div className="bg-white p-6 rounded-lg shadow">
        <h2 className="text-lg font-semibold mb-2">Lead Conversion Funnel</h2>
        <p className="text-sm text-gray-600 mb-4">Distribution of leads across conversion stages</p>
        <ChartContainer isLoading={loading} error={errorMessage}>
          {conversionData && (
            <PieChart
              data={conversionData}
              colors={['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#22c55e', '#6b7280']}
              height={300}
              emptyMessage="No lead conversion data available"
            />
          )}
        </ChartContainer>
      </div>
    </div>
  );
}
