'use client';

/** Animated "…is typing" row shown under the last message (spec §TypingIndicator). */
export function TypingIndicator({ name }: { name: string | null }) {
  if (!name) return null;
  return (
    <div className="flex items-center gap-2 px-1 text-xs text-muted-foreground" aria-live="polite">
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="inline-block h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground/60"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </span>
      <span className="italic">{name} is typing…</span>
    </div>
  );
}
