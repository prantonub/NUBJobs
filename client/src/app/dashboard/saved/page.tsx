'use client';

import Link from 'next/link';
import { BookmarkIcon, MapPinIcon } from 'lucide-react';
import { useSavedJobs } from '@/hooks/useJobs-enhanced';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export default function SavedJobsPage() {
  const { data, isLoading, isError } = useSavedJobs();
  const savedJobs = Array.isArray(data) ? data : data?.data ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">Saved jobs</h1>
        <p className="mt-1 text-sm text-muted-foreground">Keep interesting opportunities here while you compare them.</p>
      </div>
      {isLoading ? <Card className="p-8 text-center text-muted-foreground">Loading saved jobs...</Card> : null}
      {isError ? <Card className="p-8 text-center text-muted-foreground">Saved jobs are unavailable right now. Try again shortly.</Card> : null}
      {!isLoading && !isError && savedJobs.length === 0 ? (
        <Card className="p-10 text-center">
          <BookmarkIcon className="mx-auto mb-3 size-8 text-muted-foreground" />
          <h2 className="font-semibold">No saved jobs yet</h2>
          <p className="mt-1 text-sm text-muted-foreground">Save a job from the jobs page and it will appear here.</p>
          <Button asChild className="mt-5"><Link href="/jobs">Browse jobs</Link></Button>
        </Card>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2">
        {savedJobs.map((saved: any) => {
          const job = saved.job ?? saved;
          return (
            <Card key={saved.id ?? job.id} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-semibold">{job.title}</h2>
                  <p className="text-sm text-muted-foreground">{job.employer?.companyName ?? 'Company'}</p>
                </div>
                <Badge variant="secondary">{job.type?.replace('_', ' ') ?? 'Opportunity'}</Badge>
              </div>
              <p className="mt-3 flex items-center gap-1 text-sm text-muted-foreground"><MapPinIcon className="size-4" />{job.location ?? 'Location flexible'}</p>
              <Button asChild variant="outline" className="mt-5"><Link href={`/jobs/${job.id}`}>View job</Link></Button>
            </Card>
          );
        })}
      </div>
    </div>
  );
}