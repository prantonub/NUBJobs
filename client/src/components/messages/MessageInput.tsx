'use client';

import { FC, useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader2, SendHorizontalIcon, SmilePlusIcon } from 'lucide-react';

const MAX_CHARS = 5000;

/** A tiny built-in emoji quick-picker (avoids pulling a heavy dependency). */
const QUICK_EMOJI = ['👍', '🙏', '😊', '🎉', '🔥', '💼', '✅', '👋', '🚀', '💡', '⏰', '🤝'];

/**
 * Message composer (spec §5 MessageInput):
 * auto-grow textarea, emoji picker, char counter, draft auto-save (localStorage
 * per recipient), disabled-on-empty send button.
 */
export const MessageInput: FC<{
  onSend: (content: string) => Promise<void> | void;
  onTyping?: () => void;
  onStopTyping?: () => void;
  draftKey?: string;
  disabled?: boolean;
  sending?: boolean;
}> = ({ onSend, onTyping, onStopTyping, draftKey, disabled, sending }) => {
  const [value, setValue] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const stopTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore the saved draft when the recipient changes.
  useEffect(() => {
    if (!draftKey) return;
    const saved = window.localStorage.getItem(`msg-draft:${draftKey}`);
    setValue(saved ?? '');
    return () => {
      if (stopTimer.current) clearTimeout(stopTimer.current);
      onStopTyping?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draftKey]);

  // Persist draft as the user types.
  useEffect(() => {
    if (!draftKey) return;
    if (value) window.localStorage.setItem(`msg-draft:${draftKey}`, value);
    else window.localStorage.removeItem(`msg-draft:${draftKey}`);
  }, [value, draftKey]);

  // Auto-grow (cap at ~40% of the viewport so the list stays scrollable).
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [value]);

  const handleTyping = () => {
    onTyping?.();
    if (stopTimer.current) clearTimeout(stopTimer.current);
    stopTimer.current = setTimeout(() => onStopTyping?.(), 2500);
  };

  const submit = async () => {
    const content = value.trim();
    if (!content || disabled || sending) return;
    setValue('');
    if (draftKey) window.localStorage.removeItem(`msg-draft:${draftKey}`);
    onStopTyping?.();
    await onSend(content);
    textareaRef.current?.focus();
  };

  return (
    <div className="border-t bg-background p-3">
      {showEmoji && (
        <div className="mb-2 flex flex-wrap gap-1 rounded-lg border bg-muted/40 p-2">
          {QUICK_EMOJI.map((e) => (
            <button
              key={e}
              type="button"
              className="rounded p-1 text-lg hover:bg-muted"
              onClick={() => setValue((v) => (v + e).slice(0, MAX_CHARS))}
              aria-label={`Insert ${e}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={() => setShowEmoji((s) => !s)}
          aria-label="Emoji picker"
          aria-pressed={showEmoji}
        >
          <SmilePlusIcon className="size-5" />
        </Button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => {
            setValue(e.target.value.slice(0, MAX_CHARS));
            handleTyping();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void submit();
            }
          }}
          placeholder={disabled ? 'Messaging is blocked' : 'Type a message...'}
          disabled={disabled}
          rows={1}
          className={cn(
            'max-h-40 min-h-[40px] flex-1 resize-none rounded-2xl border bg-muted/30 px-4 py-2.5 text-sm outline-none',
            'focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]'
          )}
          aria-label="Message content"
        />

        <Button
          type="button"
          onClick={() => void submit()}
          disabled={!value.trim() || disabled || sending}
          size="icon"
          className="shrink-0"
          aria-label="Send message"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <SendHorizontalIcon className="size-4" />}
        </Button>
      </div>

      <div className="mt-1 flex justify-end text-[10px] text-muted-foreground">
        <span className={value.length > MAX_CHARS - 100 ? 'text-red-500' : ''}>
          {value.length}/{MAX_CHARS}
        </span>
      </div>
    </div>
  );
};
