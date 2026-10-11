import { getSocket } from '@/lib/socket-client';

/**
 * Socket.io message events (spec §lib/socketHandlers).
 *
 * Server event names (stable, shared with the dashboard inbox):
 *   new_message · message_read · message_deleted · message_updated ·
 *   message_reaction · conversation:update · typing_indicator · stop_typing ·
 *   user_online · user_offline · notification
 *
 * Every subscribe returns an unsubscribe — always call it in an effect
 * cleanup so no handler leaks across navigations.
 */
export const MESSAGE_EVENTS = {
  newMessage: 'new_message',
  messageRead: 'message_read',
  messageDeleted: 'message_deleted',
  messageUpdated: 'message_updated',
  messageReaction: 'message_reaction',
  conversationUpdate: 'conversation:update',
  typingStart: 'typing_indicator',
  typingStop: 'stop_typing',
  userOnline: 'user_online',
  userOffline: 'user_offline',
  notification: 'notification',
  messageError: 'message_error',
} as const;

type Handler = (payload: any) => void;

/** Subscribe to one event; safe when the socket is not connected yet. */
export function subscribe(event: string, handler: Handler): () => void {
  const socket = getSocket();
  if (!socket) return () => undefined;
  socket.on(event, handler as any);
  return () => {
    socket.off(event, handler as any);
  };
}

/** Subscribe to several events with one handler; returns one cleanup. */
export function subscribeAll(events: string[], handler: Handler): () => void {
  const unsubs = events.map((e) => subscribe(e, handler));
  return () => unsubs.forEach((u) => u());
}

/** Emit typing start/stop for the direct-messaging inbox. */
export function emitTyping(recipientId: string, typing: boolean): void {
  const socket = getSocket();
  if (!socket?.connected) return;
  socket.emit(typing ? 'typing_start' : 'typing_stop', { recipientId });
}

/**
 * Sound + desktop notification for an incoming message (spec §NOTIFICATIONS).
 * Both honour the user's saved preferences; desktop needs permission.
 */
export function notifyIncoming(opts: {
  title: string;
  body: string;
  sound: boolean;
  desktop: boolean;
}): void {
  if (opts.sound) playMessageSound();
  if (
    opts.desktop &&
    typeof document !== 'undefined' &&
    document.hidden &&
    typeof Notification !== 'undefined' &&
    Notification.permission === 'granted'
  ) {
    try {
      new Notification(opts.title, { body: opts.body, tag: 'nubjobs-message' });
    } catch {
      /* notification failures must never break the chat */
    }
  }
}

let audioCtx: AudioContext | null = null;

/** Two-tone "ding" via WebAudio — no asset needed, works on mobile too. */
export function playMessageSound(): void {
  try {
    const Ctx = window.AudioContext ?? (window as any).webkitAudioContext;
    if (!Ctx) return;
    audioCtx = audioCtx ?? new Ctx();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') void ctx.resume();
    const now = ctx.currentTime;
    [880, 1174.66].forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.0001, now + i * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.15, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.22);
      osc.connect(gain).connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.25);
    });
  } catch {
    /* autoplay restrictions — ignore */
  }
}
