'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArchiveIcon,
  BellIcon,
  BellOffIcon,
  MessageSquarePlusIcon,
  PinIcon,
  PinOffIcon,
  SearchIcon,
  SettingsIcon,
  Volume2Icon,
  VolumeXIcon,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { UserAvatar } from '@/components/social/SocialUsers';
import { OnlineStatus } from '@/components/social/OnlineStatus';
import { cn } from '@/lib/utils';
import { timeAgo } from '@/lib/messageService';
import { useNotificationSettings, useUpdateNotificationSettings } from '@/hooks/useSocialMessages';

export type MessageFilter = 'all' | 'professional' | 'community' | 'unread' | 'pinned';

const TABS: Array<{ value: MessageFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'professional', label: 'Professional' },
  { value: 'community', label: 'Community' },
  { value: 'unread', label: 'Unread' },
  { value: 'pinned', label: 'Pinned' },
];

/** Notification preferences popover (spec §4 notification preferences page). */
function MessageSettingsPopover() {
  const settings = useNotificationSettings();
  const update = useUpdateNotificationSettings();
  const [sound, setSound] = useState<boolean>(
    () => typeof window === 'undefined' || localStorage.getItem('nub-msg-sound') !== '0'
  );
  const [desktop, setDesktop] = useState<boolean>(
    () => typeof window !== 'undefined' && localStorage.getItem('nub-msg-desktop') === '1'
  );
  const server = (settings.data as any)?.settings ?? {};

  const setServer = (key: 'enableMessages' | 'enableSound' | 'enableEmail', value: boolean) => {
    update.mutate({ [key]: value });
  };

  const enableDesktop = async () => {
    if (typeof Notification === 'undefined') return;
    const result = await Notification.requestPermission();
    if (result === 'granted') {
      localStorage.setItem('nub-msg-desktop', '1');
      setDesktop(true);
    }
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="shrink-0" aria-label="Message settings">
          <SettingsIcon className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 space-y-3 p-4">
        <p className="text-sm font-semibold">Notifications</p>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            <BellIcon className="size-4 text-muted-foreground" /> Message alerts
          </span>
          <Switch checked={server.enableMessages !== false} onCheckedChange={(v) => setServer('enableMessages', v)} />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            {sound ? <Volume2Icon className="size-4 text-muted-foreground" /> : <VolumeXIcon className="size-4 text-muted-foreground" />}
            Sound
          </span>
          <Switch
            checked={sound}
            onCheckedChange={(v) => {
              localStorage.setItem('nub-msg-sound', v ? '1' : '0');
              setSound(v);
            }}
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span className="flex items-center gap-2">
            {desktop ? <BellIcon className="size-4 text-muted-foreground" /> : <BellOffIcon className="size-4 text-muted-foreground" />}
            Desktop popups
          </span>
          <Switch
            checked={desktop}
            onCheckedChange={(v) => {
              if (v) void enableDesktop();
              else {
                localStorage.setItem('nub-msg-desktop', '0');
                setDesktop(false);
              }
            }}
          />
        </label>
        <label className="flex cursor-pointer items-center justify-between gap-3 text-sm">
          <span>Email notifications</span>
          <Switch checked={server.enableEmail === true} onCheckedChange={(v) => setServer('enableEmail', v)} />
        </label>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Type badge for filtered conversations (spec §5 Professional/Community).
 */
export function TypeBadge({ type }: { type?: string }) {
  if (type === 'PROFESSIONAL') {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-blue-500/10 px-1.5 py-0.5 text-[10px] font-medium text-blue-600 dark:text-blue-400" title="Professional">
        💼 Pro
      </span>
    );
  }
  if (type === 'COMMUNITY') {
    return (
      <span className="inline-flex shrink-0 items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-600 dark:text-emerald-400" title="Community">
        👥 Comm
      </span>
    );
  }
  return null;
}

interface ConversationItemProps {
  conv: any;
  selected?: boolean;
  onSelect: (conv: any) => void;
  onPin: (conv: any, pinned: boolean) => void;
  onArchive: (conv: any, archived: boolean) => void;
  onMute: (conv: any, muted: boolean) => void;
}

function ConversationItem({ conv, selected, onSelect, onPin, onArchive, onMute }: ConversationItemProps) {
  const other = conv.otherUser ?? {};
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(conv)}
      onKeyDown={(e) => e.key === 'Enter' && onSelect(conv)}
      className={cn(
        'group flex cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 transition-colors',
        selected ? 'border-primary/50 bg-primary/5' : 'border-transparent hover:bg-muted/60',
        conv.isArchived && 'opacity-60'
      )}
      aria-label={`Open conversation with ${other.name}`}
    >
      <div className="relative shrink-0">
        <UserAvatar user={{ name: other.name ?? '?', photo: other.photo ?? null }} />
        <span className="absolute -bottom-0.5 -right-0.5">
          <OnlineStatus isOnline={Boolean(conv.isOnline)} />
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="flex min-w-0 items-center gap-1.5 truncate text-sm font-semibold">
            <span className="truncate">{other.name}</span>
            <TypeBadge type={conv.lastMessageType} />
          </p>
          {conv.lastMessageTime && (
            <span className="shrink-0 text-[11px] text-muted-foreground">{timeAgo(conv.lastMessageTime)}</span>
          )}
        </div>
        <p className="truncate text-[13px] text-muted-foreground">{conv.lastMessage ?? 'No messages yet'}</p>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        {conv.unreadCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[11px] font-semibold text-destructive-foreground">
            {conv.unreadCount > 9 ? '9+' : conv.unreadCount}
          </span>
        )}
        {conv.isMuted && <BellOffIcon className="size-3.5 text-muted-foreground" />}
        {conv.isPinned && <PinIcon className="size-3.5 fill-primary text-primary" />}
        <div className="hidden gap-0.5 group-hover:flex" onClick={(e) => e.stopPropagation()}>
          <TooltipProvider delayDuration={300}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => onPin(conv, !conv.isPinned)} aria-label="Pin conversation">
                  {conv.isPinned ? <PinOffIcon className="size-3.5" /> : <PinIcon className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{conv.isPinned ? 'Unpin' : 'Pin'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => onMute(conv, !conv.isMuted)} aria-label="Mute conversation">
                  {conv.isMuted ? <BellOffIcon className="size-3.5" /> : <BellIcon className="size-3.5" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent>{conv.isMuted ? 'Unmute' : 'Mute'}</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="size-7" onClick={() => onArchive(conv, !conv.isArchived)} aria-label="Archive conversation">
                  <ArchiveIcon className="size-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>{conv.isArchived ? 'Unarchive' : 'Archive'}</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
    </div>
  );
}

