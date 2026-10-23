/**
 * Client-side message utilities (spec §lib/messageService).
 * Tagging mirror, formatting, grouping, parsing and validation - pure
 * functions only, so they are safe to unit-test and reuse everywhere.
 */

export const MESSAGE_MAX = 500;
export const PHOTO_MAX_BYTES = 5 * 1024 * 1024;
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

export const PROFESSIONAL_KEYWORDS = [
  '#job', '#interview', '#career', '#offer', '#salary', '#negotiation',
  '#hiring', '#resume', '#referral', '#internship',
];
export const COMMUNITY_KEYWORDS = ['#community', '#nub', '#campus', '#club', '#event', '#project'];

/** Mirror of the server heuristic - used for instant feedback while typing. */
export function classifyMessage(content: string): 'DIRECT' | 'PROFESSIONAL' | 'COMMUNITY' {
  const text = content.toLowerCase();
  if (PROFESSIONAL_KEYWORDS.some((k) => text.includes(k))) return 'PROFESSIONAL';
  if (COMMUNITY_KEYWORDS.some((k) => text.includes(k))) return 'COMMUNITY';
  return 'DIRECT';
}

export interface SendValidation {
  ok: boolean;
  error?: string;
}

/** Validate a draft before sending (spec §ERROR HANDLING). */
export function validateMessage(content: string, photoUrl?: string | null): SendValidation {
  const text = content.trim();
  if (!text && !photoUrl) return { ok: false, error: 'Message cannot be empty' };
  if (text.length > MESSAGE_MAX) return { ok: false, error: `Max ${MESSAGE_MAX} characters` };
  return { ok: true };
}

export function validatePhoto(file: File): SendValidation {
  if (!PHOTO_TYPES.includes(file.type)) return { ok: false, error: 'Only JPG, PNG, WEBP or GIF images' };
  if (file.size > PHOTO_MAX_BYTES) return { ok: false, error: 'Photo must be 5MB or smaller' };
  return { ok: true };
}

/** "10:30" / "Yesterday" / "Sep 5" for a message timestamp. */
export function formatMessageTime(value: string | Date): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const now = new Date();
  const sameDay = date.toDateString() === now.toDateString();
  if (sameDay) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** Conversation-list relative time: "now", "5m", "2h", "3d", date. */
export function timeAgo(value: string | Date | null | undefined): string {
  if (!value) return '';
  const t = new Date(value).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'now';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d`;
  return new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/** "Active 2h ago" / "Online" (spec §OnlineStatus). */
export function lastActiveLabel(isOnline: boolean, lastSeenAt: string | Date | null | undefined): string {
  if (isOnline) return 'Online';
  if (!lastSeenAt) return 'Offline';
  const t = new Date(lastSeenAt).getTime();
  if (Number.isNaN(t)) return 'Offline';
  const diff = Math.max(0, Date.now() - t);
  const m = Math.floor(diff / 60_000);
  if (m < 2) return 'Active just now';
  if (m < 60) return `Active ${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Active ${h}h ago`;
  const d = Math.floor(h / 24);
  return `Active ${d}d ago`;
}

export interface DateGroup {
  label: string;
  messages: any[];
}

/** Group chronological messages under "Today" / "Yesterday" / date headers. */
export function groupByDate(messages: any[]): DateGroup[] {
  const groups: DateGroup[] = [];
  let current: DateGroup | null = null;
  for (const m of messages) {
    const d = new Date(m.createdAt ?? 0);
    const label =
      d.toDateString() === new Date().toDateString()
        ? 'Today'
        : (() => {
            const y = new Date();
            y.setDate(y.getDate() - 1);
            return d.toDateString() === y.toDateString()
              ? 'Yesterday'
              : d.toLocaleDateString([], { month: 'long', day: 'numeric', year: 'numeric' });
          })();
    if (!current || current.label !== label) {
      current = { label, messages: [] };
      groups.push(current);
    }
    current.messages.push(m);
  }
  return groups;
}

export type ContentSegment =
  | { type: 'text'; value: string }
  | { type: 'mention'; value: string }
  | { type: 'hashtag'; value: string }
  | { type: 'url'; value: string };

/**
 * Split message text into renderable segments (links, #tags, @mentions).
 * URLs/mentions are rendered as interactive elements WITHOUT wrapping an
 * <a> inside another <a> (the old hydration bug).
 */
export function parseContent(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  const re = /(https?:\/\/[^\s]+)|(@[A-Za-z0-9_]+)|(#[A-Za-z0-9_]+)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(content))) {
    if (match.index > last) segments.push({ type: 'text', value: content.slice(last, match.index) });
    if (match[1]) segments.push({ type: 'url', value: match[1] });
    else if (match[2]) segments.push({ type: 'mention', value: match[2] });
    else if (match[3]) segments.push({ type: 'hashtag', value: match[3] });
    last = match.index + match[0].length;
  }
  if (last < content.length) segments.push({ type: 'text', value: content.slice(last) });
  return segments;
}

/** First URL found in the draft - drives the paste-preview chip. */
export function extractUrl(content: string): string | null {
  return content.match(/https?:\/\/[^\s]+/)?.[0] ?? null;
}

/** Short two-digit-ish counter label: "0/500". */
export function charCounter(length: number): string {
  return `${length}/${MESSAGE_MAX}`;
}
