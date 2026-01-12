'use client';

import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { EmptyChart } from './EmptyChart';

export interface PieChartData {
  name: string;
  value: number;
  [key: string]: string | number;
}

interface PieChartProps {
  data: PieChartData[];
  colors: string[];
  height?: number;
  emptyMessage?: string;
  showPercentage?: boolean;
}

export function PieChart({
  data,
  colors,
  height = 300,
  emptyMessage,
  showPercentage = true,
}: PieChartProps) {
  if (!data || data.length === 0) {
    return <EmptyChart message={emptyMessage} height={height} />;
  }

  // Warn if not enough colors
  if (colors.length < data.length) {
    console.warn(`PieChart: Only ${colors.length} colors provided for ${data.length} data items. Colors will repeat.`);
  }

  const total = data.reduce((sum, entry) => {
    const value = typeof entry.value === 'number' && !isNaN(entry.value)
      ? entry.value
      : 0;
    return sum + Math.max(0, value);
  }, 0);

  // Add check after total calculation
  if (total === 0) {
    return <EmptyChart message={emptyMessage || "No valid data to display"} height={height} />;
  }

  const renderLabel = (entry: any) => {
    if (!showPercentage) return '';
    const percent = ((entry.value / total) * 100).toFixed(1);
    return `${percent}%`;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <RechartsPieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={renderLabel}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'white',
            border: '1px solid #e5e7eb',
            borderRadius: '6px',
          }}
        />
        <Legend wrapperStyle={{ fontSize: '12px' }} />
      </RechartsPieChart>
    </ResponsiveContainer>
  );
}
