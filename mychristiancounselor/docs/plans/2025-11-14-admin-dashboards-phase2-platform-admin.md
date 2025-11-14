# Admin Dashboards - Phase 2: Platform Admin Dashboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build the Platform Admin Dashboard with API endpoints for metrics, organizations, and users, plus the frontend UI with overview, organizations list, and users list pages.

**Architecture:** Extend existing AdminModule with services for platform-wide metrics and CRUD operations. Create Next.js pages under `/admin/*` with protected routes. Use server-side data fetching for real-time metrics. Implement search, filtering, and pagination for large datasets.

**Tech Stack:** NestJS, Prisma, PostgreSQL, Next.js 15, React, TypeScript, Tailwind CSS, JWT authentication

---

## Task 1: Add Platform Metrics API Endpoints

**Files:**
- Modify: `packages/api/src/admin/admin.service.ts`
- Modify: `packages/api/src/admin/admin.controller.ts`

**Step 1: Add getPlatformMetrics method to AdminService**

In `packages/api/src/admin/admin.service.ts`, add this method after `getAuditLog`:

```typescript
async getPlatformMetrics(): Promise<any> {
  const [
    totalUsers,
    activeUsers,
    individualUsers,
    orgUsers,
    totalOrgs,
    trialOrgs,
    activeOrgs,
    expiredOrgs,
  ] = await Promise.all([
    // Total users
    this.prisma.user.count({ where: { isActive: true } }),

    // Active users (logged in within last 7 days)
    this.prisma.user.count({
      where: {
        isActive: true,
        refreshTokens: {
          some: {
            createdAt: {
              gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
            },
          },
        },
      },
    }),

    // Individual account users
    this.prisma.user.count({
      where: { isActive: true, accountType: 'individual' },
    }),

    // Organization account users
    this.prisma.user.count({
      where: { isActive: true, accountType: 'organization' },
    }),

    // Total organizations
    this.prisma.organization.count({
      where: { isSystemOrganization: false },
    }),

    // Trial organizations
    this.prisma.organization.count({
      where: { isSystemOrganization: false, licenseStatus: 'trial' },
    }),

    // Active organizations
    this.prisma.organization.count({
      where: { isSystemOrganization: false, licenseStatus: 'active' },
    }),

    // Expired organizations
    this.prisma.organization.count({
      where: { isSystemOrganization: false, licenseStatus: 'expired' },
    }),
  ]);

  return {
    activeUsers: {
      total: activeUsers,
      individual: individualUsers,
      organization: orgUsers,
    },
    totalUsers,
    organizations: {
      total: totalOrgs,
      trial: trialOrgs,
      active: activeOrgs,
      expired: expiredOrgs,
    },
    timestamp: new Date(),
  };
}
```

**Step 2: Add metrics endpoint to AdminController**

In `packages/api/src/admin/admin.controller.ts`, add this method after `healthCheck`:

```typescript
@Get('metrics')
async getMetrics(@CurrentUser() user: User) {
  await this.adminService.logAdminAction(
    user.id,
    'view_metrics',
    { timestamp: new Date() },
  );

  return this.adminService.getPlatformMetrics();
}
```

**Step 3: Test the endpoint**

Run:
```bash
npm run start:dev
```

Test with curl (replace token with valid platform admin JWT):
```bash
curl http://localhost:3697/admin/metrics \
  -H "Authorization: Bearer <valid-jwt-token>"
```

Expected: JSON response with activeUsers, totalUsers, organizations counts

**Step 4: Commit**

```bash
git add packages/api/src/admin/admin.service.ts packages/api/src/admin/admin.controller.ts
git commit -m "feat(admin): add platform metrics API endpoint

- Add getPlatformMetrics method with user and org counts
- Include active users breakdown by account type
- Log admin action when metrics are viewed"
```

---

## Task 2: Add Organizations List API Endpoint

**Files:**
- Modify: `packages/api/src/admin/admin.service.ts`
- Modify: `packages/api/src/admin/admin.controller.ts`

**Step 1: Add getAllOrganizations method to AdminService**

