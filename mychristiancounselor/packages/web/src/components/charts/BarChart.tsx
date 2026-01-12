'use client';

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EmptyChart } from './EmptyChart';

export interface BarChartData {
  [key: string]: string | number;
}

interface BarChartProps {
  data: BarChartData[];
  xAxisKey: string;
  bars: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  height?: number;
  layout?: 'horizontal' | 'vertical';
  emptyMessage?: string;
}

export function BarChart({
  data,
  xAxisKey,
  bars,
  height = 300,
  layout = 'horizontal',
  emptyMessage,
}: BarChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChart message={emptyMessage} height={height} />;
  }

  // Validate that xAxisKey exists in data
  const hasValidXAxis = data.every(item => xAxisKey in item);
  if (!hasValidXAxis) {
    console.warn(`BarChart: xAxisKey "${xAxisKey}" not found in all data items`);
    return <EmptyChart message="Invalid chart configuration" height={height} />;
  }

  // Validate that all bar dataKeys exist
  const invalidBars = bars.filter(bar =>
    !data.every(item => bar.dataKey in item)
  );
  if (invalidBars.length > 0) {
    console.warn(`BarChart: Invalid dataKeys: ${invalidBars.map(b => b.dataKey).join(', ')}`);
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsBarChart data={data} layout={layout}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        {layout === 'horizontal' ? (
          <>
            <XAxis
              dataKey={xAxisKey}
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#d1d5db"
            />
            <YAxis
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#d1d5db"
            />
          </>
        ) : (
          <>
            <XAxis
              type="number"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#d1d5db"
            />
            <YAxis
              dataKey={xAxisKey}
              type="category"
              tick={{ fill: '#6b7280', fontSize: 12 }}
              stroke="#d1d5db"
            />
          </>
        )}
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
        {bars.map((bar) => (
          <Bar
            key={bar.dataKey}
            dataKey={bar.dataKey}
            name={bar.name}
            fill={bar.color}
            radius={layout === 'horizontal' ? [4, 4, 0, 0] : [0, 4, 4, 0]}
          />
        ))}
      </RechartsBarChart>
    </ResponsiveContainer>
  );
}
