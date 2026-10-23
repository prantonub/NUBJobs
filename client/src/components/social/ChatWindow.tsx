'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, BanIcon, MoreVerticalIcon, FlagIcon, UserIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { UserAvatar } from '@/components/social/SocialUsers';
import { OnlineStatus } from '@/components/social/OnlineStatus';
import { TypingIndicator } from '@/components/social/TypingIndicator';
import { MessageBubble } from '@/components/social/MessageBubble';
import { MessageInput } from '@/components/social/MessageInput';
import api from '@/lib/axios';
import { groupByDate } from '@/lib/messageService';
import {
  flattenHistory,
  useDeleteMessage,
  useHistoryMeta,
  useMessages,
  useOnlineStatus,
  usePinMessage,
  useReadMessage,
  useSendMessage,
  useToggleReaction,
  useTypingIndicator,
} from '@/hooks/useSocialMessages';

interface ChatWindowProps {
  userId: string;
  sourceId?: string | null;
}

/**
 * Full chat window (spec §ChatWindow): peer header with online status, date-grouped
 * history with "Load more", typing indicator, read receipts, and MessageInput.
 */
export function ChatWindow({ userId, sourceId }: ChatWindowProps) {
  const router = useRouter();
  const {
    data,
    isLoading,
    isError,
    refetch,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useMessages(userId);
  const { otherUser, presence, conversation } = useHistoryMeta(data);
  const messages = useMemo(() => flattenHistory(data), [data]);

  const readMessage = useReadMessage();
  const deleteMutation = useDeleteMessage();
  const pinMutation = usePinMessage();
  const reactMutation = useToggleReaction();
  const sendMutation = useSendMessage(userId);
  const markedRef = useRef<Set<string>>(new Set());

  const presenceSeed = presence ?? (otherUser as any)?.presence ?? null;
  const { isOnline, lastSeenAt } = useOnlineStatus(userId, presenceSeed);
  const { typingName, start, stop } = useTypingIndicator(userId);
  const [replyTo, setReplyTo] = useState<any | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const nearBottomRef = useRef(true);

  // Auto-scroll on new messages - but never yank the reader away.
  useEffect(() => {
    const el = scrollRef.current;
    if (el && nearBottomRef.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  // Mark incoming unread messages read once visible (badge clears instantly).
  useEffect(() => {
    for (const m of messages) {
      if (!m.isMine && !m.isRead && m.id && !markedRef.current.has(m.id)) {
        markedRef.current.add(m.id);
        readMessage.mutate(m.id, { onError: () => markedRef.current.delete(m.id) });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length]);

  const onScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    nearBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    if (el.scrollTop <= 24 && hasNextPage && !isFetchingNextPage) {
      const prev = el.scrollHeight;
      void fetchNextPage().then(() => {
        if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight - prev;
      });
    }
  };

  const handleSend = async (payload: { content: string; photoUrl?: string | null }) => {
    const quote = replyTo?.content ? `> ${String(replyTo.content).slice(0, 120)}\n` : '';
    await sendMutation.mutateAsync({ ...payload, content: `${quote}${payload.content}`, sourceId: sourceId ?? undefined });
    setReplyTo(null);
  };

  const handleReport = async (messageId: string) => {
    try {
      await api.post('/social/report', {
        contentType: 'user',
        contentId: userId,
        reason: 'Inappropriate message',
        description: `Reported from chat (message ${messageId})`,
      });
      toast.success('Reported a moderator will review this conversation');
    } catch {
      toast.error('Could not submit the report');
    }
  };

  const handleBlock = async () => {
    try {
      // Reuse the unified block endpoint so one block covers every inbox.
      await api.post(`/messages/block/${userId}`);
      toast.success('User blocked');
      refetch();
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Could not block this user');
    }
  };

  const groups = useMemo(() => groupByDate(messages.filter(Boolean)), [messages]);

  const handleDelete = (messageId: string) => {
    deleteMutation.mutate(messageId, {
      onSuccess: () => toast.success('Message deleted'),
      onError: () => toast.error('Could not delete message'),
    });
  };

  const peerAvatar = otherUser
    ? { name: String(otherUser.name ?? ''), photo: otherUser.photo ?? null }
    : null;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center gap-2 border-b border-border px-3 py-2.5 sm:px-4">
        <Button variant="ghost" size="icon" className="shrink-0 lg:hidden" onClick={() => router.push('/social/messages')} aria-label="Back to list">
          <ArrowLeftIcon className="size-4" />
        </Button>
        <UserAvatar user={{ name: otherUser?.name ?? '…', photo: otherUser?.photo ?? null }} />
        <div className="min-w-0 flex-1">
          <Link href={otherUser?.username ? `/social/profile/${otherUser.username}` : '#'} className="block truncate text-sm font-semibold hover:underline">
            {otherUser?.name ?? 'Loading…'}
          </Link>
          <OnlineStatus isOnline={isOnline} lastSeenAt={lastSeenAt} withLabel />
        </div>
        {conversation?.isMuted && (
          <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Muted</span>
        )}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Conversation actions">
              <MoreVerticalIcon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link href={otherUser?.username ? `/social/profile/${otherUser.username}` : `/social/messages?user=${userId}`}>
                <UserIcon className="size-4" /> View profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => void handleReport('thread')}>
              <FlagIcon className="size-4" /> Report user
            </DropdownMenuItem>
            <DropdownMenuItem variant="destructive" onClick={() => void handleBlock()}>
              <BanIcon className="size-4" /> Block user
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div ref={scrollRef} onScroll={onScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-3 py-3 sm:px-4">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className={`h-12 ${i % 2 ? 'ml-auto w-2/3' : 'w-1/2'}`} />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-6 text-center">
            <p className="text-sm font-medium">No messages yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Say hello to {otherUser?.name ?? 'them'}! 👋</p>
          </div>
        ) : (
          <>
            {hasNextPage && (
              <div className="text-center">
                <Button variant="outline" size="sm" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
                  {isFetchingNextPage ? 'Loading…' : 'Load older messages'}
                </Button>
              </div>
            )}
            {groups.map((group) => (
              <div key={group.label} className="space-y-2.5">
                <div className="sticky top-0 z-10 flex justify-center py-1">
                  <span className="rounded-full bg-muted px-3 py-0.5 text-[11px] text-muted-foreground shadow-sm">
                    {group.label}
                  </span>
                </div>
                {group.messages.map((m: any, idx: number) => {
                  const prev = group.messages[idx - 1];
                  return (
                    <MessageBubble
                      key={m.id}
                      message={m}
                      isMine={Boolean(m.isMine)}
                      avatar={peerAvatar}
                      showAvatar={!prev || prev.senderId !== m.senderId}
                      onReply={setReplyTo}
                      onDelete={handleDelete}
                      onPin={(id) => pinMutation.mutate(id)}
                      onReact={(id, emoji) => reactMutation.mutate({ messageId: id, emoji })}
                      onReport={handleReport}
                    />
                  );
                })}
              </div>
            ))}
            <TypingIndicator name={typingName} />
          </>
        )}
      </div>

      <div className="shrink-0 border-t border-border px-3 py-2.5 sm:px-4">
        <MessageInput
          userId={userId}
          onSend={handleSend}
          sending={sendMutation.isPending}
          onTyping={start}
          onStopTyping={stop}
          replyTo={replyTo}
          onClearReply={() => setReplyTo(null)}
        />
      </div>
    </div>
  );
}
