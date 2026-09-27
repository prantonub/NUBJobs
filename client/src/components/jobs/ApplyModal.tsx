'use client';

import { FC, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApplyJob } from '@/hooks/useApplications';
import { useProfile } from '@/hooks/useProfile';
import { useJobDetail } from '@/hooks/useJobs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner';
import { Check, CircleAlert, Loader2, X } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

const MAX_COVER_LETTER = 500;

export interface ApplyModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  jobId: string;
  jobTitle?: string;
  /** Pass the already-loaded job to skip the extra fetch. */
  job?: { title?: string; skills?: string[] | null; minCgpa?: number | null } | null;
}

interface ChecklistItem {
  skill: string;
  has: boolean;
}

/**
 * Client mirror of `server/src/utils/match.utils.ts` (skills 70% + CGPA 30%),
 * so the score previewed here is exactly the one the API persists.
 */
function buildBreakdown(
  studentSkills: string[],
  cgpa: number | null,
  jobSkills: string[],
  minCgpa: number | null
): { score: number; checklist: ChecklistItem[]; extras: string[]; meetsCgpa: boolean | null } {
  const owned = new Set(studentSkills.map((skill) => skill.trim().toLowerCase()).filter(Boolean));
  const required = (jobSkills ?? []).filter((skill) => String(skill).trim() !== '');

  const checklist: ChecklistItem[] = required.map((skill) => ({
    skill,
    has: owned.has(skill.trim().toLowerCase()),
  }));

  const matched = checklist.filter((item) => item.has).length;
  const skillFit = required.length ? (matched / required.length) * 100 : null;
  const gradeFit =
    minCgpa && minCgpa > 0
      ? cgpa === null
        ? 0
        : cgpa >= minCgpa
          ? 100
          : Math.max(0, Math.round((cgpa / minCgpa) * 100))
      : null;

  let score = 0;
  if (skillFit !== null && gradeFit !== null) score = skillFit * 0.7 + gradeFit * 0.3;
  else if (skillFit !== null) score = skillFit;
  else if (gradeFit !== null) score = gradeFit;

  // Skills the student has that the job does not ask for (nice-to-have extras).
  const extras = studentSkills.filter(
    (skill) =>
      !required.some((requiredSkill) => requiredSkill.trim().toLowerCase() === skill.trim().toLowerCase())
  );

  return {
    score: Math.max(0, Math.min(100, Math.round(score))),
    checklist,
    extras,
    meetsCgpa: minCgpa ? (cgpa ?? 0) >= minCgpa : null,
  };
}

const ApplyModal: FC<ApplyModalProps> = ({ open, onOpenChange, jobId, jobTitle, job: jobProp }) => {
  const router = useRouter();
  const [coverLetter, setCoverLetter] = useState('');

  const applyMutation = useApplyJob();
  const { data: profile } = useProfile();
  // `useJobDetail('')` is disabled, so this only fetches when the caller has no job.
  const { data: fetchedJob } = useJobDetail(jobProp ? '' : jobId);
  const job = jobProp ?? fetchedJob;

  const studentSkills = useMemo(() => (profile?.skills ?? []) as string[], [profile]);
  const cgpa: number | null = profile?.cgpa ?? null;

  const breakdown = useMemo(
    () =>
      buildBreakdown(studentSkills, cgpa, (job?.skills ?? []) as string[], job?.minCgpa ?? null),
    [studentSkills, cgpa, job]
  );

  useEffect(() => {
    if (!open) setCoverLetter('');
  }, [open]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      await applyMutation.mutateAsync({ jobId, coverLetter: coverLetter.trim() || undefined });
      toast.success('Application submitted');
      onOpenChange(false);
      router.push('/dashboard/applications');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit application'));
    }
  };

  const title = jobTitle ?? job?.title ?? 'this role';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply for {title}</DialogTitle>
          <DialogDescription>
            Your profile, resume and match score are shared with the employer.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Match score */}
          <div className="rounded-xl border bg-muted/40 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium">Match score</span>
              <span className="text-lg font-bold">{breakdown.score}%</span>
            </div>
            <Progress value={breakdown.score} />
            <p className="mt-2 text-xs text-muted-foreground">
              {breakdown.checklist.filter((item) => item.has).length}/
              {breakdown.checklist.length} required skills matched
            </p>
          </div>

          {/* Skills breakdown */}
          {breakdown.checklist.length > 0 && (
            <div className="space-y-1.5">
              <p className="text-sm font-medium">Skills breakdown</p>
              <ul className="space-y-1 text-sm">
                {breakdown.checklist.map((item) => (
                  <li key={item.skill} className="flex items-center gap-2">
                    {item.has ? (
                      <Check className="size-4 text-emerald-600" />
                    ) : (
                      <X className="size-4 text-red-500" />
                    )}
                    <span className={item.has ? 'text-foreground' : 'text-muted-foreground'}>
                      {item.skill}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {item.has ? '(you have)' : "(you don't have)"}
                    </span>
                  </li>
                ))}
                {breakdown.extras.slice(0, 3).map((skill) => (
                  <li key={skill} className="flex items-center gap-2">
                    <CircleAlert className="size-4 text-amber-500" />
                    <span className="text-muted-foreground">{skill}</span>
                    <span className="text-xs text-muted-foreground">(extra, not required)</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* CGPA check */}
          {job?.minCgpa ? (
            <p className="flex items-center gap-2 text-sm">
              {breakdown.meetsCgpa ? (
                <Check className="size-4 text-emerald-600" />
              ) : (
                <X className="size-4 text-red-500" />
              )}
              Your CGPA: {cgpa ?? 'not set'} (Required: {job.minCgpa})
              {breakdown.meetsCgpa ? ' ✅' : ' ❌'}
            </p>
          ) : null}

          {/* Cover letter */}
          <div>
            <label className="mb-2 block text-sm font-medium" htmlFor="apply-cover-letter">
              Cover Letter (optional, max {MAX_COVER_LETTER} chars)
            </label>
            <Textarea
              id="apply-cover-letter"
              placeholder="Tell the employer why you're a great fit for this role…"
              value={coverLetter}
              maxLength={MAX_COVER_LETTER}
              onChange={(event) => setCoverLetter(event.target.value)}
              rows={6}
              className="resize-none"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {coverLetter.length}/{MAX_COVER_LETTER} · leave blank to apply with just your resume
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={applyMutation.isPending}>
              {applyMutation.isPending && <Loader2 className="size-4 animate-spin" />}
              Apply Now
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );

};

export default ApplyModal;

