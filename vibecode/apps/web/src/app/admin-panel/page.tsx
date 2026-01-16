'use client';

import { useQuery } from '@tanstack/react-query';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { StatCard } from '@/components/admin/ui/StatCard';
import { DataTable } from '@/components/admin/ui/DataTable';
import { Badge } from '@/components/admin/ui/Badge';
import { adminApi, type AdminReport } from '@/lib/admin/api';
import { formatRelativeTime, formatNumber } from '@/lib/admin/utils';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: async () => {
      const response = await adminApi.getDashboardStats();
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });

  const { data: reportsData, isLoading: reportsLoading, error: reportsError } = useQuery({
    queryKey: ['admin', 'reports', 'pending'],
    queryFn: async () => {
      const response = await adminApi.getReports({ status: 'pending', limit: 5 });
      if (response.error) {
        throw new Error(response.error.message);
      }
      return response.data;
    },
  });

  const reportColumns = [
    {
      key: 'reason',
      header: 'Reason',
      render: (report: AdminReport) => (
        <Badge
          variant={
            report.reason === 'harassment' || report.reason === 'inappropriate'
              ? 'error'
              : report.reason === 'spam'
                ? 'warning'
                : 'default'
          }
        >
          {report.reason}
        </Badge>
      ),
    },
    {
      key: 'reporter',
      header: 'Reporter',
      render: (report: AdminReport) => (
        <span className="text-admin-text-secondary">@{report.reporterUsername}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (report: AdminReport) => (
        <span>
          {report.reportedShotId
            ? 'Shot'
            : report.reportedCommentId
              ? 'Comment'
              : 'User'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Reported',
      render: (report: AdminReport) => (
        <span className="text-admin-text-secondary">{formatRelativeTime(report.createdAt)}</span>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-admin-text">Dashboard</h1>
          <p className="text-admin-text-secondary mt-1">
            Overview of your platform&apos;s performance
          </p>
        </div>

        {/* Error Display */}
        {statsError && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 text-red-400">
            Failed to load stats: {(statsError as Error).message}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard
            title="Total Users"
            value={statsLoading ? '...' : formatNumber(stats?.totalUsers ?? 0)}
            change={stats?.newUsersToday ? `+${stats.newUsersToday} today` : undefined}
            changeType="positive"
            icon={<UsersIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Active Today"
            value={statsLoading ? '...' : formatNumber(stats?.activeToday ?? 0)}
            icon={<ActivityIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Total Shots"
            value={statsLoading ? '...' : formatNumber(stats?.totalShots ?? 0)}
            change={stats?.shotsToday ? `+${stats.shotsToday} today` : undefined}
            changeType="positive"
            icon={<ImageIcon className="w-6 h-6" />}
          />
          <StatCard
            title="Pending Reports"
            value={statsLoading ? '...' : stats?.pendingReports ?? 0}
            changeType={stats?.pendingReports && stats.pendingReports > 0 ? 'negative' : 'neutral'}
            icon={<AlertIcon className="w-6 h-6" />}
          />
        </div>

        {/* Recent Reports */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-admin-text">Pending Reports</h2>
            <a
              href="/admin-panel/moderation"
              className="text-sm text-admin-accent hover:text-admin-accent-hover"
            >
              View all
            </a>
          </div>
          <DataTable
            columns={reportColumns}
            data={reportsData?.reports ?? []}
            keyExtractor={(report) => report.id}
            onRowClick={() => {}}
            emptyMessage="No pending reports"
            isLoading={reportsLoading}
          />
        </div>
      </div>
    </AdminLayout>
  );
}

// Icon components
function UsersIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
  );
}

function ActivityIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
    </svg>
  );
}

function ImageIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
    </svg>
  );
}
