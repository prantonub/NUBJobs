'use client';

import { Card } from '@/components/ui/card';

/** Loading placeholder mirroring the JobCard layout so nothing shifts on load. */
const JobCardSkeleton = () => {
  return (
    <Card className="animate-pulse gap-0 p-0" aria-hidden="true">
      {/* Employer row */}
      <div className="flex items-start gap-3 px-5 pt-5">
        <div className="size-12 shrink-0 rounded-lg bg-muted-foreground/15" />
        <div className="min-w-0 flex-1 space-y-2 pt-0.5">
          <div className="h-4 w-2/3 rounded bg-muted-foreground/15" />
          <div className="h-3 w-1/3 rounded bg-muted-foreground/15" />
        </div>
        <div className="size-7 shrink-0 rounded-full bg-muted-foreground/15" />
      </div>

      {/* Title, meta and description */}
      <div className="flex flex-1 flex-col space-y-2.5 px-5 pt-4">
        <div className="h-5 w-4/5 rounded bg-muted-foreground/15" />
        <div className="h-4 w-1/2 rounded bg-muted-foreground/15" />
        <div className="h-4 w-full rounded bg-muted-foreground/15" />
        <div className="h-4 w-2/3 rounded bg-muted-foreground/15" />
      </div>

      {/* Skill chips */}
      <div className="mt-3 flex gap-1.5 px-5">
        <div className="h-6 w-16 rounded-full bg-muted-foreground/15" />
        <div className="h-6 w-20 rounded-full bg-muted-foreground/15" />
        <div className="h-6 w-14 rounded-full bg-muted-foreground/15" />
      </div>

      {/* Location, salary and deadline */}
      <div className="mt-auto space-y-2 px-5 pb-4 pt-4">
        <div className="border-t border-border pt-3.5">
          <div className="h-4 w-2/5 rounded bg-muted-foreground/15" />
        </div>
        <div className="h-4 w-1/2 rounded bg-muted-foreground/15" />
        <div className="h-4 w-1/3 rounded bg-muted-foreground/15" />
      </div>

      {/* Bottom action */}
      <div className="flex items-center gap-3 border-t border-border bg-muted/40 px-5 py-3">
        <div className="h-3.5 w-20 rounded bg-muted-foreground/15" />
        <div className="ml-auto h-4 w-24 rounded bg-muted-foreground/15" />
      </div>
    </Card>
  );
};

export default JobCardSkeleton;