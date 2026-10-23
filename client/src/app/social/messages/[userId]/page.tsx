'use client';

import { use, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeftIcon, ExternalLinkIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ChatWindow } from '@/components/social/ChatWindow';
import { useMessages, useHistoryMeta, flattenHistory } from '@/hooks/useSocialMessages';

/**
 * /social/messages/:userId - DM thread. `?post=` carries the post the chat
 * was started from (spec §DATABASE sourceType/sourceId) so the sender knows
 * the context and the message links back to it.
 */
export default function SocialMessageThreadPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params);
  const searchParams = useSearchParams();
  const router = useRouter();
  const postId = searchParams.get('post');
  const [sourceId, setSourceId] = useState<string | null>(postId);

  const { data, isLoading } = useMessages(userId);
  const { otherUser } = useHistoryMeta(data);
  const loaded = otherUser !== null || !isLoading;

  // Once the thread loads, keep the post chip visible only for this visit.
  useEffect(() => {
    if (loaded && postId) {
      const timer = setTimeout(() => router.replace(`/social/messages/${userId}`, { scroll: false }), 30_000);
      return () => clearTimeout(timer);
    }
  }, [loaded, postId, router, userId]);

  if (isLoading && flattenHistory(data).length === 0) {
    return (
      <div className="flex h-full flex-col">
        <div className="flex items-center gap-2 border-b border-border px-4 py-3">
          <Button variant="ghost" size="icon" className="lg:hidden" asChild aria-label="Back to list">
            <Link href="/social/messages">
              <ArrowLeftIcon className="size-4" />
            </Link>
          </Button>
          <Skeleton className="size-10 rounded-full" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
        <div className="flex-1 p-4">
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {sourceId && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border bg-muted/50 px-3 py-1.5 text-xs sm:px-4">
          <span className="truncate text-muted-foreground">
            💬 Chatting about a post your first message will link back to it.
          </span>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
              <Link href={`/social/posts/${sourceId}`}>
                <ExternalLinkIcon className="mr-1 size-3" /> View post
              </Link>
            </Button>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setSourceId(null)}>
              Dismiss
            </Button>
          </div>
        </div>
      )}
      <div className="min-h-0 flex-1">
        <ChatWindow userId={userId} sourceId={sourceId} />
      </div>
    </div>
  );
}
