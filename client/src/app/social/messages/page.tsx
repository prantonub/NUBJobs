'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

import { SocialShell } from '@/components/social/SocialNav';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UserAvatar } from '@/components/social/SocialUsers';
import {
  useConversations,
  useSocialUnreadMessages,
} from '@/hooks/useSocial';

/** Professional keywords for filtering (spec: professional filtering). */
const PROFESSIONAL_KEYWORDS = ['#Job', '#Interview', '#Career', '#Offer', '#Salary', '#Negotiation'];

/** Community keywords (community tagging). */
const COMMUNITY_KEYWORDS = ['#Community', '#NUB', '#Campus', '#Club', '#Event', '#Project'];

/** /social/messages — conversation threads with All/Professional/Community filters. */
export default function MessagesPage() {
  const [filter, setFilter] = useState<'all' | 'professional' | 'community'>('all');
  const [search, setSearch] = useState('');
  const conversations = useConversations(1);
  const unread = useSocialUnreadMessages();
  const router = useRouter();

  const q: any[] = (conversations.data as any)?.conversations ?? [];
  const totalUnread: number = (unread.data as any)?.unreadCount ?? 0;

  const isProfessional = (text: string) =>
    PROFESSIONAL_KEYWORDS.some((kw) => text.includes(kw));
  const isCommunity = (text: string) =>
    COMMUNITY_KEYWORDS.some((kw) => text.includes(kw));

  const needle = search.trim().toLowerCase();
  const filtered = q
    .filter((c: any) => {
      if (filter === 'professional' && !(c.lastMessage && isProfessional(c.lastMessage))) return false;
      if (filter === 'community' && !(c.lastMessage && isCommunity(c.lastMessage))) return false;
      if (
        needle &&
        !(c.otherUser?.name?.toLowerCase().includes(needle) ||
          c.otherUser?.username?.toLowerCase().includes(needle) ||
          c.lastMessage?.toLowerCase().includes(needle))
      )
        return false;
      return true;
    })
    .sort((a: any, b: any) => +new Date(b.lastMessageTime ?? 0) - +new Date(a.lastMessageTime ?? 0));

  const openThread = (conv: any) => {
    router.push(`/social/messages/${conv.otherUser.id}`);
  };

  return (
    <SocialShell>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold">
            Messages
            {totalUnread > 0 && (
              <span className="ml-2 rounded-full bg-primary px-2 py-0.5 align-middle text-xs font-semibold text-primary-foreground">
                {totalUnread}
              </span>
            )}
          </h1>
          <p className="text-sm text-muted-foreground">Direct and professional conversations</p>
        </div>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as any)} className="mb-3">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="professional">Professional</TabsTrigger>
          <TabsTrigger value="community">Community</TabsTrigger>
        </TabsList>
      </Tabs>

      <Input
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        placeholder="Search conversations…"
        className="mb-3 max-w-sm"
        aria-label="Search conversations"
      />

      <div className="space-y-2">
        {conversations.isLoading ? (
          <Skeleton className="h-24 w-full" />
        ) : filtered.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-muted-foreground">No conversations matching this filter.</p>
          </Card>
        ) : (
          filtered.map((conv: any) => (
            <Button
              key={conv.id}
              variant="ghost"
              onClick={() => openThread(conv)}
              className="h-auto w-full justify-start p-0"
            >
              <Card className="w-full">
                <CardContent className="flex items-center gap-3">
                  <UserAvatar user={conv.otherUser} />
                  <div className="min-w-0 flex-1 text-left">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-semibold">{conv.otherUser?.name}</p>
                      {conv.lastMessageTime && (
                        <span className="shrink-0 text-[11px] text-muted-foreground">
                          {new Date(conv.lastMessageTime).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                    <p className="truncate text-sm text-muted-foreground">@{conv.otherUser?.username}</p>
                    <p className="truncate text-sm">{conv.lastMessage ?? 'No messages yet'}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {conv.unreadCount > 0 && (
                      <span className="flex shrink-0 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-xs font-semibold text-primary-foreground">
                        {conv.unreadCount}
                      </span>
                    )}
                    {conv.isPinned && <span className="text-[10px] text-primary">📌</span>}
                  </div>
                </CardContent>
              </Card>
            </Button>
          ))
        )}
      </div>
    </SocialShell>
  );
}