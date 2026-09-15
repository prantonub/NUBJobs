"use client";

import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { adminApi } from '@/lib/api/admin.api';

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isBanned: boolean;
  studentProfile?: { department?: string | null } | null;
  employerProfile?: { companyName?: string | null } | null;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const hasToken = typeof window !== 'undefined' && !!localStorage.getItem('token');
      if (!hasToken) {
        setUsers([]);
        return;
      }
      const { data } = await adminApi.users({ search });
      setUsers(data?.data ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [search]);

  const updateRole = async (user: UserRow) => {
    const nextRole = user.role === 'ADMIN' ? 'STUDENT' : user.role === 'STUDENT' ? 'EMPLOYER' : 'ADMIN';
    await adminApi.updateUserRole(user.id, nextRole);
    await loadUsers();
  };

  const toggleBan = async (user: UserRow) => {
    await adminApi.toggleUserBan(user.id, !user.isBanned);
    await loadUsers();
  };

  const removeUser = async (userId: string) => {
    await adminApi.removeUser(userId);
    await loadUsers();
  };

  return (
    <Card className="p-4">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">User Management</h2>
          <p className="text-sm text-muted-foreground">Manage members, roles, and bans.</p>
        </div>
        <Input
          placeholder="Search users..."
          className="max-w-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b text-muted-foreground">
              <th className="p-3">Name</th>
              <th className="p-3">Email</th>
              <th className="p-3">Role</th>
              <th className="p-3">Department</th>
              <th className="p-3">Status</th>
              <th className="p-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">Loading users...</td></tr>
            ) : users.length === 0 ? (
              <tr><td colSpan={6} className="p-4 text-muted-foreground">No users found.</td></tr>
            ) : users.map((user) => (
              <tr key={user.id} className="border-b align-top">
                <td className="p-3 font-medium">{user.name}</td>
                <td className="p-3">{user.email}</td>
                <td className="p-3">
                  <Badge variant="secondary">{user.role}</Badge>
                </td>
                <td className="p-3">{user.studentProfile?.department ?? user.employerProfile?.companyName ?? '—'}</td>
                <td className="p-3">
                  <Badge variant={user.isBanned ? 'destructive' : 'outline'}>
                    {user.isBanned ? 'BANNED' : 'ACTIVE'}
                  </Badge>
                </td>
                <td className="p-3">
                  <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => updateRole(user)}>Change Role</Button>
                    <Button variant={user.isBanned ? 'default' : 'secondary'} size="sm" onClick={() => toggleBan(user)}>
                      {user.isBanned ? 'Unban' : 'Ban'}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => removeUser(user.id)}>Delete</Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
