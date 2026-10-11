'use client';

import { useEffect, useRef, useState } from 'react';
import { ImageIcon, SendIcon, SmileIcon, XIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { UserAvatar } from '@/components/social/SocialUsers';
import { cn } from '@/lib/utils';
import {
  MESSAGE_MAX,
  charCounter,
  extractUrl,
  validateMessage,
  validatePhoto,
} from '@/lib/messageService';
import { useSearchUsers, useUploadMessagePhoto } from '@/hooks/useSocialMessages';

const EMOJI_SET = [
  '😀', '😁', '😂', '🤣', '😊', '😍', '😘', '😎', '🤔', '😅',
  '😭', '😡', '😱', '👍', '👎', '👏', '🙏', '❤️', '💯', '🎉',
  '🔥', '✨', '👋', '🙌', '💪', '🤝', '👀', '💡', '📌', '✅',
];

interface MessageInputProps {
  userId: string;
  onSend: (payload: { content: string; photoUrl?: string | null }) => Promise<void> | void;
  sending?: boolean;
  onTyping?: () => void;
  onStopTyping?: () => void;
  replyTo?: any | null;
  onClearReply?: () => void;
}

/**
 * Message composer (spec §MessageInput): auto-expand textarea, 0/500 counter,
 * emoji picker, photo attach + preview, @mention autocomplete, link chip,
 * Enter to send / Shift+Enter for newline.
 */
export function MessageInput({
  userId,
  onSend,
  sending,
  onTyping,
  onStopTyping,
  replyTo,
  onClearReply,
}: MessageInputProps) {
  const [draft, setDraft] = useState('');
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [mentionQuery, setMentionQuery] = useState<string | null>(null);
  const [emojiOpen, setEmojiOpen] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useUploadMessagePhoto();
  const urlPreview = extractUrl(draft);

  // Mention autocomplete: track the @word directly left of the caret.
  const mentionResults = useSearchUsers(
    mentionQuery ?? '',
    1,
    mentionQuery !== null && mentionQuery.length <= 20,
    5
  );

  useEffect(() => {
    return () => {
      if (typingTimer.current) clearTimeout(typingTimer.current);
    };
  }, []);

  useEffect(() => {
    areaRef.current?.focus();
  }, [replyTo?.id]);

  /** Auto-grow to a sane cap, then scroll. */
  const autogrow = () => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  };

  const notifyTyping = () => {
    onTyping?.();
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => onStopTyping?.(), 2_000);
  };

  const insertAtCaret = (insert: string) => {
    const el = areaRef.current;
    if (!el) {
      setDraft((d) => d + insert);
      return;
    }
    const { selectionStart, selectionEnd } = el;
    const next = draft.slice(0, selectionStart) + insert + draft.slice(selectionEnd);
    setDraft(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(selectionStart + insert.length, selectionStart + insert.length);
      autogrow();
    });
  };

  const pickPhoto = async (file: File) => {
    const check = validatePhoto(file);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    setPhotoBusy(true);
    try {
      const res = await upload.mutateAsync(file);
      setPhotoUrl(res?.photoUrl ?? null);
    } catch (err: any) {
      toast.error(err?.response?.data?.message ?? 'Photo upload failed — retry');
    } finally {
      setPhotoBusy(false);
    }
  };

  const submit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (sending === true || photoBusy) return;
    const check = validateMessage(draft, photoUrl);
    if (!check.ok) {
      toast.error(check.error);
      return;
    }
    try {
      await onSend({ content: draft.trim(), photoUrl });
      setDraft('');
      setPhotoUrl(null);
      setMentionQuery(null);
      onStopTyping?.();
      if (areaRef.current) areaRef.current.style.height = 'auto';
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to send', {
        action: { label: 'Retry', onClick: () => submit() },
      });
    }
  };

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const next = e.target.value;
    if (next.length > MESSAGE_MAX) return; // hard cap at 500
    setDraft(next);
    autogrow();
    notifyTyping();

    // Caret-safe mention detection.
    const caret = e.target.selectionStart ?? next.length;
    const left = next.slice(0, caret);
    const at = left.lastIndexOf('@');
    if (at >= 0 && (at === 0 || /[\s,.;:!?()]/.test(left[at - 1]))) {
      const q = left.slice(at + 1);
      if (/^[A-Za-z0-9_]{0,20}$/.test(q) && !q.includes(' ')) setMentionQuery(q);
      else setMentionQuery(null);
    } else {
      setMentionQuery(null);
    }
  };

  const applyMention = (username: string) => {
    const el = areaRef.current;
    if (!el) {
      setDraft((d) => `${d}@${username} `);
      setMentionQuery(null);
      return;
    }
    const caret = el.selectionStart ?? draft.length;
    const left = draft.slice(0, caret);
    const at = left.lastIndexOf('@');
    const next = `${left.slice(0, at)}@${username} ${draft.slice(caret)}`;
    setDraft(next);
    setMentionQuery(null);
    requestAnimationFrame(() => {
      const pos = at + username.length + 2;
      el.focus();
      el.setSelectionRange(pos, pos);
      autogrow();
    });
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  };

  const mentions = ((mentionResults.data as any)?.users ?? []) as Array<{
    id: string;
    username: string;
    name: string;
    photo: string | null;
  }>;

  const canSend = (draft.trim().length > 0 || photoUrl) && !sending && !photoBusy;

  return (
    <div className="relative">
      {replyTo && (
        <div className="mb-1.5 flex items-center justify-between gap-2 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs">
          <span className="truncate text-muted-foreground">
            Replying to <span className="font-medium text-foreground">{String(replyTo.content ?? 'photo').slice(0, 80)}</span>
          </span>
          <Button variant="ghost" size="icon" className="size-5" onClick={onClearReply} aria-label="Cancel reply">
            <XIcon className="size-3.5" />
          </Button>
        </div>
      )}

      {urlPreview && (
        <div className="mb-1.5 flex items-center gap-2 rounded-lg border border-border bg-muted/60 px-3 py-1.5 text-xs text-muted-foreground">
          <span className="truncate">
            🔗 {(() => {
              try {
                return new URL(urlPreview).hostname;
              } catch {
                return urlPreview;
              }
            })()}
          </span>
        </div>
      )}

      {photoUrl && (
        <div className="relative mb-1.5 inline-block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={photoUrl} alt="attachment preview" className="max-h-32 rounded-lg border border-border object-cover" />
          <Button variant="secondary" size="icon" className="absolute right-1 top-1 size-6" onClick={() => setPhotoUrl(null)} aria-label="Remove photo">
            <XIcon className="size-3.5" />
          </Button>
        </div>
      )}

      {mentionQuery !== null && mentions.length > 0 && (
        <div className="absolute bottom-full left-0 z-20 mb-1 w-64 overflow-hidden rounded-lg border border-border bg-popover shadow-lg">
          {mentions.slice(0, 5).map((u) => (
            <button
              key={u.id}
              type="button"
              className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              onMouseDown={(e) => {
                e.preventDefault();
                applyMention(u.username);
              }}
            >
              <UserAvatar user={{ name: u.name, photo: u.photo }} size="sm" />
              <span className="min-w-0">
                <span className="block truncate font-medium">{u.name}</span>
                <span className="block truncate text-xs text-muted-foreground">@{u.username}</span>
              </span>
            </button>
          ))}
        </div>
      )}

      <form onSubmit={submit} className="flex items-end gap-2">
        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void pickPhoto(file);
            e.target.value = '';
          }}
        />
        <Button type="button" variant="ghost" size="icon" className="mb-1 shrink-0" onClick={() => fileRef.current?.click()} disabled={photoBusy || sending} aria-label="Attach photo">
          <ImageIcon className="size-5" />
        </Button>

        <div className="relative min-w-0 flex-1">
          <Textarea
            ref={areaRef}
            value={draft}
            onChange={onChange}
            onKeyDown={onKeyDown}
            placeholder="Type a message… (Enter to send)"
            aria-label="Message content"
            rows={1}
            className="max-h-40 resize-none pr-14"
          />
          <span
            className={cn(
              'pointer-events-none absolute bottom-2 right-2.5 text-[10px] tabular-nums',
              draft.length > MESSAGE_MAX - 50 ? 'text-destructive' : 'text-muted-foreground'
            )}
          >
            {charCounter(draft.length)}
          </span>
        </div>

        <Popover open={emojiOpen} onOpenChange={setEmojiOpen}>
          <PopoverTrigger asChild>
            <Button type="button" variant="ghost" size="icon" className="mb-1 shrink-0" aria-label="Insert emoji">
              <SmileIcon className="size-5" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-2">
            <div className="grid max-h-48 grid-cols-10 gap-0.5 overflow-y-auto">
              {EMOJI_SET.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="rounded p-1 text-xl transition-colors hover:bg-muted"
                  onClick={() => {
                    insertAtCaret(emoji);
                    notifyTyping();
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <Button type="submit" size="icon" className="mb-0.5 shrink-0 rounded-full" disabled={!canSend} aria-label="Send message">
          <SendIcon className="size-4" />
        </Button>
      </form>
      {photoBusy && <p className="mt-1 text-xs text-muted-foreground">Uploading photo…</p>}
    </div>
  );
}
