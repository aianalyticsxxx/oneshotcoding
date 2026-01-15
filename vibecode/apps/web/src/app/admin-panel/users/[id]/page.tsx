'use client';

import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { Button } from '@/components/admin/ui/Button';
import { Badge } from '@/components/admin/ui/Badge';
import { DataTable } from '@/components/admin/ui/DataTable';
import { Modal } from '@/components/admin/ui/Modal';
import { Input } from '@/components/admin/ui/Input';
import { adminApi, type AdminShot, type AdminReport } from '@/lib/admin/api';
import { formatDate, formatRelativeTime, formatNumber } from '@/lib/admin/utils';

export default function UserDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const userId = params.id as string;

  const [activeTab, setActiveTab] = useState<'profile' | 'shots' | 'reports'>('profile');
  const [actionModal, setActionModal] = useState<'ban' | 'delete' | null>(null);
  const [banReason, setBanReason] = useState('');

  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ['admin', 'user', userId],
    queryFn: async () => {
      const response = await adminApi.getUser(userId);
      return response.data;
    },
  });

  const { data: shotsData, isLoading: shotsLoading } = useQuery({
    queryKey: ['admin', 'user', userId, 'shots'],
    queryFn: async () => {
      const response = await adminApi.getShots({ userId });
      return response.data;
    },
    enabled: activeTab === 'shots',
  });

  const { data: reportsData, isLoading: reportsLoading } = useQuery({
    queryKey: ['admin', 'user', userId, 'reports'],
    queryFn: async () => {
      const response = await adminApi.getReports({});
      // Filter reports against this user
      const filtered = response.data?.reports.filter(
        (r) => r.reportedUserId === userId
      );
      return { reports: filtered || [] };
    },
    enabled: activeTab === 'reports',
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return adminApi.banUser(userId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
      setActionModal(null);
      setBanReason('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return adminApi.deleteUser(userId);
    },
    onSuccess: () => {
      router.push('/admin-panel/users');
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      return adminApi.updateUser(userId, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId] });
    },
  });

  const deleteShotMutation = useMutation({
    mutationFn: async (shotId: string) => {
      return adminApi.deleteShot(shotId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'user', userId, 'shots'] });
    },
  });

  const shotColumns = [
    {
      key: 'image',
      header: 'Shot',
      render: (shot: AdminShot) => (
        <img src={shot.imageUrl} alt="" className="w-12 h-12 rounded-lg object-cover" />
      ),
    },
    {
      key: 'prompt',
      header: 'Prompt',
      render: (shot: AdminShot) => (
        <span className="text-admin-text truncate max-w-xs block">{shot.prompt}</span>
      ),
    },
    {
      key: 'stats',
      header: 'Stats',
      render: (shot: AdminShot) => (
        <div className="text-sm">
          <p>{shot.sparkleCount} sparkles</p>
          <p className="text-admin-text-secondary">{shot.commentCount} comments</p>
        </div>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      render: (shot: AdminShot) => (
        <span className="text-admin-text-secondary">{formatRelativeTime(shot.createdAt)}</span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (shot: AdminShot) => (
        <Button
          size="sm"
          variant="danger"
          onClick={(e) => {
            e.stopPropagation();
            deleteShotMutation.mutate(shot.id);
          }}
          isLoading={deleteShotMutation.isPending}
        >
          Delete
        </Button>
      ),
    },
  ];

  const reportColumns = [
    {
      key: 'reason',
      header: 'Reason',
      render: (report: AdminReport) => <Badge variant="warning">{report.reason}</Badge>,
    },
    {
      key: 'reporter',
      header: 'Reporter',
      render: (report: AdminReport) => <span>@{report.reporterUsername}</span>,
    },
    {
      key: 'status',
      header: 'Status',
      render: (report: AdminReport) => (
        <Badge
          variant={
            report.status === 'pending'
              ? 'warning'
              : report.status === 'actioned'
                ? 'error'
                : 'success'
          }
        >
          {report.status}
        </Badge>
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

  if (userLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-admin-accent border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminLayout>
    );
  }

  if (!user) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-admin-text-secondary">User not found</p>
          <Button variant="secondary" className="mt-4" onClick={() => router.push('/admin-panel/users')}>
            Back to Users
          </Button>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/admin-panel/users')}
              className="p-2 text-admin-text-secondary hover:text-admin-text"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="" className="w-16 h-16 rounded-full" />
            ) : (
              <div className="w-16 h-16 rounded-full bg-admin-bg-hover flex items-center justify-center">
                <span className="text-xl">{user.displayName[0]?.toUpperCase()}</span>
              </div>
            )}
            <div>
              <h1 className="text-2xl font-bold text-admin-text">{user.displayName}</h1>
              <p className="text-admin-text-secondary">@{user.username}</p>
              <div className="flex items-center gap-2 mt-1">
                {user.deletedAt ? (
                  <Badge variant="error">Banned</Badge>
                ) : (
                  <Badge variant="success">Active</Badge>
                )}
                {user.isAdmin && <Badge variant="info">Admin</Badge>}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              onClick={() => toggleAdminMutation.mutate({ userId, isAdmin: !user.isAdmin })}
              isLoading={toggleAdminMutation.isPending}
            >
              {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
            </Button>
            {!user.deletedAt && (
              <Button variant="danger" onClick={() => setActionModal('ban')}>
                Ban User
              </Button>
            )}
            <Button variant="danger" onClick={() => setActionModal('delete')}>
              Delete
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-4">
            <p className="text-admin-text-secondary text-sm">Shots</p>
            <p className="text-2xl font-bold text-admin-text">{formatNumber(user.shotCount)}</p>
          </div>
          <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-4">
            <p className="text-admin-text-secondary text-sm">Followers</p>
            <p className="text-2xl font-bold text-admin-text">{formatNumber(user.followerCount)}</p>
          </div>
          <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-4">
            <p className="text-admin-text-secondary text-sm">Following</p>
            <p className="text-2xl font-bold text-admin-text">{formatNumber(user.followingCount)}</p>
          </div>
          <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-4">
            <p className="text-admin-text-secondary text-sm">Total Sparkles</p>
            <p className="text-2xl font-bold text-admin-text">{formatNumber(user.totalSparkles)}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-admin-border">
          <div className="flex gap-8">
            {(['profile', 'shots', 'reports'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`py-3 text-sm font-medium border-b-2 -mb-px transition-colors ${
                  activeTab === tab
                    ? 'border-admin-accent text-admin-text'
                    : 'border-transparent text-admin-text-secondary hover:text-admin-text'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
                {tab === 'reports' && user.reportsAgainst > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-admin-error/20 text-admin-error text-xs rounded-full">
                    {user.reportsAgainst}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'profile' && (
          <div className="bg-admin-bg-elevated border border-admin-border rounded-xl p-6 space-y-4">
            <div>
              <label className="text-sm text-admin-text-secondary">Bio</label>
              <p className="text-admin-text mt-1">{user.bio || 'No bio set'}</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm text-admin-text-secondary">Joined</label>
                <p className="text-admin-text mt-1">{formatDate(user.createdAt)}</p>
              </div>
              <div>
                <label className="text-sm text-admin-text-secondary">Last Active</label>
                <p className="text-admin-text mt-1">
                  {user.lastActiveAt ? formatRelativeTime(user.lastActiveAt) : 'Never'}
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'shots' && (
          <DataTable
            columns={shotColumns}
            data={shotsData?.shots ?? []}
            keyExtractor={(shot) => shot.id}
            isLoading={shotsLoading}
            emptyMessage="No shots found"
          />
        )}

        {activeTab === 'reports' && (
          <DataTable
            columns={reportColumns}
            data={reportsData?.reports ?? []}
            keyExtractor={(report) => report.id}
            isLoading={reportsLoading}
            emptyMessage="No reports against this user"
            onRowClick={(report) => router.push(`/admin-panel/moderation?report=${report.id}`)}
          />
        )}

        {/* Ban Modal */}
        <Modal
          isOpen={actionModal === 'ban'}
          onClose={() => {
            setActionModal(null);
            setBanReason('');
          }}
          title="Ban User"
        >
          <div className="space-y-4">
            <p className="text-admin-text-secondary">
              Are you sure you want to ban <strong>@{user.username}</strong>?
            </p>
            <Input
              label="Reason for ban"
              value={banReason}
              onChange={(e) => setBanReason(e.target.value)}
              placeholder="Enter reason..."
            />
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={banMutation.isPending}
                onClick={() => banMutation.mutate({ userId, reason: banReason })}
              >
                Ban User
              </Button>
            </div>
          </div>
        </Modal>

        {/* Delete Modal */}
        <Modal
          isOpen={actionModal === 'delete'}
          onClose={() => setActionModal(null)}
          title="Delete User"
        >
          <div className="space-y-4">
            <p className="text-admin-text-secondary">
              Are you sure you want to permanently delete <strong>@{user.username}</strong>? This
              action cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={deleteMutation.isPending}
                onClick={() => deleteMutation.mutate(userId)}
              >
                Delete User
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
