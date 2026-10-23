import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';
import { VerifiedBadge } from '@/components/ui/verified-badge';

/** One label/value line inside the review dialog. */
export function ReviewRow({ k, v, wide, link }: { k: string; v: unknown; wide?: boolean; link?: string }) {
  const text = v === null || v === undefined || v === '' ? '-' : String(v);
  const isUrl = typeof v === 'string' && /^https?:\/\//i.test(v);
  return (
    <div className={wide ? 'sm:col-span-2' : undefined}>
      <dt className='text-xs text-muted-foreground'>{k}</dt>
      <dd className='font-medium'>
        {isUrl ? (
          <a href={String(v)} target='_blank' rel='noreferrer' className='text-primary hover:underline'>
            {link ?? text}
          </a>
        ) : (
          text
        )}
      </dd>
    </div>
  );
}

/** Full review payload for one queue row (mirrors GET /api/admin/verifications). */
export interface VerificationDetail {
  nubId?: string | null;
  cgpa?: number | null;
  department?: string | null;
  location?: string | null;
  bio?: string | null;
  phone?: string | null;
  skills?: string[] | null;
  resumeUrl?: string | null;
  photoUrl?: string | null;
  linkedinUrl?: string | null;
  githubUrl?: string | null;
  portfolioUrl?: string | null;
  industry?: string | null;
  website?: string | null;
  about?: string | null;
  email?: string | null;
  logoUrl?: string | null;
  employees?: number | null;
  foundedYear?: number | null;
  twitterUrl?: string | null;
  facebookUrl?: string | null;
  verificationDocument?: string | null;
  verificationStatus?: string | null;
  requestDocumentType?: string | null;
  requestReason?: string | null;
  requestRegistrationNumber?: string | null;
}

export interface VerificationRow {
  id: string;
  userId: string;
  kind: 'STUDENT' | 'EMPLOYER';
  name: string;
  email: string;
  photo: string | null;
  isVerified: boolean;
  submittedAt: string | null;
  verifiedAt: string | null;
  rejectReason: string | null;
  completion: number | null;
  detail: VerificationDetail;
}

interface ViewVerificationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: VerificationRow | null;
  tab: string;
  approve: { isPending: boolean };
  approveFn: () => void;
  setRejectTarget: (t: { kind: string; id: string; name: string } | null) => void;
}

/**
 * Full-profile review dialog (opens from a PENDING row). Shows every field the
 * spec depends on (student: nubId/cgpa/skills/bio/resume; employer: about/
 * website/phone/logo), the current verification status and the last reject
 * reason, so an admin can decide with the same data the applicant sees.
 */
