'use client';

import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { PostCard } from '@/components/social/PostCard';
import { UserCard } from '@/components/social/SocialUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useMessageHistory, useReadMessage, useSendMessage } from '@/hooks/useSocial';
import { use, useEffect, useState } from 'react';
import { toast } from 'sonner';

/** /social/messages/[userId] — DM history with one user. */
export default function MessageHistoryPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const [draft, setDraft] = useState('');
  const history = useMessageHistory(userId, 1);
  const send = useSendMessage(userId);
  const readMessage = useReadMessage();

  const messages: any[] = (history.data as any)?.messages ?? [];
  const otherUser = (history.data as any)?.otherUser ?? null;

  // Mark incoming unread messages read once the thread loads (badge clears).
  useEffect(() => {
    for (const m of messages) {
      if (!m.isMine && !m.isRead && m.id) {
        readMessage.mutate(m.id, {
          onError: () => {
            /* receipt is best-effort — the thread still renders */
          },
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history.dataUpdatedAt]);

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    try {
      await send.mutateAsync({ content: draft.trim() });
      setDraft('');
      toast.success('Message sent');
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Failed to send');
    }
  };

  return (
    <SocialShell>
      <SocialNav
        title={otherUser?.name ?? `@${userId}`}
        subtitle="Direct messages"
      />

      <div className="mb-4 flex gap-3">
        <UserCard user={otherUser ?? { name: 'Loading…', username: userId, photo: null }} compact />
        <form onSubmit={sendMessage} className="flex-1">
          <div className="flex gap-2">
            <Input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message…"
              aria-label="Message content"
            />
            <Button type="submit" disabled={!draft.trim() || send.isPending}>
              Send
            </Button>
          </div>
        </form>
      </div>

      {/* Message list — loading placeholder only while fetching */}
      {history.isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : messages.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
          No messages yet. Say hello!
        </p>
      ) : (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="space-y-3">
            {messages.map((m: any) => (
              <div key={m.id} className={`flex ${m.isMine ? 'justify-end' : 'justify-start'}`}>
                <div
                  className={`max-w-xs rounded-lg px-3 py-2 text-sm ${
                    m.isMine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  }`}
                >
                  {m.photoUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={m.photoUrl} alt="attachment" className="mb-1 max-w-full rounded" />
                  )}
                  {m.content ? (
                    <p>{m.content}</p>
                  ) : (
                    <p className="italic text-muted-foreground">📷 Photo</p>
                  )}
                  {m.createdAt && (
                    <p className="mt-1 text-right text-[11px] opacity-70">
                      {new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </SocialShell>
  );
}
