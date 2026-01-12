'use client';

import React from 'react';
import { AdminLayout } from '@/components/AdminLayout';
import { BackButton } from '@/components/BackButton';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { AdminAnalyticsCharts } from '@/components/admin/AdminAnalyticsCharts';

export default function AdminAnalyticsPage() {
  return (
    <AdminLayout>
      <div className="mb-6">
        <BackButton />
      </div>

      <Breadcrumbs />

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Monitor platform performance, costs, and user engagement metrics
        </p>
      </div>

      <AdminAnalyticsCharts />
    </AdminLayout>
  );
}