export function ViewVerificationDialog(props: ViewVerificationDialogProps) {
  const { open, onOpenChange, target, tab, approve, approveFn, setRejectTarget } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
        <DialogHeader>
          <DialogTitle>
            <span className='flex items-center gap-2'>
              {target?.name}
              {target?.isVerified ? <VerifiedBadge /> : null}
            </span>
          </DialogTitle>
          <DialogDescription>
            {target?.email} · {target?.kind}
            {target?.submittedAt ? ` · Submitted ${new Date(target.submittedAt).toLocaleString()}` : ''}
          </DialogDescription>
        </DialogHeader>
        {target ? (
          <div className='space-y-4'>
            <div className='flex flex-wrap items-center gap-3'>
              {target.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={target.photo} alt='' className='size-16 rounded-full object-cover' />
              ) : (
                <div className='flex size-16 items-center justify-center rounded-full bg-muted text-xl font-semibold'>
                  {target.name?.charAt(0)?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className='flex flex-wrap gap-2 text-xs'>
                {target.kind === 'STUDENT' && target.completion !== null ? (
                  <Badge variant={target.completion === 100 ? 'default' : 'secondary'}>
                    {target.completion}% complete
                  </Badge>
                ) : null}
                <Badge variant='outline'>{target.kind}</Badge>
              </div>
            </div>
            {target.kind === 'STUDENT' ? (
              <dl className='grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border p-4 text-sm sm:grid-cols-2'>
                <ReviewRow k='NUB ID' v={target.detail?.nubId} />
                <ReviewRow k='CGPA' v={target.detail?.cgpa} />
                <ReviewRow k='Department' v={target.detail?.department} />
                <ReviewRow k='Location' v={target.detail?.location} />
                <ReviewRow k='Phone' v={target.detail?.phone} />
                <ReviewRow k='Bio' v={target.detail?.bio} wide />
                <ReviewRow k='Skills' v={Array.isArray(target.detail?.skills) ? target.detail.skills.join(', ') : target.detail?.skills} wide />
                <ReviewRow k='Resume' v={target.detail?.resumeUrl} link='View resume' />
                <ReviewRow k='Photo' v={target.detail?.photoUrl} link='View photo' />
                <ReviewRow k='LinkedIn' v={target.detail?.linkedinUrl} link='Open' />
                <ReviewRow k='Portfolio' v={target.detail?.portfolioUrl} link='Open' />
                <ReviewRow k='GitHub' v={target.detail?.githubUrl} link='Open' />
              </dl>
            ) : null}
            {target.kind === 'EMPLOYER' ? (
              <dl className='grid grid-cols-1 gap-x-6 gap-y-2 rounded-lg border p-4 text-sm sm:grid-cols-2'>
                <ReviewRow k='Location' v={target.detail?.location} />
                <ReviewRow k='Industry' v={target.detail?.industry} />
                <ReviewRow k='Email' v={target.detail?.email} />
                <ReviewRow k='Phone' v={target.detail?.phone} />
                <ReviewRow k='Website' v={target.detail?.website} link='Open' />
                <ReviewRow k='Employees' v={target.detail?.employees} />
                <ReviewRow k='Founded' v={target.detail?.foundedYear} />
                <ReviewRow k='Verification status' v={target.detail?.verificationStatus} />
                <ReviewRow k='Document type' v={target.detail?.requestDocumentType} />
                <ReviewRow k='Reg. number' v={target.detail?.requestRegistrationNumber} />

                <ReviewRow k='About' v={target.detail?.about} wide />
                <ReviewRow k='Request reason' v={target.detail?.requestReason} wide />
                <ReviewRow k='Verification document' v={target.detail?.verificationDocument} link='View document' />
                <ReviewRow k='LinkedIn' v={target.detail?.linkedinUrl} link='Open' />
                <ReviewRow k='Twitter' v={target.detail?.twitterUrl} link='Open' />
                <ReviewRow k='Facebook' v={target.detail?.facebookUrl} link='Open' />
                <ReviewRow k='Logo' v={target.detail?.logoUrl} link='View logo' />
              </dl>
            ) : null}
            {target.rejectReason ? (
              <p className='rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700'>
                Last rejection: {target.rejectReason}
              </p>
            ) : null}
          </div>
        ) : null}
        <DialogFooter>
          {target && tab === 'PENDING' ? (
            <div className='flex w-full flex-wrap justify-end gap-2'>
              <Button variant='outline' onClick={() => onOpenChange(false)}>
                Close
              </Button>
              <Button
                variant='destructive'
                disabled={approve.isPending}
                onClick={() => {
                  setRejectTarget({ kind: target.kind.toLowerCase(), id: target.id, name: target.name });
                  onOpenChange(false);
                }}
              >
                Reject…
              </Button>
              <Button disabled={approve.isPending} onClick={approveFn}>
                {approve.isPending ? (
                  <>
                    <Loader2 className='mr-1.5 size-4 animate-spin' />
                    Approving…
                  </>
                ) : (
                  'Approve'
                )}
              </Button>
            </div>
          ) : (
            <Button variant='outline' onClick={() => onOpenChange(false)}>
              Close
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

