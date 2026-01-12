import { SalesCharts } from '@/components/admin/SalesCharts';

export default function SalesAnalyticsPage() {
  return (
    <div className="container mx-auto py-8">
      <h1 className="text-3xl font-bold mb-6">Sales Analytics</h1>
      <SalesCharts />
    </div>
  );
}
