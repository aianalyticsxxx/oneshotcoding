'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { AdminLayout } from '@/components/admin/AdminLayout';
import { DataTable } from '@/components/admin/ui/DataTable';
import { Button } from '@/components/admin/ui/Button';
import { Badge } from '@/components/admin/ui/Badge';
import { Input } from '@/components/admin/ui/Input';
import { Select } from '@/components/admin/ui/Select';
import { Modal } from '@/components/admin/ui/Modal';
import { adminApi, type AdminUserListItem } from '@/lib/admin/api';
import { formatDate, formatRelativeTime } from '@/lib/admin/utils';

export default function UsersPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [adminFilter, setAdminFilter] = useState('all');
  const [selectedUser, setSelectedUser] = useState<AdminUserListItem | null>(null);
  const [actionModal, setActionModal] = useState<'ban' | 'delete' | 'revoke' | null>(null);
  const [banReason, setBanReason] = useState('');

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin', 'users', search, statusFilter, adminFilter],
    queryFn: async () => {
      const params: { search?: string; status?: string; isAdmin?: boolean } = {};
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (adminFilter !== 'all') params.isAdmin = adminFilter === 'admin';
      const response = await adminApi.getUsers(params);
      return response.data;
    },
  });

  const banMutation = useMutation({
    mutationFn: async ({ userId, reason }: { userId: string; reason: string }) => {
      return adminApi.banUser(userId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionModal(null);
      setSelectedUser(null);
      setBanReason('');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      return adminApi.deleteUser(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionModal(null);
      setSelectedUser(null);
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: string) => {
      return adminApi.revokeUserSessions(userId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setActionModal(null);
      setSelectedUser(null);
    },
  });

  const toggleAdminMutation = useMutation({
    mutationFn: async ({ userId, isAdmin }: { userId: string; isAdmin: boolean }) => {
      return adminApi.updateUser(userId, { isAdmin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });

  const columns = [
    {
      key: 'user',
      header: 'User',
      render: (user: AdminUserListItem) => (
        <div className="flex items-center gap-3">
          {user.avatarUrl ? (
            <img src={user.avatarUrl} alt="" className="w-8 h-8 rounded-full" />
          ) : (
            <div className="w-8 h-8 rounded-full bg-admin-bg-hover flex items-center justify-center">
              <span className="text-xs">{user.displayName[0]?.toUpperCase()}</span>
            </div>
          )}
          <div>
            <p className="font-medium text-admin-text">{user.displayName}</p>
            <p className="text-sm text-admin-text-secondary">@{user.username}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (user: AdminUserListItem) => (
        <div className="flex items-center gap-2">
          {user.deletedAt ? (
            <Badge variant="error">Banned</Badge>
          ) : (
            <Badge variant="success">Active</Badge>
          )}
          {user.isAdmin && <Badge variant="info">Admin</Badge>}
        </div>
      ),
    },
    {
      key: 'stats',
      header: 'Stats',
      render: (user: AdminUserListItem) => (
        <div className="text-sm">
          <p>{user.shotCount} shots</p>
          <p className="text-admin-text-secondary">{user.followerCount} followers</p>
        </div>
      ),
    },
    {
      key: 'joined',
      header: 'Joined',
      render: (user: AdminUserListItem) => (
        <span className="text-admin-text-secondary">{formatDate(user.createdAt)}</span>
      ),
    },
    {
      key: 'lastActive',
      header: 'Last Active',
      render: (user: AdminUserListItem) => (
        <span className="text-admin-text-secondary">
          {user.lastActiveAt ? formatRelativeTime(user.lastActiveAt) : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      render: (user: AdminUserListItem) => (
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              toggleAdminMutation.mutate({ userId: user.id, isAdmin: !user.isAdmin });
            }}
          >
            {user.isAdmin ? 'Remove Admin' : 'Make Admin'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedUser(user);
              setActionModal('revoke');
            }}
          >
            Revoke Sessions
          </Button>
          {!user.deletedAt && (
            <Button
              size="sm"
              variant="danger"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedUser(user);
                setActionModal('ban');
              }}
            >
              Ban
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-admin-text">Users</h1>
          <p className="text-admin-text-secondary mt-1">
            Manage user accounts and permissions
          </p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[200px] max-w-md">
            <Input
              placeholder="Search by username..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Status' },
              { value: 'active', label: 'Active' },
              { value: 'banned', label: 'Banned' },
            ]}
          />
          <Select
            value={adminFilter}
            onChange={(e) => setAdminFilter(e.target.value)}
            options={[
              { value: 'all', label: 'All Users' },
              { value: 'admin', label: 'Admins Only' },
              { value: 'regular', label: 'Regular Users' },
            ]}
          />
          <Button variant="secondary" onClick={() => refetch()}>
            Refresh
          </Button>
        </div>

        {/* Table */}
        <DataTable
          columns={columns}
          data={data?.users ?? []}
          keyExtractor={(user) => user.id}
          onRowClick={(user) => router.push(`/admin-panel/users/${user.id}`)}
          isLoading={isLoading}
          emptyMessage="No users found"
        />

        {/* Ban Modal */}
        <Modal
          isOpen={actionModal === 'ban'}
          onClose={() => {
            setActionModal(null);
            setSelectedUser(null);
            setBanReason('');
          }}
          title="Ban User"
        >
          <div className="space-y-4">
            <p className="text-admin-text-secondary">
              Are you sure you want to ban <strong>@{selectedUser?.username}</strong>? This will
              prevent them from logging in.
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
                onClick={() => {
                  if (selectedUser) {
                    banMutation.mutate({ userId: selectedUser.id, reason: banReason });
                  }
                }}
              >
                Ban User
              </Button>
            </div>
          </div>
        </Modal>

        {/* Revoke Sessions Modal */}
        <Modal
          isOpen={actionModal === 'revoke'}
          onClose={() => {
            setActionModal(null);
            setSelectedUser(null);
          }}
          title="Revoke Sessions"
        >
          <div className="space-y-4">
            <p className="text-admin-text-secondary">
              Are you sure you want to revoke all sessions for{' '}
              <strong>@{selectedUser?.username}</strong>? They will be logged out from all devices.
            </p>
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setActionModal(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                isLoading={revokeMutation.isPending}
                onClick={() => {
                  if (selectedUser) {
                    revokeMutation.mutate(selectedUser.id);
                  }
                }}
              >
                Revoke Sessions
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </AdminLayout>
  );
}
