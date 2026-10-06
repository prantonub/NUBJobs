'use client';

import { FC, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { InfoIcon, MoreVerticalIcon, ArrowLeftIcon, ArchiveIcon, BanIcon, PhoneIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Skeleton } from '@/components/ui/skeleton';
import type { ConversationSummary, DirectMessage } from '@/hooks/useMessages';
import { MessageBubble } from './MessageBubble';
import { MessageInput } from './MessageInput';
import { TypingIndicator } from './TypingIndicator';
import { UserProfileCard } from './UserProfileCard';

/**
 * Right-hand chat pane (spec §3 ChatWindow): header with identity + actions,
 * scrollable history with auto-scroll, typing row, composer.
 * `onBack` enables the mobile slide-back (sidebar ↔ full-width chat).
 */
export const ChatWindow: FC<{
  conversation: ConversationSummary | null;
  otherUser?: { id: string; name: string; photo?: string | null; role: string; email?: string } | null;
  job?: { id: string; title: string; company: string } | null;
  messages: DirectMessage[];
  loading?: boolean;
  typingName?: string | null;
  currentUserId?: string;
  onSend: (content: string) => Promise<void> | void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  onDeleteMessage?: (messageId: string) => void;
  onMarkAllRead?: () => void;
  onArchive?: () => void;
  onBlock?: () => void;
  onBack?: () => void;
  sending?: boolean;
}> = ({
  conversation,
  otherUser,
  job,
  messages,
  loading,
  typingName,
  currentUserId,
  onSend,
  onTyping,
  onStopTyping,
  onDeleteMessage,
  onMarkAllRead,
  onArchive,
  onBlock,
  onBack,
  sending,
}) => {
  const bottomRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const router = useRouter();

  const identity = otherUser
    ? { id: otherUser.id, name: otherUser.name, photo: otherUser.photo, role: otherUser.role, email: otherUser.email }
    : conversation
      ? {
          id: conversation.otherUserId,
          name: conversation.otherUserName,
          photo: conversation.otherUserPhoto,
          role: conversation.otherUserRole,
        }
      : null;

  // Auto-scroll when new messages land (only if already near the bottom).
  useEffect(() => {
    if (!autoScroll) return;
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, autoScroll]);

  // Mark incoming messages read when the thread is open.
  useEffect(() => {
    if (conversation && messages.some((m) => !m.isRead && m.senderId !== currentUserId)) {
      onMarkAllRead?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages.length, conversation?.otherUserId]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 80;
    setAutoScroll(nearBottom);
  };

  if (!conversation || !identity) {
    return (
      <div className="flex h-full items-center justify-center bg-muted/20 p-6 text-center">
        <div>
          <p className="text-base font-medium text-muted-foreground">Select a conversation to start messaging</p>
          <p className="mt-1 text-sm text-muted-foreground/70">Pick someone from the list on the left.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header */}
      <header className="flex items-center gap-2 border-b bg-background px-4 py-3">
        {onBack && (
          <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack} aria-label="Back to list">
            <ArrowLeftIcon className="size-4" />
          </Button>
        )}
        <UserProfileCard user={identity} online={false} compact />
        {job && (
          <span className="hidden max-w-40 truncate rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-700 sm:inline">
            {job.title}
          </span>
        )}
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="icon" aria-label="Call" disabled>
            <PhoneIcon className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Profile info"
            onClick={() => router.push(`/profile/${identity.id}`)}
          >
            <InfoIcon className="size-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="More actions">
                <MoreVerticalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {onArchive && (
                <DropdownMenuItem onClick={onArchive}>
                  <ArchiveIcon className="mr-2 size-4" /> Archive
                </DropdownMenuItem>
              )}
              {onBlock && (
                <DropdownMenuItem className="text-red-500" onClick={onBlock}>
                  <BanIcon className="mr-2 size-4" /> Block user
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {/* History */}
      <div ref={scrollRef} onScroll={handleScroll} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {loading ? (
          <div className="space-y-3">
            {[40, 60, 50].map((w, i) => (
              <Skeleton
                key={i}
                className={`h-12 rounded-2xl ${i % 2 === 0 ? 'ml-auto' : ''}`}
                style={{ width: `${w}%` }}
              />
            ))}
          </div>
        ) : messages.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">No messages yet. Say hello 👋</p>
        ) : (
          messages.map((m) => (
            <MessageBubble
              key={m.id}
              message={m}
              isOwn={m.senderId === currentUserId}
              canDelete={m.senderId === currentUserId}
              onDelete={onDeleteMessage}
            />
          ))
        )}

        <TypingIndicator name={typingName ?? identity.name} visible={Boolean(typingName)} />

        {!autoScroll && (
          <div className="sticky bottom-2 flex justify-center">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full shadow"
              onClick={() => {
                setAutoScroll(true);
                bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              ↓ New messages
            </Button>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Composer */}
      <MessageInput
        onSend={onSend}
        onTyping={onTyping}
        onStopTyping={onStopTyping}
        draftKey={identity.id}
        sending={sending}
      />
    </div>
  );
};