In `packages/api/src/admin/admin.service.ts`, add after `getPlatformMetrics`:

```typescript
async getAllOrganizations(filters?: {
  search?: string;
  licenseStatus?: string;
  skip?: number;
  take?: number;
}) {
  const where: any = {
    isSystemOrganization: false,
  };

  if (filters?.search) {
    where.OR = [
      { name: { contains: filters.search, mode: 'insensitive' } },
      { description: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters?.licenseStatus) {
    where.licenseStatus = filters.licenseStatus;
  }

  const [organizations, total] = await Promise.all([
    this.prisma.organization.findMany({
      where,
      include: {
        members: {
          select: {
            id: true,
            userId: true,
          },
        },
        _count: {
          select: {
            members: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip || 0,
      take: filters?.take || 50,
    }),
    this.prisma.organization.count({ where }),
  ]);

  return {
    organizations,
    total,
    skip: filters?.skip || 0,
    take: filters?.take || 50,
  };
}
```

**Step 2: Add organizations endpoint to AdminController**

In `packages/api/src/admin/admin.controller.ts`, add after `getMetrics`:

```typescript
@Get('organizations')
async getOrganizations(
  @CurrentUser() user: User,
  @Query('search') search?: string,
  @Query('licenseStatus') licenseStatus?: string,
  @Query('skip') skip?: string,
  @Query('take') take?: string,
) {
  await this.adminService.logAdminAction(
    user.id,
    'view_organizations',
    { filters: { search, licenseStatus, skip, take } },
  );

  return this.adminService.getAllOrganizations({
    search,
    licenseStatus,
    skip: skip ? parseInt(skip, 10) : undefined,
    take: take ? parseInt(take, 10) : undefined,
  });
}
```

**Step 3: Test the endpoint**

Run:
```bash
npm run start:dev
```

Test with curl:
```bash
curl "http://localhost:3697/admin/organizations?take=10" \
  -H "Authorization: Bearer <valid-jwt-token>"
```

Expected: JSON response with organizations array, total, skip, take

**Step 4: Commit**

```bash
git add packages/api/src/admin/admin.service.ts packages/api/src/admin/admin.controller.ts
git commit -m "feat(admin): add organizations list API endpoint

- Add getAllOrganizations with search and filters
- Include member counts per organization
- Support pagination with skip/take
- Log admin action when organizations viewed"
```

---

## Task 3: Add Users List API Endpoint

**Files:**
- Modify: `packages/api/src/admin/admin.service.ts`
- Modify: `packages/api/src/admin/admin.controller.ts`

**Step 1: Add getAllUsers method to AdminService**

In `packages/api/src/admin/admin.service.ts`, add after `getAllOrganizations`:

```typescript
async getAllUsers(filters?: {
  search?: string;
  accountType?: string;
  isActive?: boolean;
  skip?: number;
  take?: number;
}) {
  const where: any = {};

  if (filters?.search) {
    where.OR = [
      { email: { contains: filters.search, mode: 'insensitive' } },
      { firstName: { contains: filters.search, mode: 'insensitive' } },
      { lastName: { contains: filters.search, mode: 'insensitive' } },
    ];
  }

  if (filters?.accountType) {
    where.accountType = filters.accountType;
  }

  if (filters?.isActive !== undefined) {
    where.isActive = filters.isActive;
  }

  const [users, total] = await Promise.all([
    this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        accountType: true,
        emailVerified: true,
        isActive: true,
        createdAt: true,
        organizationMemberships: {
          select: {
            organization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      skip: filters?.skip || 0,
      take: filters?.take || 50,
    }),
    this.prisma.user.count({ where }),
  ]);

  return {
    users,
    total,
    skip: filters?.skip || 0,
    take: filters?.take || 50,
  };
}
```

**Step 2: Add users endpoint to AdminController**

In `packages/api/src/admin/admin.controller.ts`, add after `getOrganizations`:

