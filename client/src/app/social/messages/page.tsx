'use client';

import { MessagesSquareIcon } from 'lucide-react';

/**
 * /social/messages — the list lives in the section layout; this pane shows
 * the "pick a conversation" empty state (desktop only; hidden on mobile).
 */
export default function SocialMessagesHome() {
  return (
    <div className="flex h-full min-h-[50vh] flex-col items-center justify-center gap-3 p-8 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted">
        <MessagesSquareIcon className="size-6 text-muted-foreground" />
      </span>
      <div>
        <p className="text-base font-semibold">Select a conversation</p>
        <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
          Pick someone from the list to start chatting — messages arrive instantly, with typing
          indicators and read receipts.
        </p>
      </div>
    </div>
  );
}
