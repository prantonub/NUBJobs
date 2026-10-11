/**
 * Message auto-tagging (spec §5 PROFESSIONAL/COMMUNITY FILTERING) and the
 * per-user send quota (spec §SECURITY: 10/min + 100/hour).
 *
 * Pure helpers — safe to import from both the HTTP controller and the
 * Socket.io server without creating import cycles.
 */

// ── Auto-tagging ─────────────────────────────────────────────────────────────

const PROFESSIONAL_KEYWORDS = [
  'job', 'jobs', 'hiring', 'interview', 'offer', 'salary', 'career', 'resume',
  'cv', 'recruiter', 'position', 'negotiate', 'workplace', 'referral',
  'internship', 'onboarding', 'promotion', 'applied', 'application',
  'company', 'manager', 'office', 'deadline',
];

const COMMUNITY_KEYWORDS = [
  'community', 'campus', 'nub', 'club', 'event', 'meetup', 'workshop',
  'study', 'group', 'project', 'class', 'course', 'seminar', 'volunteer',
];

export type MessageTag = {
  messageType: 'DIRECT' | 'PROFESSIONAL' | 'COMMUNITY';
  isProfessional: boolean;
  isCommunity: boolean;
  tags: string[];
};

/**
 * Classify a message from its content. Manual input always wins:
 * an explicit `messageType` (PROFESSIONAL/COMMUNITY) or explicit `tags`
 * from the sender overrides the keyword heuristic.
 */
export function classifyMessage(
  content: string,
  opts: { messageType?: string; tags?: string[] } = {}
): MessageTag {
  const text = (content ?? '').toLowerCase();

  // Hashtags are always collected (max 5) — they feed the tag filters.
  const hashtagTags = Array.from(
    new Set((content.match(/#([A-Za-z0-9_]+)/g) ?? []).map((t) => t.slice(1).toLowerCase()))
  ).slice(0, 5);

  const explicitTags = (opts.tags ?? [])
    .map((t) => String(t).trim().replace(/^#/, '').toLowerCase())
    .filter(Boolean)
    .slice(0, 10);
  const tags = Array.from(new Set([...explicitTags, ...hashtagTags]));

  const isProfessional = PROFESSIONAL_KEYWORDS.some((k) => text.includes(k));
  const isCommunity = COMMUNITY_KEYWORDS.some((k) => text.includes(k));

  // Explicit choice wins; otherwise professional edges out community on ties.
  const explicit = String(opts.messageType ?? '').toUpperCase();
  let messageType: MessageTag['messageType'];
  if (explicit === 'PROFESSIONAL' || explicit === 'COMMUNITY') messageType = explicit;
  else if (isProfessional) messageType = 'PROFESSIONAL';
  else if (isCommunity) messageType = 'COMMUNITY';
  else messageType = 'DIRECT';

  return {
    messageType,
    isProfessional: messageType === 'PROFESSIONAL' || isProfessional,
    isCommunity: messageType === 'COMMUNITY' || isCommunity,
    tags,
  };
}

// ── Rate limiting (in-memory, per user) ──────────────────────────────────────

const MINUTE_WINDOW = 60_000;
const HOUR_WINDOW = 3_600_000;
const MAX_PER_MINUTE = 10;
const MAX_PER_HOUR = 100;

/** userId -> timestamps (asc) of recent sends. */
const sendLog = new Map<string, number[]>();

function prune(times: number[], now: number): number[] {
  const cutoff = now - HOUR_WINDOW;
  let i = 0;
  while (i < times.length && times[i] < cutoff) i++;
  return times.slice(i);
}

/**
 * Record one send attempt. Returns `null` when allowed, otherwise the number
 * of seconds the caller should wait (`retry-after` style message).
 * Windows: max 10 messages/minute and 100/hour per user.
 */
export function consumeMessageQuota(userId: string): number | null {
  const now = Date.now();
  const times = prune(sendLog.get(userId) ?? [], now);

  const lastMinute = times.filter((t) => now - t < MINUTE_WINDOW).length;
  const retryMinute = lastMinute >= MAX_PER_MINUTE ? Math.ceil((times[0] + MINUTE_WINDOW - now) / 1000) : 0;
  if (retryMinute > 0) return retryMinute;

  if (times.length >= MAX_PER_HOUR) {
    return Math.max(1, Math.ceil((times[0] + HOUR_WINDOW - now) / 1000));
  }

  times.push(now);
  sendLog.set(userId, times);

  // Opportunistic cleanup so the map cannot grow unbounded.
  if (sendLog.size > 5_000) {
    for (const [key, value] of sendLog) {
      if (prune(value, now).length === 0) sendLog.delete(key);
    }
  }
  return null;
}
