'use client';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useFollow } from '@/hooks/useSocial';
import { getInitials } from '@/lib/utils';
import { MessageSquare } from 'lucide-react';
import Link from 'next/link';

export interface SocialUser {
  id: string;
  username?: string | null;
  name?: string;
  role?: string;
  photo?: string | null;
  bio?: string | null;
  isFollowing?: boolean;
}

/** Toggle Follow / Following for any social user (spec Â§FollowButton). */
export function FollowButton({ user, size = 'sm' }: { user: SocialUser; size?: 'sm' | 'default' }) {
  const follow = useFollow(user.username ?? undefined);
  if (!user.username) return null;
  const following = Boolean(user.isFollowing);
  return (
    <Button
      size={size}
      variant={following ? 'outline' : 'default'}
      disabled={follow.isPending}
      onClick={() => follow.mutate(following)}
    >
      {follow.isPending ? 'â€¦' : following ? 'Following' : 'Follow'}
    </Button>
  );
}

export function UserAvatar({ user, size = 'md' }: { user: Pick<SocialUser, 'name' | 'photo'>; size?: 'sm' | 'md' | 'lg' }) {
  const cls = size === 'lg' ? 'size-16' : size === 'sm' ? 'size-8' : 'size-10';
  return (
    <Avatar className={cls}>
      <AvatarImage src={user.photo ?? undefined} alt={user.name ?? 'User'} />
      <AvatarFallback>{getInitials(user.name ?? 'U')}</AvatarFallback>
    </Avatar>
  );
}

/** Compact user row for message lists (suggestions, followers, search results). */
export function UserCard({ user, meta, compact = false }: { user: SocialUser; meta?: string; compact?: boolean }) {
  const { user: me } = useAuth();
  const isSelf = Boolean(me?.id && user.id === me.id);
  const prefix = compact ? 'p-2' : 'p-3';
  const cls = compact ? 'rounded-lg border border-border bg-card' : 'rounded-lg border border-border bg-card p-3';
  const profileHref = user.username ? `/social/profile/${user.username}` : '#';
  return (
    <div className={cls}>
      <Link href={profileHref}>
        <UserAvatar user={user} size="sm" />
      </Link>
      <div className="min-w-0 flex-1">
        <Link href={profileHref} className={`block truncate text-sm font-semibold hover:underline ${compact ? 'mt-0' : ''}`}>
          {user.name}
        </Link>
        <p className={`truncate text-xs text-muted-foreground ${compact ? 'mt-0' : ''}`}>
          @{user.username}
          {user.role ? ` Â· ${user.role}` : ''}
          {meta ? ` Â· ${meta}` : ''}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {!isSelf && user.id && (
          <Link
            href={`/messages?user=${user.id}`}
            aria-label={`Message ${user.name ?? ''}`}
            title="Message"
          >
            <Button variant="outline" size="sm">
              <MessageSquare className="mr-1 size-3.5" />
              Message
            </Button>
          </Link>
        )}
        <FollowButton user={user} />
      </div>
    </div>
  );
}

/** Profile header with stats + actions (spec Â§UserHeader). */
export function UserHeader({
  user,
  stats,
  isSelf,
  onEdit,
}: {
  user: SocialUser & { location?: string | null; website?: string | null; joinedAt?: string | Date };
  stats: { posts: number; followers: number; following: number };
  isSelf: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-start gap-4">
        <UserAvatar user={user} size="lg" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-xl font-bold">{user.name}</h1>
          <p className="text-sm text-muted-foreground">@{user.username}</p>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {user.role && <span>{user.role}</span>}
            {user.location && <span>{user.location}</span>}
            {user.website && (
              <a href={user.website} target="_blank" rel="noreferrer" className="text-primary hover:underline">
                {user.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            {user.joinedAt && <span>Joined {new Date(user.joinedAt).toLocaleDateString()}</span>}
          </p>
          {user.bio && <p className="mt-2 text-sm">{user.bio}</p>}
          <div className="mt-3 flex items-center gap-4 text-sm">
            <span>
              <strong>{stats.posts}</strong> <span className="text-muted-foreground">Posts</span>
            </span>
            <Link href={`/social/profile/${user.username}/followers`} className="hover:underline">
              <strong>{stats.followers}</strong> <span className="text-muted-foreground">Followers</span>
            </Link>
            <Link href={`/social/profile/${user.username}/following`} className="hover:underline">
              <strong>{stats.following}</strong> <span className="text-muted-foreground">Following</span>
            </Link>
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          {isSelf ? (
            <Button variant="outline" onClick={onEdit}>
              Edit Profile
            </Button>
          ) : (
            <>
              <FollowButton user={user} />
              {/* Deep-link into the main dashboard inbox (opens with this user's chat). */}
              <Link href={user.id ? `/messages?user=${user.id}` : '/messages'}>
                <Button variant="outline">Message</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** Author row used on posts and comments — name only (no @handle / role / timestamp). */
export function AuthorRow({ user, compact = false }: { user: SocialUser; createdAt?: string | Date; compact?: boolean }) {
  return (
    <div className={`flex items-center gap-2.5 ${compact ? '' : 'mb-2'}`}>
      <Link href={user.username ? `/social/profile/${user.username}` : '#'}>
        <UserAvatar user={user} size={compact ? 'sm' : 'md'} />
      </Link>
      <div className="min-w-0">
        <Link
          href={user.username ? `/social/profile/${user.username}` : '#'}
          className="block truncate text-sm font-semibold hover:underline"
        >
          {user.name}
        </Link>
      </div>
    </div>
  );
}


