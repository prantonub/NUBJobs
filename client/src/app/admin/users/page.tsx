"use client";

import { useState } from 'react';
import { AdminUserFilters, AdminUserTable } from '@/components/admin/AdminUsersWidgets';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAdminUsers } from '@/hooks/useAdmin';

export default function AdminUsersPage() {
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminUsers({
    search: search || undefined,
    role: role === 'ALL' ? undefined : role,
    status: status === 'ALL' ? undefined : status,
    page,
    limit: 20,
  });
  const users = data?.users ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <Card className="p-4">
      <AdminUserFilters
        search={search} setSearch={(v) => { setSearch(v); setPage(1); }}
        role={role} setRole={(v) => { setRole(v); setPage(1); }}
        status={status} setStatus={(v) => { setStatus(v); setPage(1); }}
      />
      <AdminUserTable users={users} isLoading={isLoading} />
      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
        <span>Total: {data?.total ?? users.length}</span>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
          <span className="px-2 py-1">Page {page} / {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      </div>
    </Card>
  );
}



