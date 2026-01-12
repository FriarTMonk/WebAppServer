'use client';

import React from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { MarketingCharts } from '@/components/admin/MarketingCharts';

export default function MarketingAnalyticsPage() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <BackButton />
      </div>

      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Marketing Analytics</h1>
        <p className="text-gray-600 mt-2">
          Track campaign performance and lead conversion metrics
        </p>
      </div>

      <MarketingCharts />
    </AdminLayout>
  );
}
