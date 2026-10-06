'use client';

import { FC } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { ArrowLeftIcon, ArchiveIcon, ArchiveRestoreIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useMessages, useUnarchiveConversation } from '@/hooks/useMessages';

/**
 * /messages/archived — archived conversations (spec §FRONTEND PAGE 4).
 * Unarchive restores the thread to the main list; the row shows the last
 * message and archived date.
 */
const ArchivedPage: FC = () => {
  const router = useRouter();
  const { data, isLoading } = useMessages({ filter: 'archived', limit: 50 });
  const unarchiveMutation = useUnarchiveConversation();

  const conversations = data?.conversations ?? [];

  const handleUnarchive = (userId: string) => {
    unarchiveMutation.mutate(userId, {
      onSuccess: () => toast.success('Conversation restored'),
      onError: () => toast.error('Failed to restore conversation'),
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link href="/messages">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Archived Conversations</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : conversations.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <ArchiveIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No archived conversations</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/messages">Back to messages</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {conversations.map((conv) => (
                <li key={conv.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="size-10">
                    {conv.otherUserPhoto && <AvatarImage src={conv.otherUserPhoto} alt={conv.otherUserName} />}
                    <AvatarFallback>{conv.otherUserName.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{conv.otherUserName}</p>
                    <p className="truncate text-xs text-muted-foreground">{conv.lastMessage ?? 'No messages'}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Archived · last activity {new Date(conv.lastMessageTime).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/messages?user=${conv.otherUserId}`)}>
                      Open
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleUnarchive(conv.otherUserId)}
                      disabled={unarchiveMutation.isPending}
                    >
                      <ArchiveRestoreIcon className="mr-1 size-4" /> Unarchive
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ArchivedPage;
