'use client';

import { type FC } from 'react';
import Link from 'next/link';
import { GripVertical, User } from 'lucide-react';
import { ApplicationStatusBadge, type ApplicationStatus } from '@/components/ui/ApplicationStatusBadge';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export interface ApplicationCardData {
  id: string;
  status: string;
  matchScore: number;
  createdAt?: string;
  appliedAt?: string;
  student?: {
    cgpa?: number | null;
    skills?: string[] | null;
    photoUrl?: string | null;
    user?: { name?: string } | null;
  } | null;
  job?: { title?: string } | null;
}

export interface ApplicationCardProps {
  application: ApplicationCardData;
  /** dnd-kit handle props; omit outside the kanban board. */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;
  isDragging?: boolean;
  className?: string;
}

/**
 * Candidate card for the pipeline board. Shows name, job, match %, CGPA,
 * skills, applied date and the status badge; the grip is the drag handle.
 */
export const ApplicationCard: FC<ApplicationCardProps> = ({
  application,
  dragHandleProps,
  isDragging = false,
  className,
}) => {
  const skills = (application.student?.skills ?? []).slice(0, 3);
  const appliedAt = application.appliedAt ?? application.createdAt;

  return (
    <div
      className={cn(
        'rounded-lg border bg-background p-3 transition-shadow',
        isDragging ? 'opacity-50' : 'hover:shadow-md',
        className
      )}
    >
      <div className="flex items-start gap-2">
        <div
          {...dragHandleProps}
          className="mt-0.5 cursor-move text-muted-foreground"
          aria-label="Drag to change status"
        >
          <GripVertical className="size-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {application.student?.user?.name ?? 'Candidate'}
              </p>
              <p className="truncate text-xs text-muted-foreground">
                {application.job?.title ?? '—'}
              </p>
            </div>
            {application.student?.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={application.student.photoUrl}
                alt={application.student?.user?.name ?? 'Candidate'}
                className="size-8 shrink-0 rounded-full object-cover"
              />
            ) : (
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted">
                <User className="size-4 text-muted-foreground" />
              </span>
            )}
          </div>

          <div className="mt-2 flex items-center gap-2 text-xs">
            <span className="font-semibold">{application.matchScore}%</span>
            <span className="text-muted-foreground">
              CGPA {application.student?.cgpa ?? '—'}
            </span>
          </div>

          {skills.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {skills.map((skill) => (
                <Badge key={skill} variant="secondary" className="text-[10px]">
                  {skill}
                </Badge>
              ))}
            </div>
          )}

          <div className="mt-2 flex items-center justify-between gap-2">
            <span className="text-[10px] text-muted-foreground">
              {appliedAt ? new Date(appliedAt).toLocaleDateString() : ''}
            </span>
            <ApplicationStatusBadge status={application.status as ApplicationStatus} />
          </div>

          <Button asChild size="sm" variant="outline" className="mt-2 w-full text-xs">
            <Link href={`/employer/applications/${application.id}`}>View details</Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default ApplicationCard;