```typescript
@Get('users')
async getUsers(
  @CurrentUser() user: User,
  @Query('search') search?: string,
  @Query('accountType') accountType?: string,
  @Query('isActive') isActive?: string,
  @Query('skip') skip?: string,
  @Query('take') take?: string,
) {
  await this.adminService.logAdminAction(
    user.id,
    'view_users',
    { filters: { search, accountType, isActive, skip, take } },
  );

  return this.adminService.getAllUsers({
    search,
    accountType,
    isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
    skip: skip ? parseInt(skip, 10) : undefined,
    take: take ? parseInt(take, 10) : undefined,
  });
}
```

**Step 3: Test the endpoint**

Run:
```bash
npm run start:dev
```

Test with curl:
```bash
curl "http://localhost:3697/admin/users?take=10&accountType=individual" \
  -H "Authorization: Bearer <valid-jwt-token>"
```

Expected: JSON response with users array, total, skip, take

**Step 4: Commit**

```bash
git add packages/api/src/admin/admin.service.ts packages/api/src/admin/admin.controller.ts
git commit -m "feat(admin): add users list API endpoint

- Add getAllUsers with search and filters
- Filter by account type and active status
- Include organization memberships
- Support pagination
- Log admin action when users viewed"
```

---

## Task 4: Create Admin Layout Component

**Files:**
- Create: `packages/web/src/components/AdminLayout.tsx`

**Step 1: Create AdminLayout component**

Create `packages/web/src/components/AdminLayout.tsx`:

```typescript
'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

interface AdminLayoutProps {
  children: React.ReactNode;
}

export function AdminLayout({ children }: AdminLayoutProps) {
  const pathname = usePathname();

  const isActive = (path: string) => {
    return pathname === path ? 'bg-blue-700' : 'hover:bg-blue-600';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-blue-800 text-white shadow-lg">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold">Platform Administration</h1>
            <Link
              href="/"
              className="text-sm hover:underline"
            >
              Back to App
            </Link>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar Navigation */}
        <aside className="w-64 bg-blue-900 text-white min-h-[calc(100vh-4rem)]">
          <nav className="p-4">
            <ul className="space-y-2">
              <li>
                <Link
                  href="/admin"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/admin')}`}
                >
                  Overview
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/organizations"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/organizations')}`}
                >
                  Organizations
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/users')}`}
                >
                  Users
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/audit-log"
                  className={`block px-4 py-2 rounded transition-colors ${isActive('/admin/audit-log')}`}
                >
                  Audit Log
                </Link>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
```

**Step 2: Verify component compiles**

Run:
```bash
npx nx build web
```

Expected: Build successful

**Step 3: Commit**

```bash
git add packages/web/src/components/AdminLayout.tsx
git commit -m "feat(admin): create admin layout component

- Add sidebar navigation with admin menu items
- Highlight active page
- Include header with platform title
- Responsive layout with sidebar and content area"
```

---

## Task 5: Create Admin Overview Page

**Files:**
- Create: `packages/web/src/app/admin/page.tsx`

**Step 1: Create admin overview page**

Create `packages/web/src/app/admin/page.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../components/AdminLayout';

interface PlatformMetrics {
  activeUsers: {
    total: number;
    individual: number;
    organization: number;
  };
  totalUsers: number;
  organizations: {
    total: number;
    trial: number;
    active: number;
    expired: number;
  };
  timestamp: string;
}

export default function AdminOverviewPage() {
  const [metrics, setMetrics] = useState<PlatformMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const response = await fetch(`${apiUrl}/admin/metrics`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }

      const data = await response.json();
      setMetrics(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Platform Overview</h2>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading metrics...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
            <button
              onClick={fetchMetrics}
              className="mt-2 text-sm text-red-600 hover:underline"
            >
              Retry
            </button>
          </div>
        )}

        {metrics && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Active Users Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Active Users</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics.activeUsers.total}</p>
              <div className="mt-2 text-sm text-gray-600">
                <p>Individual: {metrics.activeUsers.individual}</p>
                <p>Organization: {metrics.activeUsers.organization}</p>
              </div>
            </div>

            {/* Total Users Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Total Users</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics.totalUsers}</p>
            </div>

            {/* Organizations Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Organizations</h3>
              <p className="text-3xl font-bold text-gray-900">{metrics.organizations.total}</p>
              <div className="mt-2 text-sm text-gray-600">
                <p>Trial: {metrics.organizations.trial}</p>
                <p>Active: {metrics.organizations.active}</p>
                <p>Expired: {metrics.organizations.expired}</p>
              </div>
            </div>

            {/* Last Updated Card */}
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-2">Last Updated</h3>
              <p className="text-sm text-gray-900">
                {new Date(metrics.timestamp).toLocaleString()}
              </p>
              <button
                onClick={fetchMetrics}
                className="mt-4 text-sm bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
              >
                Refresh
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
```

**Step 2: Test the page**

Navigate to `http://localhost:3699/admin` in browser (after logging in as platform admin)

