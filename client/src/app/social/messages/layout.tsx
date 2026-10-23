'use client';

import { useMemo, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { SocialShell } from '@/components/social/SocialNav';
import { ConversationList, type MessageFilter } from '@/components/social/ConversationList';
import { cn } from '@/lib/utils';
import { useConversationFlags, useConversations, useMessageRealtime } from '@/hooks/useSocialMessages';

/**
 * Messages section shell (spec §File: app/social/messages/layout.tsx):
 * SocialShell + two-pane grid (list | chat). Desktop shows both; mobile
 * shows the list on /social/messages and the thread on /social/messages/:id.
 */
export default function SocialMessagesLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [filter, setFilter] = useState<MessageFilter>('all');
  const [search, setSearch] = useState('');

  // Mounted once - drives badge updates, sounds and desktop notifications.
  useMessageRealtime();

  const conversations = useConversations({ filter, search, page: 1 });
  const flags = useConversationFlags();

  const items: any[] = useMemo(
    () => (conversations.data as any)?.conversations ?? [],
    [conversations.data]
  );

  const openUserId = pathname?.startsWith('/social/messages/')
    ? decodeURIComponent(pathname.split('/').pop() ?? '')
    : null;
  const selectedId = openUserId ? items.find((c) => c.otherUser?.id === openUserId)?.id ?? null : null;

  const flag = (conv: any, key: 'pinned' | 'archived' | 'muted', value: boolean) => {
    if (conv.otherUser?.id) flags.mutate({ userId: conv.otherUser.id, [key]: value });
  };

  return (
    <SocialShell>
      <div className="grid gap-4 lg:h-[calc(100dvh-240px)] lg:min-h-[480px] lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={cn('min-h-0', openUserId && 'hidden lg:block')} aria-label="Conversation list">
          <ConversationList
            conversations={items}
            loading={conversations.isLoading}
            error={conversations.isError}
            selectedId={selectedId}
            filter={filter}
            onFilterChange={setFilter}
            search={search}
            onSearchChange={setSearch}
            onSelect={(conv) => router.push(`/social/messages/${conv.otherUser?.id}`)}
            onPin={(conv, pinned) => flag(conv, 'pinned', pinned)}
            onArchive={(conv, archived) => flag(conv, 'archived', archived)}
            onMute={(conv, muted) => flag(conv, 'muted', muted)}
            onRetry={() => conversations.refetch()}
          />
        </aside>
        <section
          className={cn(
            'min-h-[60vh] min-w-0 overflow-hidden rounded-xl border border-border bg-card lg:h-auto',
            !openUserId && 'hidden lg:block'
          )}
          aria-label="Chat"
        >
          {children}
        </section>
      </div>
    </SocialShell>
  );
}
