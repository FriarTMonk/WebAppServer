'use client';

import React from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { SalesCharts } from '@/components/admin/SalesCharts';

export default function SalesAnalyticsPage() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <BackButton />
      </div>

      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Sales Analytics</h1>
        <p className="text-gray-600 mt-2">
          Monitor sales pipeline stages and revenue projections
        </p>
      </div>

      <SalesCharts />
    </AdminLayout>
  );
}
