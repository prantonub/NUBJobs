'use client';

import { useEffect, useRef, useState } from 'react';
import { useConversation, useSendMessage } from '@/hooks/useNotificationsAndMessages';
import { ensureMessagingSocket } from '@/hooks/useMessages';
import { useAuth } from '@/hooks/useAuth';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Loader2, Send } from 'lucide-react';

interface ChatMessage {
  id: string;
  content: string;
  createdAt: string;
  isRead?: boolean;
  senderId?: string;
  sender?: { id: string; name?: string; email?: string };
}

/**
 * Real-time message thread for one application (conversation).
 * REST (`useConversation`) loads history, the Socket.io `new_message` event
 * pushes live updates into the same React Query cache.
 */
export function ApplicationChat({ applicationId }: { applicationId: string }) {
  const [draft, setDraft] = useState('');
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { data, isLoading } = useConversation(applicationId, { limit: 100 });
  const sendMutation = useSendMessage(applicationId);
  const bottomRef = useRef<HTMLDivElement>(null);

  const messages: ChatMessage[] = Array.isArray(data?.data) ? data.data : Array.isArray(data) ? data : [];

  useEffect(() => {
    // After a hard refresh no socket exists yet (AuthContext only dials one on
    // login) — dial it here or this handler would silently never register.
    const socket = ensureMessagingSocket();
    if (!socket) return;
    const handler = (payload: any) => {
      if (payload?.applicationId === applicationId) {
        queryClient.invalidateQueries({ queryKey: ['conversation', applicationId] });
      }
    };
    socket.on('new_message', handler);
    return () => {
      socket.off('new_message', handler);
    };
  }, [applicationId, queryClient]);

  // The legacy GET marks the whole thread read server-side the moment it loads
  // (and on every refetch triggered by a live `new_message`) — mirror that into
  // the badge queries so the "(1)" disappears immediately, not on refresh.
  useEffect(() => {
    if (!data) return;
    queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [data, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  const handleSend = async () => {
    const content = draft.trim();
    if (!content) return;
    setDraft('');
    await sendMutation.mutateAsync(content).catch(() => setDraft(content));
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading messages…</p>
        ) : messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No messages yet. Start the conversation below.
          </p>
        ) : (
          messages.map((message) => {
            const mine = Boolean(
              user?.id && (message.senderId === user.id || message.sender?.id === user.id)
            );
            return (
              <div key={message.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[85%] rounded-2xl px-3 py-2 text-sm',
                    mine ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  )}
                >
                  {!mine && message.sender?.name ? (
                    <p className="mb-0.5 text-xs font-medium opacity-80">{message.sender.name}</p>
                  ) : null}
                  <p className="whitespace-pre-wrap">{message.content}</p>
                  <p className={cn('mt-1 text-[10px]', mine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                    {new Date(message.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      <div className="mt-3 space-y-2">
        <Textarea
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Write a message…"
          rows={2}
          className="resize-none"
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
        />
        <Button
          type="button"
          onClick={() => void handleSend()}
          disabled={!draft.trim() || sendMutation.isPending}
          className="w-full"
        >
          {sendMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          Send Message
        </Button>
      </div>
    </div>
  );
}

export default ApplicationChat;
