'use client';

import { FC } from 'react';
import Link from 'next/link';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OnlineStatus } from './OnlineStatus';

/**
 * Chat-header identity card (spec §10 UserProfileCard):
 * avatar, name, role, presence, View Profile / Block / Report actions.
 */
export const UserProfileCard: FC<{
  user: { id: string; name: string; photo?: string | null; role: string; email?: string };
  online?: boolean;
  onBlock?: () => void;
  onReport?: () => void;
  compact?: boolean;
}> = ({ user, online, onBlock, onReport, compact }) => {
  const roleLabel = user.role === 'EMPLOYER' ? 'Employer' : user.role === 'STUDENT' ? 'Student' : user.role;

  return (
    <div className="flex items-center gap-3">
      <Avatar className={compact ? 'size-8' : 'size-10'}>
        {user.photo && <AvatarImage src={user.photo} alt={user.name} />}
        <AvatarFallback>{user.name.charAt(0).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <p className="truncate text-sm font-semibold">{user.name}</p>
          <Badge variant="secondary" className="text-[10px]">
            {roleLabel}
          </Badge>
        </div>
        <OnlineStatus online={Boolean(online)} />
      </div>

      {!compact && (
        <div className="ml-auto flex items-center gap-1">
          <Button variant="ghost" size="sm" asChild>
            <Link href={`/profile/${user.id}`}>View Profile</Link>
          </Button>
          {onReport && (
            <Button variant="ghost" size="sm" onClick={onReport}>
              Report
            </Button>
          )}
          {onBlock && (
            <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600" onClick={onBlock}>
              Block
            </Button>
          )}
        </div>
      )}
    </div>
  );
};
