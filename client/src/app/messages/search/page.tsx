'use client';

import { FC, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeftIcon, SearchIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchMessages } from '@/hooks/useMessages';
import { SearchBar } from '@/components/messages/SearchBar';

/**
 * /messages/search — search message history (spec §FRONTEND PAGE 3).
 * Filters: keyword, sender (all/specific is implicit via conversation),
 * date range, unread-only. Clicking a hit opens the thread at that message.
 */
const SearchMessagesPage: FC = () => {
  const router = useRouter();
  const [keyword, setKeyword] = useState('');
  const [submitted, setSubmitted] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [unreadOnly, setUnreadOnly] = useState(false);

  const { data, isLoading } = useSearchMessages({
    keyword: submitted || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
    unreadOnly: unreadOnly || undefined,
  });

  const submit = () => setSubmitted(keyword.trim());

  const highlight = (content: string | null, term: string) => {
    if (!content) return null;
    if (!term) return content;
    const idx = content.toLowerCase().indexOf(term.toLowerCase());
    if (idx === -1) return content;
    return (
      <>
        {content.slice(0, idx)}
        <mark className="bg-yellow-200 text-black">{content.slice(idx, idx + term.length)}</mark>
        {content.slice(idx + term.length)}
      </>
    );
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center gap-3">
        <Button variant="ghost" size="icon" asChild aria-label="Back">
          <Link href="/messages">
            <ArrowLeftIcon className="size-4" />
          </Link>
        </Button>
        <h1 className="text-xl font-semibold">Search Messages</h1>
      </div>

      <Card className="mb-4">
        <CardContent className="space-y-3 pt-6">
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              submit();
            }}
          >
            <SearchBar value={keyword} onChange={setKeyword} placeholder="Search keyword..." className="flex-1" />
            <Button type="submit" disabled={!keyword.trim()}>
              <SearchIcon className="mr-1 size-4" /> Search
            </Button>
          </form>

          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="date-from" className="mb-1 block text-xs text-muted-foreground">
                From
              </label>
              <Input id="date-from" type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-40" />
            </div>
            <div>
              <label htmlFor="date-to" className="mb-1 block text-xs text-muted-foreground">
                To
              </label>
              <Input id="date-to" type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-40" />
            </div>
            <label className="flex cursor-pointer items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={unreadOnly}
                onChange={(e) => setUnreadOnly(e.target.checked)}
                className="size-4"
              />
              Unread only
            </label>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-20" />
          ))}
        </div>
      ) : !submitted && !dateFrom ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          Enter a keyword or date range to search your messages.
        </p>
      ) : (data?.messages?.length ?? 0) === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">No messages match your search.</p>
      ) : (
        <ul className="space-y-2">
          {data!.messages.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => m.otherUserId && router.push(`/messages?user=${m.otherUserId}`)}
                className="w-full rounded-lg border p-3 text-left transition-colors hover:bg-muted/50"
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span className="text-sm font-medium">{m.otherUserName ?? m.senderName ?? 'Unknown'}</span>
                  <span className="flex items-center gap-2">
                    {!m.isRead && <Badge className="bg-blue-600 text-[10px]">Unread</Badge>}
                    <span className="text-xs text-muted-foreground">
                      {new Date(m.timestamp).toLocaleString()}
                    </span>
                  </span>
                </div>
                <p className="line-clamp-2 text-sm text-muted-foreground">
                  {highlight(m.content, submitted)}
                </p>
              </button>
            </li>
          ))}
        </ul>
      )}

      {data && data.pagination.total > data.messages.length && (
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Showing {data.messages.length} of {data.pagination.total} results
        </p>
      )}
    </div>
  );
};

export default SearchMessagesPage;
