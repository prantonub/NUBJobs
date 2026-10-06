'use client';

import { FC } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeftIcon, ShieldOffIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useBlockedUsers, useUnblockUser } from '@/hooks/useMessages';

/**
 * /messages/blocked — blocked users (spec §FRONTEND PAGE 5).
 * Unblock restores messaging in both directions immediately.
 */
const BlockedPage: FC = () => {
  const { data, isLoading } = useBlockedUsers();
  const unblockMutation = useUnblockUser();

  const handleUnblock = (userId: string) => {
    unblockMutation.mutate(userId, {
      onSuccess: () => toast.success('User unblocked'),
      onError: () => toast.error('Failed to unblock user'),
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
        <h1 className="text-xl font-semibold">Blocked Users</h1>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Loading…</p>
          ) : (data?.length ?? 0) === 0 ? (
            <div className="flex flex-col items-center gap-2 p-10 text-center">
              <ShieldOffIcon className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No blocked users</p>
              <Button variant="outline" size="sm" asChild>
                <Link href="/messages">Back to messages</Link>
              </Button>
            </div>
          ) : (
            <ul className="divide-y">
              {data!.map((u) => (
                <li key={u.userId} className="flex items-center gap-3 px-4 py-3">
                  <Avatar className="size-10">
                    {u.photo && <AvatarImage src={u.photo} alt={u.name} />}
                    <AvatarFallback>{u.name.charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium">{u.name}</p>
                      <Badge variant="secondary" className="text-[10px]">
                        {u.role === 'EMPLOYER' ? 'Employer' : u.role === 'STUDENT' ? 'Student' : u.role}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Blocked {new Date(u.blockedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUnblock(u.userId)}
                    disabled={unblockMutation.isPending}
                  >
                    Unblock
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default BlockedPage;
