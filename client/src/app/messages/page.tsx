'use client';

import { FC, Suspense, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeftIcon, MessageSquarePlusIcon, SettingsIcon, ShieldOffIcon, ArchiveIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import {
  useMessages,
  useConversation,
  useSendMessage,
  useMarkAllAsRead,
  useDeleteMessage,
  useArchiveConversation,
  usePinConversation,
  useBlockUser,
  useUnblockUser,
  useTypingIndicator,
  useSocket,
  type ConversationSummary,
} from '@/hooks/useMessages';
import { ApplicationChat } from '@/components/applications/ApplicationChat';
import { ConversationList, ConversationTabs } from '@/components/messages/ConversationList';
import { ChatWindow } from '@/components/messages/ChatWindow';
import { SearchBar } from '@/components/messages/SearchBar';

type Tab = 'all' | 'unread' | 'archived' | 'pinned';

/**
 * /messages — left sidebar (list) + right chat pane.
 * Deep-linkable via ?user=<userId>; on mobile the two panes swap
 * (hamburger/back) instead of sitting side by side.
 */
const MessagesPage: FC = () => {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  // Selection: direct threads use ?user=<userId>, legacy application
  // threads use ?app=<applicationId> — a pair can have BOTH, so one key
  // cannot address them (`app:` rows have separate row ids too).
  const selectedUserId = searchParams.get('user');
  const selectedAppId = searchParams.get('app');

  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  const { data: listData, isLoading: listLoading } = useMessages({
    limit: 50,
    filter: tab,
    search: search || undefined,
  });
  const { data: thread, isLoading: threadLoading, isError: threadFailed, error: threadError } =
    useConversation(selectedUserId, { limit: 50 });

  const sendMutation = useSendMessage(selectedUserId, thread?.job?.id ?? undefined);
  const markAllMutation = useMarkAllAsRead(selectedUserId);
  const deleteMutation = useDeleteMessage(selectedUserId);
  const archiveMutation = useArchiveConversation();
  const pinMutation = usePinConversation();
  const blockMutation = useBlockUser();
  const unblockMutation = useUnblockUser();
  const typing = useTypingIndicator(selectedUserId);

  // Live events for the currently open thread (and the list/badge overall).
  const { typing: remoteTyping, onlineUsers, isConnected } = useSocket(selectedUserId);

  const conversations = useMemo(() => listData?.conversations ?? [], [listData]);

  const selectedConversation: ConversationSummary | null = useMemo(() => {
    if (selectedAppId) {
      // Legacy application thread — find the row, or synthesize for a deep link.
      return (
        conversations.find((c) => c.applicationId === selectedAppId) ??
        ({
          id: `app:${selectedAppId}`,
          kind: 'application' as const,
          applicationId: selectedAppId,
          otherUserId: '',
          otherUserName: '…',
          otherUserPhoto: null,
          otherUserRole: 'STUDENT',
          lastMessage: null,
          lastMessageTime: new Date().toISOString(),
          unreadCount: 0,
          jobId: null,
          jobTitle: null,
          isArchived: false,
          isPinned: false,
        } as ConversationSummary)
      );
    }
    if (!selectedUserId) return null;
    return (
      conversations.find((c) => c.kind === 'direct' && c.otherUserId === selectedUserId) ??
      // Deep link to someone we haven't listed yet — synthesize a minimal row.
      ({
        id: selectedUserId,
        kind: 'direct' as const,
        applicationId: null,
        otherUserId: selectedUserId,
        otherUserName: thread?.otherUser.name ?? '…',
        otherUserPhoto: thread?.otherUser.photo ?? null,
        otherUserRole: thread?.otherUser.role ?? 'STUDENT',
        lastMessage: null,
        lastMessageTime: new Date().toISOString(),
        unreadCount: 0,
        jobId: null,
        jobTitle: null,
        isArchived: false,
        isPinned: false,
      } as ConversationSummary)
    );
  }, [selectedAppId, selectedUserId, conversations, thread]);

  // Block state for the open chat: 'me' (thread/list says so),
  // 'them' (thread fetch 403 = they blocked me). Either locks the composer.
  const blockedByThem = threadFailed && (threadError as any)?.response?.status === 403;
  const blockedByMe = Boolean(thread?.blockedByMe ?? selectedConversation?.blocked);
  const chatBlocked: 'me' | 'them' | null = blockedByMe ? 'me' : blockedByThem ? 'them' : null;

  // Selecting a conversation marks it read and shows it on mobile.
  useEffect(() => {
    if (selectedUserId || selectedAppId) {
      setMobileChatOpen(true);
      if (selectedUserId) markAllMutation.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUserId, selectedAppId]);

  // A message that arrives while this thread is already open is being read
  // right now — mark it read so the "(1)" pill clears without a refresh. The
  // `hasIncomingUnread` guard stops the invalidate → refetch → effect loop:
  // once read-all lands, the refetched thread has no incoming unread left.
  useEffect(() => {
    if (!selectedUserId || !thread?.messages?.length) return;
    const hasIncomingUnread = thread.messages.some(
      (m) => m.senderId !== user?.id && !m.isRead
    );
    if (hasIncomingUnread) markAllMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [thread, selectedUserId, user?.id]);

  const selectConversation = (conv: ConversationSummary) => {
    const params = new URLSearchParams(searchParams.toString());
    if (conv.kind === 'application' && conv.applicationId) {
      // Legacy thread — keyed by application id.
      params.delete('user');
      params.set('app', conv.applicationId);
    } else {
      params.delete('app');
      params.set('user', conv.otherUserId);
    }
    router.replace(`/messages?${params.toString()}`);
  };

  const handleSend = async (content: string) => {
    try {
      await sendMutation.mutateAsync({ content });
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to send message');
      throw error;
    }
  };

  const handleArchive = (conv: ConversationSummary) => {
    archiveMutation.mutate(conv.otherUserId, {
      onSuccess: () => toast.success('Conversation archived'),
    });
  };

  const handlePin = (conv: ConversationSummary) => {
    pinMutation.mutate(
      { userId: conv.otherUserId, isPinned: !conv.isPinned },
      { onSuccess: () => toast.success(conv.isPinned ? 'Unpinned' : 'Pinned') }
    );
  };

  const handleBlock = () => {
    if (!selectedUserId) return;
    if (
      !confirm(
        'Block this user?\n\n· You won’t be able to message each other\n· Your chat history stays visible\n· You can unblock anytime from this chat menu'
      )
    ) {
      return;
    }
    blockMutation.mutate(selectedUserId, {
      onSuccess: () => toast.success('User blocked'),
      onError: () => toast.error('Failed to block user'),
    });
  };

  const handleUnblock = () => {
    if (!selectedUserId) return;
    unblockMutation.mutate(selectedUserId, {
      onSuccess: () => toast.success('User unblocked'),
      onError: () => toast.error('Failed to unblock user'),
    });
  };

  return (
    <div className="flex h-[calc(100vh-8rem)] min-h-[480px] overflow-hidden rounded-lg border bg-background shadow-sm">
      {/* ── Left sidebar ─────────────────────────────────────────── */}
      <aside
        className={`${mobileChatOpen ? 'hidden md:flex' : 'flex'} w-full shrink-0 flex-col border-r md:w-80 lg:w-96`}
        aria-label="Conversation list"
      >
        <div className="flex items-center justify-between gap-2 border-b px-4 py-3">
          <h1 className="text-lg font-semibold">Messages</h1>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" asChild aria-label="Blocked users">
              <Link href="/messages/blocked">
                <ShieldOffIcon className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild aria-label="Archived">
              <Link href="/messages/archived">
                <ArchiveIcon className="size-4" />
              </Link>
            </Button>
            <Button variant="ghost" size="icon" asChild aria-label="Message settings">
              <Link href="/settings">
                <SettingsIcon className="size-4" />
              </Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/messages/new">
                <MessageSquarePlusIcon className="mr-1 size-4" />
                New
              </Link>
            </Button>
          </div>
        </div>

        <div className="px-3 py-2">
          <SearchBar value={search} onChange={setSearch} placeholder="Search conversations..." />
        </div>

        <ConversationTabs active={tab} onChange={setTab} />

        <div className="min-h-0 flex-1 overflow-y-auto">
          <ConversationList
            conversations={conversations}
            selectedId={
              selectedAppId ? `app:${selectedAppId}` : selectedConversation ? selectedConversation.id : null
            }
            loading={listLoading}
            onlineUserIds={onlineUsers}
            onSelect={selectConversation}
            onPin={handlePin}
            onArchive={handleArchive}
            emptyMessage={
              tab === 'archived'
                ? 'No archived conversations'
                : search
                  ? 'No conversations match your search'
                  : 'No conversations yet — start a new message'
            }
          />
        </div>

        <div className="border-t px-4 py-2 text-[10px] text-muted-foreground">
          {isConnected ? '● Connected — messages arrive instantly' : '○ Reconnecting…'}
        </div>
      </aside>

      {/* ── Right chat pane ──────────────────────────────────────── */}
      <section className={`${mobileChatOpen ? 'flex' : 'hidden md:flex'} min-w-0 flex-1 flex-col`} aria-label="Chat">
        {selectedAppId || selectedConversation?.kind === 'application' ? (
          // Legacy application thread — the battle-tested ApplicationChat.
          <div className="flex h-full min-h-0 flex-col">
            <header className="flex items-center gap-2 border-b bg-background px-4 py-3">
              {selectedConversation && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">{selectedConversation.otherUserName}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {selectedConversation.jobTitle ? `Re: ${selectedConversation.jobTitle}` : 'Job application thread'}
                  </p>
                </div>
              )}
              <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileChatOpen(false)} aria-label="Back to list">
                <ArrowLeftIcon className="size-4" />
              </Button>
            </header>
            <div className="min-h-0 flex-1 px-4 py-3">
              <ApplicationChat applicationId={selectedAppId ?? selectedConversation?.applicationId ?? ''} />
            </div>
          </div>
        ) : (
          <ChatWindow
          conversation={selectedConversation}
          otherUser={thread?.otherUser ?? null}
          job={thread?.job ?? null}
          messages={thread?.messages ?? []}
          loading={threadLoading}
          typingName={remoteTyping ? remoteTyping.senderName ?? null : null}
          currentUserId={user?.id}
          sending={sendMutation.isPending}
          onSend={handleSend}
          onTyping={typing.start}
          onStopTyping={typing.stop}
          onDeleteMessage={(messageId) =>
            deleteMutation.mutate(messageId, { onSuccess: () => toast.success('Message deleted') })
          }
          onMarkAllRead={() => !markAllMutation.isPending && markAllMutation.mutate()}
          onArchive={() => selectedUserId && selectedConversation && handleArchive(selectedConversation)}
          onBlock={handleBlock}
          onUnblock={handleUnblock}
          blocked={chatBlocked}
          onBack={() => setMobileChatOpen(false)}
          />
        )}
        </section>
    </div>
  );
};

export default function MessagesPageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading messages…</div>}>
      <MessagesPage />
    </Suspense>
  );
}

