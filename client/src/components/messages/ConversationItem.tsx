'use client';

import { FC } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArchiveIcon, PinIcon, Trash2Icon } from 'lucide-react';
import type { ConversationSummary } from '@/hooks/useMessages';
import { NotificationBadge } from './NotificationBadge';
import { OnlineStatus } from './OnlineStatus';

const formatRelative = (iso: string | null) => {
  if (!iso) return '';
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'now';
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Date(iso).toLocaleDateString();
};

/**
 * One row in the conversation sidebar (spec §2 ConversationItem):
 * avatar + name + preview + time + unread badge + online dot.
 * Pin/archive/delete buttons appear on hover.
 */
export const ConversationItem: FC<{
  conversation: ConversationSummary;
  selected: boolean;
  online?: boolean;
  onSelect: (conversation: ConversationSummary) => void;
  onPin?: (conversation: ConversationSummary) => void;
  onArchive?: (conversation: ConversationSummary) => void;
  onDelete?: (conversation: ConversationSummary) => void;
}> = ({ conversation, selected, online, onSelect, onPin, onArchive, onDelete }) => {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conversation)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect(conversation);
        }
      }}
      className={cn(
        'group relative flex cursor-pointer items-start gap-3 border-b px-4 py-3 transition-colors',
        selected ? 'bg-blue-50 dark:bg-blue-950/30' : 'hover:bg-muted/50'
      )}
      aria-current={selected}
    >
      <div className="relative">
        <Avatar className="size-10">
          {conversation.otherUserPhoto && (
            <AvatarImage src={conversation.otherUserPhoto} alt={conversation.otherUserName} />
          )}
          <AvatarFallback>{conversation.otherUserName.charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
        {online && (
          <span className="absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-background bg-green-500" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className={cn('truncate text-sm', conversation.unreadCount > 0 ? 'font-semibold' : 'font-medium')}>
            {conversation.otherUserName}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {formatRelative(conversation.lastMessageTime)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className={cn('truncate text-xs', conversation.unreadCount > 0 ? 'text-foreground' : 'text-muted-foreground')}>
            {conversation.lastMessage ?? 'No messages yet'}
          </p>
          <NotificationBadge count={conversation.unreadCount} />
        </div>
        {conversation.jobTitle && (
          <p className="mt-0.5 truncate text-[10px] text-blue-600">Re: {conversation.jobTitle}</p>
        )}
        {conversation.isPinned && (
          <span className="mt-0.5 inline-flex items-center gap-1 text-[10px] text-muted-foreground">
            <PinIcon className="size-2.5" /> Pinned
          </span>
        )}
        {conversation.kind === 'application' && (
          <span className="mt-0.5 inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
            Job application
          </span>
        )}
      </div>

      {/* Hover actions — direct threads only; stop propagation so they don't open the thread. */}
      {conversation.kind === 'direct' && (
      <div className="absolute right-2 top-2 hidden gap-0.5 rounded-md border bg-background p-0.5 shadow-sm group-hover:flex">
        {onPin && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label={conversation.isPinned ? 'Unpin' : 'Pin'}
            onClick={(e) => {
              e.stopPropagation();
              onPin(conversation);
            }}
          >
            <PinIcon className="size-3" />
          </Button>
        )}
        {onArchive && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6"
            aria-label="Archive"
            onClick={(e) => {
              e.stopPropagation();
              onArchive(conversation);
            }}
          >
            <ArchiveIcon className="size-3" />
          </Button>
        )}
        {onDelete && (
          <Button
            variant="ghost"
            size="icon"
            className="size-6 text-red-500 hover:text-red-600"
            aria-label="Delete"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(conversation);
            }}
          >
            <Trash2Icon className="size-3" />
          </Button>
        )}
      </div>
      )}
    </div>
  );
};