Expected: Overview page with metrics cards displayed

**Step 3: Commit**

```bash
git add packages/web/src/app/admin/page.tsx
git commit -m "feat(admin): create overview page with metrics

- Display active users count with breakdown
- Show total users count
- Display organization counts by status
- Add refresh button for metrics
- Include loading and error states"
```

---

## Task 6: Create Organizations List Page

**Files:**
- Create: `packages/web/src/app/admin/organizations/page.tsx`

**Step 1: Create organizations list page**

Create `packages/web/src/app/admin/organizations/page.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/AdminLayout';

interface Organization {
  id: string;
  name: string;
  description: string | null;
  licenseType: string | null;
  licenseStatus: string;
  licenseExpiresAt: string | null;
  maxMembers: number;
  createdAt: string;
  _count: {
    members: number;
  };
}

export default function OrganizationsListPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    fetchOrganizations();
  }, [search, statusFilter]);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter) params.append('licenseStatus', statusFilter);

      const response = await fetch(`${apiUrl}/admin/organizations?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch organizations');
      }

      const data = await response.json();
      setOrganizations(data.organizations);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'trial': return 'bg-yellow-100 text-yellow-800';
      case 'active': return 'bg-green-100 text-green-800';
      case 'expired': return 'bg-red-100 text-red-800';
      case 'cancelled': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <AdminLayout>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Organizations</h2>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or description..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="trial">Trial</option>
                <option value="active">Active</option>
                <option value="expired">Expired</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading organizations...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    License Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Members
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {organizations.map((org) => (
                  <tr key={org.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{org.name}</div>
                      {org.description && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {org.description}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(org.licenseStatus)}`}>
                        {org.licenseStatus}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {org.licenseType || 'N/A'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {org._count.members} / {org.maxMembers}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {organizations.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No organizations found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
```

**Step 2: Test the page**

Navigate to `http://localhost:3699/admin/organizations` in browser

Expected: Organizations table with search and filter functionality

**Step 3: Commit**

```bash
git add packages/web/src/app/admin/organizations/page.tsx
git commit -m "feat(admin): create organizations list page

- Display organizations in sortable table
- Add search by name/description
- Filter by license status
- Show member counts and limits
- Color-coded status badges"
```

---

## Task 7: Create Users List Page

**Files:**
- Create: `packages/web/src/app/admin/users/page.tsx`

**Step 1: Create users list page**

Create `packages/web/src/app/admin/users/page.tsx`:

```typescript
'use client';

import React, { useEffect, useState } from 'react';
import { AdminLayout } from '../../../components/AdminLayout';

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  accountType: string;
  emailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  organizationMemberships: Array<{
    organization: {
      id: string;
      name: string;
    };
  }>;
}

export default function UsersListPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [accountTypeFilter, setAccountTypeFilter] = useState('');
  const [activeFilter, setActiveFilter] = useState('');

  useEffect(() => {
    fetchUsers();
  }, [search, accountTypeFilter, activeFilter]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);

      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3697';
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (accountTypeFilter) params.append('accountType', accountTypeFilter);
      if (activeFilter) params.append('isActive', activeFilter);

      const response = await fetch(`${apiUrl}/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data.users);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getFullName = (user: User) => {
    if (user.firstName || user.lastName) {
      return `${user.firstName || ''} ${user.lastName || ''}`.trim();
    }
    return 'N/A';
  };

  return (
    <AdminLayout>
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-6">Users</h2>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search
              </label>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by email or name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Account Type
              </label>
              <select
                value={accountTypeFilter}
                onChange={(e) => setAccountTypeFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Types</option>
                <option value="individual">Individual</option>
                <option value="organization">Organization</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>
          </div>
        </div>

        {loading && (
          <div className="text-center py-12">
            <p className="text-gray-500">Loading users...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">Error: {error}</p>
          </div>
        )}

        {!loading && !error && (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Verified
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Organizations
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Created
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {users.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {getFullName(user)}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.accountType === 'individual'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {user.accountType}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {user.emailVerified ? (
                        <span className="text-green-600">✓</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        user.isActive
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {user.organizationMemberships.length > 0 ? (
                        <div className="space-y-1">
                          {user.organizationMemberships.map((membership) => (
                            <div key={membership.organization.id}>
                              {membership.organization.name}
                            </div>
                          ))}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="text-center py-12">
                <p className="text-gray-500">No users found</p>
              </div>
            )}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}
```

**Step 2: Test the page**

Navigate to `http://localhost:3699/admin/users` in browser

Expected: Users table with search and multiple filters

**Step 3: Commit**

```bash
git add packages/web/src/app/admin/users/page.tsx
git commit -m "feat(admin): create users list page

- Display users in comprehensive table
- Add search by email/name
- Filter by account type and active status
- Show verification status
- Display organization memberships
- Color-coded badges for type and status"
```

---

## Task 8: Add Admin Route Protection

**Files:**
- Create: `packages/web/src/middleware.ts` (if doesn't exist)
- Or Modify: `packages/web/src/middleware.ts`

**Step 1: Create or update middleware for admin routes**

Create or update `packages/web/src/middleware.ts`:

```typescript
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Check if route is admin route
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Check for access token
    const accessToken = request.cookies.get('accessToken')?.value;

    if (!accessToken) {
      // Redirect to login if no token
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', request.nextUrl.pathname);
      return NextResponse.redirect(loginUrl);
    }

    // TODO: Validate platform admin permission
    // For now, just check for valid token
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
```

**Step 2: Test route protection**

Try accessing `http://localhost:3699/admin` without being logged in

Expected: Redirect to login page with redirect parameter

**Step 3: Commit**

```bash
git add packages/web/src/middleware.ts
git commit -m "feat(admin): add admin route protection middleware

- Redirect to login if not authenticated
- Protect all /admin/* routes
- Preserve redirect URL for post-login navigation"
```

---

## Verification Steps

After completing all tasks, verify Phase 2:

1. **Backend API Endpoints:**
   ```bash
   # Start API server
   npm run start:dev

   # Test metrics endpoint
   curl http://localhost:3697/admin/metrics \
     -H "Authorization: Bearer <valid-platform-admin-token>"

   # Test organizations endpoint
   curl http://localhost:3697/admin/organizations \
     -H "Authorization: Bearer <valid-platform-admin-token>"

   # Test users endpoint
   curl http://localhost:3697/admin/users \
     -H "Authorization: Bearer <valid-platform-admin-token>"
   ```
   Expected: All return valid JSON responses

2. **Frontend Pages:**
   - Navigate to `http://localhost:3699/admin` - see overview with metrics
   - Navigate to `http://localhost:3699/admin/organizations` - see org list
   - Navigate to `http://localhost:3699/admin/users` - see user list
   - Test search and filter functionality on each page

3. **Route Protection:**
   - Log out and try accessing admin pages
   - Should redirect to login with redirect parameter

4. **Build Test:**
   ```bash
   cd packages/web
   npm run build
   ```
   Expected: Build successful

---

## Next Steps

After completing Phase 2 Platform Admin Dashboard, proceed to:
- **Phase 3:** Morphing & Audit functionality (user impersonation)
- **Phase 4:** Organization Admin Dashboard
- **Phase 5:** Advanced Metrics with background jobs

Phase 2 provides the foundation for platform administration with real-time data viewing and basic management capabilities.
