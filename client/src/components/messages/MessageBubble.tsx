'use client';

import { FC } from 'react';
import { CheckIcon, CheckCheckIcon } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
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
 * Timestamp shows on hover.
 */
export const MessageBubble: FC<{
  message: DirectMessage;
  isOwn: boolean;
}> = ({ message, isOwn }) => {
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
        <Avatar className="mr-2 mt-1 size-7 shrink-0 self-end">
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
          {isOwn && (
            <span aria-label={message.isRead ? 'Read' : 'Sent'}>
              {message.isRead ? <CheckCheckIcon className="inline size-3.5" /> : <CheckIcon className="inline size-3.5" />}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