interface ConversationListProps {
  conversations: any[];
  loading?: boolean;
  error?: unknown;
  selectedId?: string | null;
  filter: MessageFilter;
  onFilterChange: (f: MessageFilter) => void;
  search: string;
  onSearchChange: (s: string) => void;
  onSelect: (conv: any) => void;
  onPin: (conv: any, pinned: boolean) => void;
  onArchive: (conv: any, archived: boolean) => void;
  onMute: (conv: any, muted: boolean) => void;
  onRetry?: () => void;
}

/**
 * Inbox list (spec §ConversationList): debounced search, filter tabs,
 * conversation rows with unread/online/type badges, hover pin/mute/archive,
 * New Message button, settings popover, loading/error/empty states.
 */
export function ConversationList({
  conversations,
  loading,
  error,
  selectedId,
  filter,
  onFilterChange,
  search,
  onSearchChange,
  onSelect,
  onPin,
  onArchive,
  onMute,
  onRetry,
}: ConversationListProps) {
  const [draft, setDraft] = useState(search);
  useEffect(() => setDraft(search), [search]);
  useEffect(() => {
    const t = setTimeout(() => onSearchChange(draft), 300); // spec: debounced 300ms
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  return (
    <div className="flex h-full flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-lg font-bold">Messages</h2>
        <div className="flex items-center gap-1">
          <Button size="sm" asChild>
            <Link href="/social/community/members">
              <MessageSquarePlusIcon className="mr-1 size-4" /> New
            </Link>
          </Button>
          <MessageSettingsPopover />
        </div>
      </div>

      <div className="relative">
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Search conversations…" className="pl-9" aria-label="Search conversations" />
      </div>

      <Tabs value={filter} onValueChange={(v) => onFilterChange(v as MessageFilter)}>
        <TabsList className="grid w-full grid-cols-5">
          {TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="min-h-0 flex-1 space-y-1.5 overflow-y-auto pr-0.5">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl px-3 py-2.5">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-full" />
              </div>
            </div>
          ))
        ) : error ? (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm text-muted-foreground">Couldn&apos;t load conversations.</p>
            <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
              Retry
            </Button>
          </div>
        ) : conversations.length === 0 ? (
          <div className="rounded-xl border border-border p-6 text-center">
            <p className="text-sm font-medium">No conversations yet</p>
            <p className="mt-1 text-xs text-muted-foreground">Start a chat from anyone&apos;s profile or the New button.</p>
          </div>
        ) : (
          conversations.map((conv) => (
            <ConversationItem
              key={conv.id}
              conv={conv}
              selected={selectedId === conv.id}
              onSelect={onSelect}
              onPin={onPin}
              onArchive={onArchive}
              onMute={onMute}
            />
          ))
        )}
      </div>
    </div>
  );
}

