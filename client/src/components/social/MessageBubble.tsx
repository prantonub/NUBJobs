'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  MoreHorizontalIcon,
  PinIcon,
  ReplyIcon,
  Trash2Icon,
  FlagIcon,
  CheckIcon,
  SmilePlusIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/social/SocialUsers';
import { cn } from '@/lib/utils';
import { formatMessageTime, parseContent } from '@/lib/messageService';

export const QUICK_REACTIONS = ['👍', '❤️', '😂', '🎉', '😮', '😢'];

interface MessageBubbleProps {
  message: any;
  isMine: boolean;
  /** Sender profile shown next to incoming bubbles (spec: avatar + name). */
  avatar?: { name: string; photo: string | null } | null;
  /** Hide the avatar for consecutive messages from the same sender. */
  showAvatar?: boolean;
  onReply?: (message: any) => void;
  onDelete?: (messageId: string) => void;
  onPin?: (messageId: string) => void;
  onReact?: (messageId: string, emoji: string) => void;
  onReport?: (messageId: string) => void;
}

/** Rendered content: text + interactive links (never <a> inside <a>). */
function Content({ content }: { content: string }) {
  const router = useRouter();
  return (
    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
      {parseContent(content).map((seg, i) => {
        if (seg.type === 'url') {
          return (
            <a
              key={i}
              href={seg.value}
              target="_blank"
              rel="noreferrer"
              className="underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {seg.value}
            </a>
          );
        }
        if (seg.type === 'mention') {
          return (
            <button
              key={i}
              type="button"
              className="font-medium text-primary hover:underline"
              onClick={(e) => {
                e.stopPropagation();
                router.push(`/social/profile/${seg.value.slice(1)}`);
              }}
            >
              {seg.value}
            </button>
          );
        }
        if (seg.type === 'hashtag') {
          return (
            <Link
              key={i}
              href={`/social/search?q=${encodeURIComponent(seg.value)}`}
              className="font-medium text-primary hover:underline"
              onClick={(e) => e.stopPropagation()}
            >
              {seg.value}
            </Link>
          );
        }
        return <span key={i}>{seg.value}</span>;
      })}
    </p>
  );
}

/**
 * One message bubble (spec §MessageBubble): yours (right/primary) vs theirs
 * (left/muted), timestamp, ✓/✓✓ receipt, reactions, hover actions.
 */
export function MessageBubble({
  message,
  isMine,
  avatar,
  showAvatar = true,
  onReply,
  onDelete,
  onPin,
  onReact,
  onReport,
}: MessageBubbleProps) {
  const [reactOpen, setReactOpen] = useState(false);
  const reactions = (message.reactions ?? {}) as Record<string, string[]>;
  const myReactions = (message.myReactions ?? []) as string[];
  const photoUrl = message.photoUrl;
  const pending = message.pending === true;

  const react = (emoji: string) => {
    setReactOpen(false);
    onReact?.(message.id, emoji);
  };

  return (
    <div className={cn('group flex w-full items-end gap-1.5', isMine ? 'justify-end' : 'justify-start')}>
      <Popover open={reactOpen} onOpenChange={setReactOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 shrink-0 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100"
            aria-label="Add reaction"
          >
            <SmilePlusIcon className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align={isMine ? 'start' : 'end'} className="w-auto p-1.5">
          <div className="flex gap-1">
            {QUICK_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                type="button"
                className="rounded p-1.5 text-lg transition-colors hover:bg-muted"
                onClick={() => react(emoji)}
              >
                {emoji}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      {/* Sender profile photo - shown on incoming bubbles (spec §ChatWindow avatar) */}
      {!isMine && (
        <span className="w-7 shrink-0 self-end pb-0.5" aria-hidden={!showAvatar}>
          {showAvatar && avatar ? <UserAvatar user={avatar} size="sm" /> : null}
        </span>
      )}

      <div className={cn('relative max-w-[78%] space-y-0.5', isMine && 'items-end')}>
        {message.isPin && (
          <span className={cn('flex items-center gap-1 text-[10px] text-primary', isMine && 'justify-end')}>
            <PinIcon className="size-3" /> Pinned
          </span>
        )}

        <div
          className={cn(
            'rounded-2xl px-3.5 py-2 shadow-sm',
            isMine ? 'rounded-br-sm bg-primary text-primary-foreground' : 'rounded-bl-sm bg-muted text-foreground',
            pending && 'opacity-60'
          )}
        >
          {photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={photoUrl} alt="attachment" className="mb-1 max-h-64 w-full rounded-lg object-cover" loading="lazy" />
          )}
          {message.content ? <Content content={message.content} /> : null}
          {!message.content && !photoUrl && <p className="italic opacity-70">Message unavailable</p>}

          {Object.keys(reactions).length > 0 && (
            <div className={cn('mt-1.5 flex flex-wrap gap-1', isMine && 'justify-end')}>
              {Object.entries(reactions).map(([emoji, users]) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => react(emoji)}
                  aria-label={`${users.length} reaction ${emoji}`}
                  className={cn(
                    'flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-xs transition-colors',
                    myReactions.includes(emoji) ? 'border-primary/50 bg-primary/15' : 'border-border bg-background hover:bg-muted'
                  )}
                >
                  <span>{emoji}</span>
                  <span className="text-muted-foreground">{users.length}</span>
                </button>
              ))}
            </div>
          )}

          <div className={cn('mt-1 flex items-center justify-end gap-1 text-[10px] opacity-70')}>
            <span>{formatMessageTime(message.createdAt)}</span>
            {isMine &&
              (message.isRead ? (
                <span title="Read" className="flex items-center">
                  <CheckIcon className="size-3" />
                  <CheckIcon className="-ml-1.5 size-3" />
                </span>
              ) : (
                <span title="Sent">
                  <CheckIcon className="size-3" />
                </span>
              ))}
          </div>
        </div>

        <div className={cn('flex gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100', isMine ? 'justify-end' : 'justify-start')}>
          <Button variant="ghost" size="icon" className="size-6" aria-label="Reply" onClick={() => onReply?.(message)}>
            <ReplyIcon className="size-3.5" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="size-6" aria-label="Message actions">
                <MoreHorizontalIcon className="size-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align={isMine ? 'end' : 'start'}>
              <DropdownMenuItem onClick={() => onPin?.(message.id)}>
                <PinIcon className="size-4" />
                {message.isPin ? 'Unpin' : 'Pin message'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onReport?.(message.id)}>
                <FlagIcon className="size-4" />
                Report
              </DropdownMenuItem>
              {isMine && (
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete?.(message.id)}
                >
                  <Trash2Icon className="size-4" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

