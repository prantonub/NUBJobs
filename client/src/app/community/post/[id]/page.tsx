'use client';

import { CommentThread } from '@/components/social/CommentCard';
import { PostCard } from '@/components/social/PostCard';
import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { SuggestionsCard, TrendingCard } from '@/components/social/SocialExtras';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import { useEditPost, usePost, useSocialSocket } from '@/hooks/useSocial';
import { use, useState } from 'react';
import { toast } from 'sonner';

/** /community/post/:id — full post, inline edit (30-min window), threaded comments. */
export default function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  useSocialSocket();
  const detail = usePost(id);
  const edit = useEditPost(id);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const post = (detail.data as any)?.post;
  const comments: any[] = (detail.data as any)?.comments ?? [];

  return (
    <SocialShell
      right={
        <>
          <TrendingCard limit={5} />
          <SuggestionsCard limit={5} />
        </>
      }
    >
      <SocialNav title="Post" />
      {detail.isLoading && <Skeleton className="h-64 w-full" />}
      {detail.isError && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm">
          This post could not be found.
        </p>
      )}
      {post && (
        <div className="space-y-4">
          {editing ? (
            <form
              className="space-y-3 rounded-lg border border-border bg-card p-4"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!draft.trim() || draft.length > 500) return;
                try {
                  await edit.mutateAsync({ content: draft.trim(), photoUrl: post.photoUrl ?? null });
                  setEditing(false);
                  toast.success('Post updated');
                } catch (err: any) {
                  toast.error(err?.response?.data?.message ?? 'Could not edit (30-minute window passed)');
                }
              }}
            >
              <Textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                rows={4}
                maxLength={600}
                aria-label="Edit post"
              />
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{draft.length}/500</span>
                <div className="flex gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={edit.isPending}>
                    Save
                  </Button>
                </div>
              </div>
            </form>
          ) : (
            <>
              <PostCard post={post} hideActions />
              <div className="rounded-lg border border-border bg-card p-4">
                <p className="mb-1 text-xs uppercase tracking-wide text-muted-foreground">
                  {post.likeCount} likes · {post.commentCount} comments
                </p>
                {post.canEdit && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setDraft(post.content);
                      setEditing(true);
                    }}
                  >
                    Edit post (30-min window)
                  </Button>
                )}
              </div>
            </>
          )}
          <div className="rounded-lg border border-border bg-card p-4">
            <h2 className="mb-3 text-sm font-semibold">Comments</h2>
            <CommentThread comments={comments} postId={id} />
          </div>
        </div>
      )}
    </SocialShell>
  );
}
