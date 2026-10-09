'use client';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { renderRichContent } from './social-helpers';
import { AuthorRow, type SocialUser } from './SocialUsers';
import { useCreateComment, useDeleteComment, useLikeComment } from '@/hooks/useSocial';
import { Heart, Reply } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export interface SocialComment {
  id: string;
  content: string;
  likeCount: number;
  likedByMe: boolean;
  parentCommentId?: string | null;
  canDelete?: boolean;
  createdAt: string | Date;
  author: SocialUser;
  replies?: SocialComment[];
}

function CommentBody({
  comment,
  postId,
  depth,
}: {
  comment: SocialComment;
  postId: string;
  depth: number;
}) {
  const like = useLikeComment(postId);
  const remove = useDeleteComment(postId);
  const reply = useCreateComment(postId);
  const [replyOpen, setReplyOpen] = useState(false);
  const [replyText, setReplyText] = useState('');

  return (
    <div className={depth > 0 ? 'ml-8 border-l-2 border-muted pl-3' : ''}>
      <AuthorRow user={comment.author} createdAt={comment.createdAt} compact />
      <p className="mt-0.5 whitespace-pre-wrap text-sm">{renderRichContent(comment.content)}</p>
      <div className="mt-1 flex items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          className={`h-7 px-2 text-xs ${comment.likedByMe ? 'text-rose-600' : ''}`}
          onClick={() => like.mutate({ commentId: comment.id, liked: comment.likedByMe })}
        >
          <Heart className={`mr-1 size-3.5 ${comment.likedByMe ? 'fill-current' : ''}`} />
          {comment.likeCount > 0 ? comment.likeCount : 'Like'}
        </Button>
        {depth === 0 && (
          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => setReplyOpen((v) => !v)}>
            <Reply className="mr-1 size-3.5" /> Reply
          </Button>
        )}
        {comment.canDelete && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs text-destructive"
            onClick={() => {
              if (confirm('Delete this comment?')) remove.mutate(comment.id);
            }}
          >
            Delete
          </Button>
        )}
      </div>
      {replyOpen && (
        <form
          className="mt-2 flex gap-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!replyText.trim()) return;
            try {
              await reply.mutateAsync({ content: replyText.trim(), parentCommentId: comment.id });
              setReplyText('');
              setReplyOpen(false);
            } catch {
              toast.error('Failed to reply');
            }
          }}
        >
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            rows={2}
            maxLength={500}
            placeholder={`Reply to ${comment.author.name}…`}
            aria-label="Reply"
          />
          <Button type="submit" size="sm" disabled={!replyText.trim() || reply.isPending}>
            Reply
          </Button>
        </form>
      )}
      {(comment.replies ?? []).map((child) => (
        <CommentBody key={child.id} comment={child} postId={postId} depth={depth + 1} />
      ))}
    </div>
  );
}

/** Threaded comment thread (spec §CommentCard). */
export function CommentThread({ comments, postId }: { comments: SocialComment[]; postId: string }) {
  const create = useCreateComment(postId);
  const [text, setText] = useState('');
  return (
    <div className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (!text.trim()) return;
          try {
            await create.mutateAsync({ content: text.trim() });
            setText('');
          } catch {
            toast.error('Failed to comment');
          }
        }}
      >
        <Textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={2}
          maxLength={500}
          placeholder="Write a comment… (500 chars)"
          aria-label="Write a comment"
        />
        <Button type="submit" disabled={!text.trim() || create.isPending}>
          Send
        </Button>
      </form>
      {comments.length === 0 && (
        <p className="text-sm text-muted-foreground">No comments yet. Start the conversation!</p>
      )}
      {comments.map((c) => (
        <CommentBody key={c.id} comment={c} postId={postId} depth={0} />
      ))}
    </div>
  );
}
