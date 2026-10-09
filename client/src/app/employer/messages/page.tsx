'use client';

import { type FC, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useQueryClient } from '@tanstack/react-query';
import { MessageSquareIcon, SearchIcon, SendIcon } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import {
  useEmployerMessageThread,
  useEmployerMessages,
  useSendEmployerMessage,
} from '@/hooks/useEmployer';
import { ensureMessagingSocket } from '@/hooks/useMessages';
import { cn, getErrorMessage, getInitials } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

const formatTime = (value: string | Date) =>
  new Date(value).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

/**
 * /employer/messages — spec layout: conversation sidebar (search, timestamps,
 * unread badges) + chat window (own messages right/blue, student left/gray).
 * Real-time: incoming `new_message` socket events refresh the open thread.
 */
const EmployerMessagesPage: FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: conversations = [], isLoading } = useEmployerMessages();
  const [selected, setSelected] = useState<string | null>(null);
  const { data: thread, isLoading: threadLoading } = useEmployerMessageThread(selected);
  const sendMessage = useSendEmployerMessage();

  const [search, setSearch] = useState('');
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement | null>(null);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    if (!needle) return conversations;
    return conversations.filter((conversation: any) =>
      (conversation.studentName ?? '').toLowerCase().includes(needle)
    );
  }, [conversations, search]);

  // Open the most recent conversation by default.
  useEffect(() => {
    if (!selected && filtered.length > 0) setSelected(filtered[0].studentId);
  }, [filtered, selected]);

  // Real-time delivery while this page is open. After a hard refresh no socket
  // exists yet (AuthContext only dials one on login) — dial it here or these
  // handlers would silently never register.
  useEffect(() => {
    const socket = ensureMessagingSocket();
    if (!socket) return undefined;
    const onNewMessage = () => {
      queryClient.invalidateQueries({ queryKey: ['employerMessages'] });
      if (selected) {
        queryClient.invalidateQueries({ queryKey: ['employerMessageThread', selected] });
      }
    };
    socket.on('new_message', onNewMessage);
    return () => {
      socket.off('new_message', onNewMessage);
    };
  }, [queryClient, selected]);

  // Opening (or refreshing) the thread marks the student's messages read
  // server-side — reflect that in the nav pill, unified-inbox rows and this
  // sidebar's own unread badges right away instead of waiting for a refresh.
  useEffect(() => {
    if (!thread) return;
    queryClient.invalidateQueries({ queryKey: ['unreadMessageCount'] });
    queryClient.invalidateQueries({ queryKey: ['conversations'] });
    queryClient.invalidateQueries({ queryKey: ['employerMessages'] });
  }, [thread, queryClient]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [thread?.messages?.length, selected]);

  const handleSend = async () => {
    const message = text.trim();
    if (!selected || !message) return;
    try {
      await sendMessage.mutateAsync({ studentId: selected, message });
      setText('');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to send message'));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Messages</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Conversations with students who applied to your jobs.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
        {/* ── Conversation list ─────────────────────────────────────────── */}
        <Card className="flex h-[600px] flex-col overflow-hidden p-0">
          <div className="border-b p-3">
            <div className="relative">
              <SearchIcon className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search conversations..."
                className="pl-8"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {isLoading ? (
              <p className="p-4 text-sm text-muted-foreground">Loading conversations…</p>
            ) : filtered.length === 0 ? (
              <p className="p-4 text-sm text-muted-foreground">No conversations yet.</p>
            ) : (
              filtered.map((conversation: any) => (
                <button
                  key={conversation.studentId}
                  type="button"
                  onClick={() => setSelected(conversation.studentId)}
                  className={cn(
                    'flex w-full items-start gap-3 border-b px-3 py-3 text-left transition-colors hover:bg-muted',
                    selected === conversation.studentId && 'bg-muted'
                  )}
                >
                  <Avatar size="sm">
                    {conversation.studentPhoto ? (
                      <AvatarImage
                        src={conversation.studentPhoto}
                        alt={conversation.studentName ?? 'Student'}
                      />
                    ) : null}
                    <AvatarFallback>
                      {getInitials(conversation.studentName ?? 'Student')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-2">
                      <p className="truncate text-sm font-medium">{conversation.studentName}</p>
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {conversation.lastMessageTime
                          ? formatTime(conversation.lastMessageTime)
                          : ''}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {conversation.lastMessage ?? 'No messages yet'}
                    </p>
                    <p className="truncate text-[10px] text-primary">{conversation.jobTitle}</p>
                  </div>
                  {conversation.unreadCount > 0 ? (
                    <Badge className="shrink-0">{conversation.unreadCount}</Badge>
                  ) : null}
                </button>
              ))
            )}
          </div>
        </Card>

        {/* ── Chat window ──────────────────────────────────────────────── */}
        <Card className="flex h-[600px] flex-col overflow-hidden p-0">
          {!selected ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquareIcon className="size-8" />
              <p className="text-sm">Select a conversation to start messaging.</p>
            </div>
          ) : (
            <>
              <header className="flex items-center justify-between gap-3 border-b px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">
                    {thread?.studentProfile?.user?.name ?? 'Student'}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {thread?.jobTitle ? `Regarding: ${thread.jobTitle}` : ''}
                  </p>
                </div>
                <Button variant="outline" size="sm" asChild>
                  <Link href={`/employer/applications/${thread?.applicationId ?? ''}`}>
                    View Application
                  </Link>
                </Button>
              </header>

              <div className="flex-1 space-y-3 overflow-y-auto p-4">
                {threadLoading ? (
                  <p className="text-sm text-muted-foreground">Loading messages…</p>
                ) : (thread?.messages ?? []).length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No messages yet — say hello!
                  </p>
                ) : (
                  (thread?.messages ?? []).map((message: any) => {
                    const own = message.senderId === user?.id;
                    return (
                      <div
                        key={message.id}
                        className={cn('flex', own ? 'justify-end' : 'justify-start')}
                      >
                        <div
                          className={cn(
                            'max-w-[75%] rounded-2xl px-3 py-2 text-sm',
                            own ? 'bg-blue-600 text-white' : 'bg-muted text-foreground'
                          )}
                        >
                          <p className="whitespace-pre-wrap break-words">{message.content}</p>
                          <p
                            className={cn(
                              'mt-1 text-right text-[10px]',
                              own ? 'text-blue-100' : 'text-muted-foreground'
                            )}
                          >
                            {formatTime(message.createdAt)}
                          </p>
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={bottomRef} />
              </div>

              <footer className="flex gap-2 border-t p-3">
                <Input
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && !event.shiftKey) {
                      event.preventDefault();
                      void handleSend();
                    }
                  }}
                  placeholder="Type message..."
                />
                <Button
                  onClick={() => void handleSend()}
                  disabled={sendMessage.isPending || !text.trim()}
                >
                  <SendIcon className="mr-2 size-4" />
                  Send
                </Button>
              </footer>
            </>
          )}
        </Card>
      </div>
    </div>
  );
};

export default EmployerMessagesPage;
