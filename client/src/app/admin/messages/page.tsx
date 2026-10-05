"use client";

import { useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useAdminMessagesOverview, useAdminUsers, useSendAdminMessage } from '@/hooks/useAdmin';
import { getErrorMessage } from '@/lib/utils';

const fmt = (v?: string | null) => (v ? new Date(v).toLocaleString() : '—');

export default function AdminMessagesPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isLoading } = useAdminMessagesOverview({ page, limit: 20 });

  const [userQuery, setUserQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [message, setMessage] = useState('');
  const [reason, setReason] = useState('');
  const { data: userData } = useAdminUsers({ search: userQuery || undefined, limit: 5 });
  const sendMessage = useSendAdminMessage();

  const messages = (data?.messages ?? []).filter(
    (m: any) =>
      !search ||
      m.sender?.name?.toLowerCase().includes(search.toLowerCase()) ||
      m.content?.toLowerCase().includes(search.toLowerCase())
  );
  const totalPages = data?.totalPages ?? 1;

  const onSend = async () => {
    if (!selectedUser || !message.trim()) return;
    try {
      await sendMessage.mutateAsync({ userId: selectedUser.id, message: message.trim(), reason: reason || undefined });
      toast.success(`Message sent to ${selectedUser.name}`);
      setMessage('');
      setReason('');
      setSelectedUser(null);
      setUserQuery('');
    } catch (e) {
      toast.error(getErrorMessage(e, 'Failed to send message'));
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-3">
      {/* Left — recent platform messages (monitoring) */}
      <Card className="xl:col-span-2">
        <CardHeader>
          <CardTitle>Messages &amp; Communications</CardTitle>
          <Input
            placeholder="Search conversations..."
            className="mt-2 max-w-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </CardHeader>
        <CardContent className="space-y-3">
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading messages...</p>
          ) : messages.length === 0 ? (
            <p className="text-sm text-muted-foreground">No messages yet.</p>
          ) : (
            messages.map((m: any) => (
              <div key={m.id} className="rounded-lg border border-border p-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-medium">
                    {m.sender?.name} <Badge variant="secondary" className="ml-1">{m.sender?.role}</Badge>
                  </p>
                  <span className="text-xs text-muted-foreground">{fmt(m.createdAt)}</span>
                </div>
                <p className="mt-1 text-muted-foreground">{m.content}</p>
                {m.application?.job?.title && (
                  <p className="mt-1 text-xs text-muted-foreground">on &ldquo;{m.application.job.title}&rdquo;</p>
                )}
              </div>
            ))
          )}

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>Total: {data?.total ?? messages.length}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
              <span className="px-2 py-1">Page {page} / {totalPages}</span>
              <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Right — compose to a user */}
      <Card className="xl:sticky xl:top-4 xl:self-start">
        <CardHeader><CardTitle>Send a message</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div>
            <Input
              placeholder="Search user by name/email..."
              value={userQuery}
              onChange={(e) => { setUserQuery(e.target.value); setSelectedUser(null); }}
            />
            {userQuery && !selectedUser && (
              <div className="mt-1 max-h-40 overflow-y-auto rounded-md border border-border">
                {(userData?.users ?? []).map((u: any) => (
                  <button
                    key={u.id}
                    type="button"
                    className="block w-full px-3 py-2 text-left text-sm hover:bg-muted"
                    onClick={() => { setSelectedUser(u); setUserQuery(u.name); }}
                  >
                    {u.name} <span className="text-muted-foreground">· {u.email} · {u.role}</span>
                  </button>
                ))}
                {(userData?.users ?? []).length === 0 && (
                  <p className="px-3 py-2 text-muted-foreground">No users found.</p>
                )}
              </div>
            )}
          </div>
          <Textarea
            placeholder="Type message..."
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <Input
            placeholder="Reason (optional, for audit)"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
          <Button className="w-full" disabled={!selectedUser || !message.trim()} onClick={onSend}>
            Send
          </Button>
          <p className="text-xs text-muted-foreground">
            Delivered as a notification + real-time socket event. The user reads it in their{' '}
            <Link className="underline" href="/messages">messages</Link> area.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

