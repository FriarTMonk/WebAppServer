'use client';

import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EmptyChart } from './EmptyChart';

export interface LineChartData {
  [key: string]: string | number;
}

interface LineChartProps {
  data: LineChartData[];
  xAxisKey: string;
  lines: Array<{
    dataKey: string;
    name: string;
    color: string;
  }>;
  height?: number;
  emptyMessage?: string;
}

export function LineChart({
  data,
  xAxisKey,
  lines,
  height = 300,
  emptyMessage,
}: LineChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChart message={emptyMessage} height={height} />;
  }

  // Validate that xAxisKey exists in data
  const hasValidXAxis = data.every(item => xAxisKey in item);
  if (!hasValidXAxis) {
    console.warn(`LineChart: xAxisKey "${xAxisKey}" not found in all data items`);
    return <EmptyChart message="Invalid chart configuration" height={height} />;
  }

  // Validate that all line dataKeys exist
  const invalidLines = lines.filter(line =>
    !data.every(item => line.dataKey in item)
  );
  if (invalidLines.length > 0) {
    console.warn(`LineChart: Invalid dataKeys: ${invalidLines.map(l => l.dataKey).join(', ')}`);
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsLineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis
          dataKey={xAxisKey}
          tick={{ fill: '#6b7280', fontSize: 12 }}
          stroke="#d1d5db"
        />
        <YAxis
          tick={{ fill: '#6b7280', fontSize: 12 }}
          stroke="#d1d5db"
        />
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px' }}
        />
        {lines.map((line) => (
          <Line
            key={line.dataKey}
            type="monotone"
            dataKey={line.dataKey}
            name={line.name}
            stroke={line.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            activeDot={{ r: 5 }}
          />
        ))}
      </RechartsLineChart>
    </ResponsiveContainer>
  );
}
