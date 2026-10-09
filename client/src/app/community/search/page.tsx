'use client';

import { PostCard } from '@/components/social/PostCard';
import { SocialNav, SocialShell } from '@/components/social/SocialNav';
import { UserCard } from '@/components/social/SocialUsers';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchPosts, useSearchUsers } from '@/hooks/useSocial';
import { Suspense, useState } from 'react';

function SearchBody() {
  const [q, setQ] = useState('');
  const [submitted, setSubmitted] = useState('');
  const postsQ = useSearchPosts(submitted, undefined, 1, Boolean(submitted));
  const usersQ = useSearchUsers(submitted, 1, Boolean(submitted));

  const posts: any[] = (postsQ.data as any)?.posts ?? [];
  const users: any[] = (usersQ.data as any)?.users ?? [];

  return (
    <SocialShell>
      <SocialNav title="Search" subtitle="Search posts and people across the network." />
      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          setSubmitted(q.trim());
        }}
      >
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search posts, #hashtags or people…"
          aria-label="Search"
        />
        <Button type="submit">Search</Button>
      </form>

      {!submitted ? (
        <p className="text-sm text-muted-foreground">
          Tip: prefix a word with # to search hashtags (e.g. #InterviewTips).
        </p>
      ) : (
        <div className="space-y-6">
          <section>
            <h2 className="mb-2 text-sm font-semibold">People</h2>
            {usersQ.isLoading ? (
              <Skeleton className="h-20 w-full" />
            ) : users.length === 0 ? (
              <p className="text-sm text-muted-foreground">No people found.</p>
            ) : (
              <div className="space-y-2">
                {users.map((u) => (
                  <UserCard key={u.id} user={u} />
                ))}
              </div>
            )}
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold">Posts</h2>
            {postsQ.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : posts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No posts found.</p>
            ) : (
              <div className="space-y-3">
                {posts.map((p) => (
                  <PostCard key={p.id} post={p} />
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </SocialShell>
  );
}

/** /community/search — search posts & users. */
export default function SearchPage() {
  return (
    <Suspense fallback={<Skeleton className="h-40 w-full" />}>
      <SearchBody />
    </Suspense>
  );
}
