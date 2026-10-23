import React from 'react';

/** "2h", "3d" style timestamps (spec: timestamp on each item). */
export function timeAgo(date: string | Date): string {
  const seconds = Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo`;
  return `${Math.floor(months / 12)}y`;
}

/** Render post/comment content with #hashtags, @mentions and links made clickable. */
export function renderRichContent(content: string, basePath = '/social'): React.ReactNode {
  // Inline anchors may sit inside a click-to-open post wrapper (PostCard div) -
  // stopping propagation keeps THEIR navigation (not the wrapper's post route).
  // Inert where no click wrapper exists (comments, legacy pages).
  const stop = (e: React.MouseEvent) => e.stopPropagation();
  const parts = String(content ?? '').split(/(\s+)/);
  return parts.map((part, i) => {
    const tag = part.match(/^#([A-Za-z0-9_]+)([.,!?;:]*)$/);
    if (tag) {
      return (
        <React.Fragment key={i}>
          <a
            href={`${basePath}/explore?tag=${tag[1].toLowerCase()}`}
            className="font-medium text-primary hover:underline"
            onClick={stop}
          >
            #{tag[1]}
          </a>
          {tag[2]}
        </React.Fragment>
      );
    }
    const mention = part.match(/^@([A-Za-z0-9_]+)([.,!?;:]*)$/);
    if (mention) {
      return (
        <React.Fragment key={i}>
          <a
            href={`${basePath}/profile/${mention[1].toLowerCase()}`}
            className="font-medium text-primary hover:underline"
            onClick={stop}
          >
            @{mention[1]}
          </a>
          {mention[2]}
        </React.Fragment>
      );
    }
    if (/^https?:\/\/[^\s]+$/.test(part)) {
      return (
        <a
          key={i}
          href={part}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
          onClick={stop}
        >
          {part}
        </a>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}
