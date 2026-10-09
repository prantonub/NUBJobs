'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { renderRichContent } from './social-helpers';
import { AuthorRow, type SocialUser } from './SocialUsers';
import { useDeletePost, useLikePost, useVotePoll, type SocialPoll } from '@/hooks/useSocial';
import { BarChart3, Heart, MessageCircle, MoreHorizontal, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export interface SocialPost {
  id: string;
  content: string;
  photoUrl?: string | null;
  poll?: SocialPoll | null;
  likeCount: number;
  commentCount: number;
  likedByMe: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  createdAt: string | Date;
  author: SocialUser;
}

/** Twitter-style poll block: vote buttons → % bars after voting. */
export function PollBlock({ postId, poll }: { postId: string; poll: SocialPoll }) {
  const vote = useVotePoll();
  const [voting, setVoting] = useState<number | null>(null);
  const voted = poll.myVote !== null && poll.myVote !== undefined;

  const onVote = async (idx: number) => {
    if (voting !== null || vote.isPending) return;
    // Clicking my own option again retracts the vote.
    const optionIdx = voted && poll.myVote === idx ? null : idx;
    setVoting(idx);
    try {
      await vote.mutateAsync({ postId, optionIdx });
    } finally {
      setVoting(null);
    }
  };

  return (
    <div className="mt-3 rounded-lg border border-border p-3">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <BarChart3 className="size-4 text-muted-foreground" />
        {poll.question}
      </p>
      <div className="mt-2 space-y-1.5">
        {poll.options.map((opt, i) => {
          const pct = poll.totalVotes > 0 ? Math.round((opt.votes / poll.totalVotes) * 100) : 0;
          const mine = poll.myVote === i;
          if (!voted) {
            return (
              <Button
                key={i}
                type="button"
                variant="outline"
                size="sm"
                className="w-full justify-start"
                disabled={voting !== null}
                onClick={() => void onVote(i)}
              >
                {voting === i ? 'Voting…' : opt.text}
              </Button>
            );
          }
          return (
            <button
              key={i}
              type="button"
              onClick={() => void onVote(i)}
              className={`relative w-full overflow-hidden rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors ${
                mine ? 'border-primary' : 'border-border hover:border-primary/50'
              }`}
              aria-label={`${opt.text} — ${pct}%${mine ? ' (your vote)' : ''}`}
            >
              <span className="absolute inset-y-0 left-0 bg-primary/10" style={{ width: `${pct}%` }} />
              <span className="relative flex items-center justify-between gap-2">
                <span className="truncate font-medium">
                  {opt.text}
                  {mine && <span className="ml-1.5 text-xs text-primary">✓</span>}
                </span>
                <span className="shrink-0 text-xs text-muted-foreground">{pct}%</span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}
        {voted ? ' · tap an option to change, tap yours to undo' : ' · tap to vote'}
      </p>
    </div>
  );
}

/** Single timeline post (spec Â§PostCard). Footer actions + owner menu. */
export function PostCard({ post, hideActions = false }: { post: SocialPost; hideActions?: boolean }) {
  const like = useLikePost();
  const remove = useDeletePost();
  const [liking, setLiking] = useState(false);
  const [lightbox, setLightbox] = useState(false);

  const onLike = async () => {
    if (liking) return;
    setLiking(true);
    try {
      await like.mutateAsync({ postId: post.id, liked: post.likedByMe });
    } finally {
      setLiking(false);
    }
  };

  return (
    <article className="rounded-lg border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <AuthorRow user={post.author} createdAt={post.createdAt} />
        {(post.canDelete || post.canEdit) && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Post actions">
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {post.canEdit && (
                <DropdownMenuItem asChild>
                  <Link href={`/social/posts/${post.id}?edit=1`}>
                    <Pencil className="mr-2 size-3.5" /> Edit post
                  </Link>
                </DropdownMenuItem>
              )}
              {post.canDelete && (
                <DropdownMenuItem
                  className="text-destructive"
                  onClick={() => {
                    if (confirm('Delete this post?')) remove.mutate(post.id);
                  }}
                >
                  Delete post
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <Link href={`/social/posts/${post.id}`} className="mt-1 block whitespace-pre-wrap text-sm">
        {renderRichContent(post.content)}
      </Link>

      {post.photoUrl && (
        <button
          type="button"
          onClick={() => setLightbox(true)}
          className="mt-3 block w-full cursor-zoom-in overflow-hidden rounded-lg border border-border"
          aria-label="View full photo"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.photoUrl} alt="" className="max-h-[480px] w-full object-contain bg-muted/30" loading="lazy" />
        </button>
      )}

      {post.poll && <PollBlock postId={post.id} poll={post.poll} />}

      <Dialog open={lightbox} onOpenChange={setLightbox}>
        <DialogContent className="max-w-4xl border-none bg-black/90 p-2 sm:max-w-4xl" aria-label="Full photo">
          <DialogTitle className="sr-only">Full photo</DialogTitle>
          {post.photoUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={post.photoUrl} alt="" className="max-h-[85vh] w-full object-contain" />
          )}
        </DialogContent>
      </Dialog>

      {!hideActions && (
        <div className="mt-3 flex items-center gap-1 border-t border-border pt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onLike}
            className={post.likedByMe ? 'text-rose-600' : undefined}
            aria-pressed={post.likedByMe}
          >
            <Heart className={`mr-1.5 size-4 ${post.likedByMe ? 'fill-current' : ''}`} />
            {post.likeCount > 0 ? post.likeCount : 'Like'}
          </Button>
          <Link href={`/social/posts/${post.id}`}>
            <Button variant="ghost" size="sm">
              <MessageCircle className="mr-1.5 size-4" />
              {post.commentCount > 0 ? post.commentCount : 'Comment'}
            </Button>
          </Link>
        </div>
      )}
    </article>
  );
}
