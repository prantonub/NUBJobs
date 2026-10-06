'use client';

import { FC, Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { ArrowLeftIcon, SendHorizontalIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import api from '@/lib/axios';
import { useSendMessage } from '@/hooks/useMessages';
import { SearchBar } from '@/components/messages/SearchBar';

interface UserHit {
  id: string;
  name: string;
  email?: string;
  role?: string;
  photo?: string | null;
}

/**
 * /messages/new — start a new conversation (spec §FRONTEND PAGE 2).
 * Recipient auto-complete + optional job context (pre-filled from ?job=) +
 * message preview, then hands off to /messages?user=<id>.
 */
const NewMessagePage: FC = () => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedJob = searchParams.get('job');

  const [query, setQuery] = useState('');
  const [recipient, setRecipient] = useState<UserHit | null>(null);
  const [jobId, setJobId] = useState(preselectedJob ?? '');
  const [preview, setPreview] = useState('');
  const [hits, setHits] = useState<UserHit[]>([]);
  const [searching, setSearching] = useState(false);

  const sendMutation = useSendMessage(recipient?.id ?? null, jobId || undefined);

  // Debounced recipient auto-complete against GET /messages/recipients.
  const searchUsers = async (q: string) => {
    setQuery(q);
    setRecipient(null);
    if (q.trim().length < 2) {
      setHits([]);
      return;
    }
    setSearching(true);
    try {
      const { data } = await api.get('/messages/recipients', { params: { q } });
      setHits((data.data?.recipients ?? []) as UserHit[]);
    } catch {
      setHits([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSend = async () => {
    if (!recipient) {
      toast.error('Choose who to message');
      return;
    }
    const content = preview.trim();
    if (!content) {
      toast.error('Write a message first');
      return;
    }
    try {
      await sendMutation.mutateAsync({ content });
      toast.success('Message sent');
      router.push(`/messages?user=${recipient.id}`);
    } catch (error: any) {
      toast.error(error?.response?.data?.message ?? 'Failed to send message');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link href="/messages">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">New Message</h1>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm text-muted-foreground">Recipient</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Recipient selector */}
          {!recipient ? (
            <div className="relative">
              <SearchBar value={query} onChange={(v) => void searchUsers(v)} placeholder="Search for recipient..." />
              {searching && (
                <div className="mt-2 space-y-2">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              )}
              {hits.length > 0 && !searching && (
                <ul className="mt-2 divide-y overflow-hidden rounded-lg border">
                  {hits.map((u) => (
                    <li key={u.id}>
                      <button
                        type="button"
                        className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-muted/50"
                        onClick={() => {
                          setRecipient(u);
                          setHits([]);
                          setQuery(u.name);
                        }}
                      >
                        <Avatar className="size-8">
                          {u.photo && <AvatarImage src={u.photo} alt={u.name} />}
                          <AvatarFallback>{u.name.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-medium">{u.name}</span>
                          <span className="block truncate text-xs text-muted-foreground">{u.email}</span>
                        </span>
                        <Badge variant="secondary" className="text-[10px]">
                          {u.role === 'EMPLOYER' ? 'Employer' : u.role === 'STUDENT' ? 'Student' : u.role}
                        </Badge>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-lg border bg-muted/30 px-3 py-2">
              <Avatar className="size-8">
                {recipient.photo && <AvatarImage src={recipient.photo} alt={recipient.name} />}
                <AvatarFallback>{recipient.name.charAt(0).toUpperCase()}</AvatarFallback>
              </Avatar>
              <span className="flex-1 text-sm font-medium">{recipient.name}</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setRecipient(null);
                  setQuery('');
                }}
              >
                Change
              </Button>
            </div>
          )}

          {/* Optional job link */}
          <div>
            <label htmlFor="job-context" className="mb-1 block text-sm text-muted-foreground">
              Link to a job (optional)
            </label>
            <Input
              id="job-context"
              value={jobId}
              onChange={(e) => setJobId(e.target.value)}
              placeholder="Paste job id or leave blank"
            />
          </div>

          {/* Preview + send */}
          <div>
            <label htmlFor="preview" className="mb-1 block text-sm text-muted-foreground">
              Message
            </label>
            <Textarea
              id="preview"
              value={preview}
              onChange={(e) => setPreview(e.target.value.slice(0, 5000))}
              placeholder="Type message preview..."
              rows={4}
            />
            <p className="mt-1 text-right text-[10px] text-muted-foreground">{preview.length}/5000</p>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" asChild>
              <Link href="/messages">Cancel</Link>
            </Button>
            <Button onClick={() => void handleSend()} disabled={!recipient || !preview.trim() || sendMutation.isPending}>
              <SendHorizontalIcon className="mr-1 size-4" />
              Send
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default function NewMessagePageWrapper() {
  return (
    <Suspense fallback={<div className="flex h-64 items-center justify-center text-sm text-muted-foreground">Loading…</div>}>
      <NewMessagePage />
    </Suspense>
  );
}

