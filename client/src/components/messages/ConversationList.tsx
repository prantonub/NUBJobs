'use client';

import { FC } from 'react';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';
import type { ConversationSummary } from '@/hooks/useMessages';
import { ConversationItem } from './ConversationItem';

/**
 * Sidebar list (spec §1 ConversationList).
 * The server already sorts pinned-first then most-recent; this component
 * just renders what it's given and wires per-row actions.
 */
export const ConversationList: FC<{
  conversations: ConversationSummary[];
  /** Full row id (direct → conversation id; legacy → `app:<applicationId>`). */
  selectedId?: string | null;
  loading?: boolean;
  onlineUserIds?: Set<string>;
  onSelect: (conversation: ConversationSummary) => void;
  onPin?: (conversation: ConversationSummary) => void;
  onArchive?: (conversation: ConversationSummary) => void;
  onDelete?: (conversation: ConversationSummary) => void;
  emptyMessage?: string;
}> = ({
  conversations,
  selectedId,
  loading,
  onlineUserIds,
  onSelect,
  onPin,
  onArchive,
  onDelete,
  emptyMessage = 'No conversations yet',
}) => {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-10 text-muted-foreground">
        <Loader2 className="size-5 animate-spin" />
      </div>
    );
  }

  if (conversations.length === 0) {
    return <p className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div role="list" aria-label="Conversations">
      {conversations.map((conv) => (
        <ConversationItem
          key={conv.id}
          conversation={conv}
          selected={conv.id === selectedId}
          online={onlineUserIds?.has(conv.otherUserId)}
          onSelect={onSelect}
          onPin={onPin}
          onArchive={onArchive}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
};

/** Tab row: All | Unread | Archived | Pinned (spec §left-sidebar tabs). */
export const ConversationTabs: FC<{
  active: 'all' | 'unread' | 'archived' | 'pinned';
  onChange: (tab: 'all' | 'unread' | 'archived' | 'pinned') => void;
  unreadCount?: number;
}> = ({ active, onChange, unreadCount }) => {
  const tabs: Array<{ key: 'all' | 'unread' | 'archived' | 'pinned'; label: string }> = [
    { key: 'all', label: 'All' },
    { key: 'unread', label: 'Unread' },
    { key: 'archived', label: 'Archived' },
    { key: 'pinned', label: 'Pinned' },
  ];
  return (
    <div className="flex gap-1 border-b px-3 py-2" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.key}
          role="tab"
          aria-selected={active === t.key}
          onClick={() => onChange(t.key)}
          className={cn(
            'rounded-full px-3 py-1 text-xs font-medium transition-colors',
            active === t.key ? 'bg-blue-600 text-white' : 'bg-muted text-muted-foreground hover:text-foreground'
          )}
        >
          {t.label}
          {t.key === 'unread' && unreadCount ? ` (${unreadCount})` : ''}
        </button>
      ))}
    </div>
  );
};
