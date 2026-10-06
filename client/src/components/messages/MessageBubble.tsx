'use client';

import { FC } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Trash2Icon } from 'lucide-react';
import type { DirectMessage } from '@/hooks/useMessages';

const formatTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
};

/**
 * One chat bubble (spec §4 MessageBubble).
 * Own → right/blue with ✓ sent / ✓✓ read; other → left/gray.
 * Timestamp shows on hover; delete button appears on hover for own messages.
 */
export const MessageBubble: FC<{
  message: DirectMessage;
  isOwn: boolean;
  onDelete?: (messageId: string) => void;
  canDelete?: boolean;
}> = ({ message, isOwn, onDelete, canDelete = true }) => {
  if (message.isDeleted) {
    return (
      <div className={cn('flex', isOwn ? 'justify-end' : 'justify-start')}>
        <p className="text-xs italic text-muted-foreground">This message was deleted</p>
      </div>
    );
  }

  return (
    <div className={cn('group relative flex', isOwn ? 'justify-end' : 'justify-start')}>
      {!isOwn && (
        <Avatar className="mr-2 mt-1 size-7 self-end">
          {message.senderPhoto && <AvatarImage src={message.senderPhoto} alt={message.senderName ?? ''} />}
          <AvatarFallback>{(message.senderName ?? '?').charAt(0).toUpperCase()}</AvatarFallback>
        </Avatar>
      )}

      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-3.5 py-2 text-sm',
          isOwn
            ? 'rounded-br-sm bg-blue-600 text-white'
            : 'rounded-bl-sm bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-gray-100'
        )}
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <div
          className={cn(
            'mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70',
            isOwn ? 'text-blue-100' : 'text-muted-foreground'
          )}
        >
          <span className="group-hover:opacity-100">{formatTime(message.timestamp)}</span>
          {isOwn && <span aria-label={message.isRead ? 'Read' : 'Sent'}>{message.isRead ? '✓✓' : '✓'}</span>}
        </div>
      </div>

      {isOwn && canDelete && onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="ml-1 size-7 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onDelete(message.id)}
          aria-label="Delete message"
        >
          <Trash2Icon className="size-3.5 text-muted-foreground" />
        </Button>
      )}
    </div>
  );
};
