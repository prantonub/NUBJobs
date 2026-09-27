'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TimelineStep {
  key: string;
  label: string;
  reached: boolean;
  at: string | null;
  current: boolean;
}

/**
 * Horizontal-free vertical status timeline shared by the student and employer
 * application detail pages (steps come from `buildApplicationTimeline()` on the
 * server, so both sides always show the same history).
 */
export function StatusTimeline({ steps }: { steps: TimelineStep[] }) {
  if (!steps?.length) return null;

  return (
    <ol className="space-y-3">
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;
        return (
          <li key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <span
                className={cn(
                  'flex size-6 shrink-0 items-center justify-center rounded-full border text-[10px] font-semibold',
                  step.reached
                    ? 'border-emerald-500 bg-emerald-500 text-white'
                    : 'border-border bg-muted text-muted-foreground',
                  step.current && 'ring-2 ring-emerald-500/40'
                )}
              >
                {step.reached ? <Check className="size-3.5" /> : index + 1}
              </span>
              {!isLast && (
                <span
                  className={cn(
                    'mt-1 w-px flex-1',
                    step.reached ? 'bg-emerald-500/60' : 'bg-border'
                  )}
                />
              )}
            </div>

            <div className="pb-1">
              <p className={cn('text-sm font-medium', !step.reached && 'text-muted-foreground')}>
                {step.label}
                {step.current ? <span className="ml-2 text-xs text-emerald-600">• current</span> : null}
              </p>
              <p className="text-xs text-muted-foreground">
                {step.at
                  ? new Date(step.at).toLocaleDateString(undefined, {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })
                  : 'Pending'}
              </p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default StatusTimeline;
