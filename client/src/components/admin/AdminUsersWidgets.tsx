"use client";

import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useBanUser, useDeleteUser, useResetPassword } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';

export function AdminUserFilters(props: {
  search: string; setSearch: (v: string) => void;
  role: string; setRole: (v: string) => void;
  status: string; setStatus: (v: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-xl font-semibold">User Management</h2>
        <p className="text-sm text-muted-foreground">Search, filter, suspend, or remove accounts.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Input placeholder="Search name/email..." className="w-52" value={props.search} onChange={(e) => props.setSearch(e.target.value)} />
        <RoleSelect value={props.role} onChange={props.setRole} />
        <StatusSelect value={props.status} onChange={props.setStatus} />
      </div>
    </div>
  );
}

function RoleSelect(props: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="rounded-md border px-3 py-2 text-sm" aria-label="Filter by role" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
      <option value="ALL">All roles</option>
      <option value="STUDENT">Students</option>
      <option value="EMPLOYER">Employers</option>
      <option value="ADMIN">Admins</option>
    </select>
  );
}

function StatusSelect(props: { value: string; onChange: (v: string) => void }) {
  return (
    <select className="rounded-md border px-3 py-2 text-sm" aria-label="Filter by status" value={props.value} onChange={(e) => props.onChange(e.target.value)}>
      <option value="ALL">All statuses</option>
      <option value="ACTIVE">Active</option>
      <option value="BANNED">Banned</option>
    </select>
  );
}

export function AdminUserTable(props: { users: any[]; isLoading: boolean }) {
  const { users, isLoading } = props;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b text-muted-foreground">
            <th className="p-3">Name</th>
            <th className="p-3">Email</th>
            <th className="p-3">Role</th>
            <th className="p-3">Status</th>
            <th className="p-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {isLoading ? (
            <tr><td colSpan={5} className="p-4 text-muted-foreground">Loading users...</td></tr>
          ) : users.length === 0 ? (
            <tr><td colSpan={5} className="p-4 text-muted-foreground">No users found.</td></tr>
          ) : users.map((user: any) => (
            <AdminUserRow key={user.id} user={user} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AdminUserRow(props: { user: any }) {
  const { user } = props;
  const banUser = useBanUser();
  const resetPassword = useResetPassword();
  const deleteUser = useDeleteUser();

  const onBan = async () => {
    const banned = user.status === 'BANNED';
    const reason = banned ? undefined : prompt('Reason for suspending this user (required):');
    if (!banned && !reason?.trim()) return;
    try {
      await banUser.mutateAsync({ id: user.id, status: banned ? 'ACTIVE' : 'BANNED', reason: reason ?? undefined });
      toast.success(banned ? 'User reactivated' : 'User suspended');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to update user'));
    }
  };

  const onReset = async () => {
    try {
      const res: any = await resetPassword.mutateAsync(user.id);
      toast.success(`Temp password: ${res?.tempPassword ?? 'emailed'}`);
    } catch (e) {
      toast.error(getErrorMessage(e, 'Reset failed'));
    }
  };

  const onDelete = async () => {
    if (!confirm(`Delete ${user.email}? This cannot be undone.`)) return;
    try {
      await deleteUser.mutateAsync(user.id);
      toast.success('User deleted');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Delete failed'));
    }
  };

  return (
    <tr className="border-b align-top">
      <td className="p-3 font-medium"><Link className="hover:underline" href={`/admin/users/${user.id}`}>{user.name}</Link></td>
      <td className="p-3">{user.email}</td>
      <td className="p-3"><Badge variant="secondary">{user.role}</Badge></td>
      <td className="p-3"><Badge variant={user.status === 'BANNED' ? 'destructive' : 'outline'}>{user.status}</Badge></td>
      <td className="p-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" asChild><Link href={`/admin/users/${user.id}`}>View</Link></Button>
          <Button variant={user.status === 'BANNED' ? 'default' : 'secondary'} size="sm" onClick={onBan}>
            {user.status === 'BANNED' ? 'Unban' : 'Ban'}
          </Button>
          <Button variant="ghost" size="sm" onClick={onReset}>Reset PW</Button>
          <Button variant="destructive" size="sm" onClick={onDelete}>Delete</Button>
        </div>
      </td>
    </tr>
  );
}
