'use client';

import { type FC, useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  useCompanyProfile,
  useDeleteLogo,
  useRequestVerification,
  useUpdateCompanyProfile,
  useUploadVerificationDocument,
  useVerificationStatus,
} from '@/hooks/useEmployer';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES } from '@/hooks/useFileUpload';
import { toast } from 'sonner';
import { BadgeCheck, Clock, Loader2, Trash2 } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';

const CITIES = ['Dhaka', 'Chattogram', 'Sylhet', 'Khulna', 'Rajshahi', 'Barishal', 'Rangpur', 'Mymensingh', 'Remote'];
const INDUSTRIES = [
  'Software Development',
  'IT Services',
  'E-commerce',
  'Fintech',
  'Telecommunication',
  'Manufacturing',
  'Healthcare',
  'Education',
  'Transportation',
  'Travel Tech',
  'Other',
];

const ABOUT_MIN = 50;
const ABOUT_MAX = 2000;

const LOGO_KEYS = [
  ['companyProfile'],
  ['employerJobs'],
  ['jobs'],
  ['job'],
  ['recommendedJobs'],
  ['savedJobs'],
  ['jobCategories'],
];

const settingsSchema = z.object({
  companyName: z.string().min(3, 'Company name must be at least 3 characters').max(100, 'Company name is too long'),
  about: z
    .string()
    .max(ABOUT_MAX, `About must be at most ${ABOUT_MAX} characters`)
    .refine((value) => value.length === 0 || value.length >= ABOUT_MIN, {
      message: `About must be at least ${ABOUT_MIN} characters (or left empty)`,
    })
    .optional(),
  website: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  location: z.string().optional(),
  foundedYear: z.coerce.number().int().min(1900).max(new Date().getFullYear()).optional().or(z.literal('')),
  employees: z.coerce.number().int().positive().optional().or(z.literal('')),
  industry: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email('Enter a valid email').optional().or(z.literal('')),
  linkedinUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  twitterUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
  facebookUrl: z.string().url('Enter a valid URL').optional().or(z.literal('')),
});

type SettingsForm = z.infer<typeof settingsSchema>;

/**
 * Settings tab: logo management, the full company edit form and the
 * verification section (document + reason, status badge, benefits).
 */
export const CompanySettingsTab: FC = () => {
  const { data: profile } = useCompanyProfile();
  const { data: verification } = useVerificationStatus();
  const updateProfile = useUpdateCompanyProfile();
  const deleteLogo = useDeleteLogo();
  const uploadDocument = useUploadVerificationDocument();
  const requestVerification = useRequestVerification();

  const [reason, setReason] = useState('');
  const [documentUrl, setDocumentUrl] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<SettingsForm>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(settingsSchema) as any,
  });

  useEffect(() => {
    if (!profile) return;
    setDocumentUrl(profile.verificationDocument ?? '');
    reset({
      companyName: profile.companyName ?? '',
      about: profile.about ?? '',
      website: profile.website ?? '',
      location: profile.location ?? '',
      foundedYear: profile.foundedYear ?? undefined,
      employees: profile.employees ?? undefined,
      industry: profile.industry ?? '',
      phone: profile.phone ?? '',
      email: profile.email ?? '',
      linkedinUrl: profile.linkedinUrl ?? '',
      twitterUrl: profile.twitterUrl ?? '',
      facebookUrl: profile.facebookUrl ?? '',
    });
  }, [profile, reset]);

  const onSubmit = async (data: SettingsForm) => {
    try {
      await updateProfile.mutateAsync({
        ...data,
        foundedYear: data.foundedYear === '' ? undefined : data.foundedYear,
        employees: data.employees === '' ? undefined : data.employees,
      });
      toast.success('Company profile updated');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to update company profile'));
    }
  };

  const handleDeleteLogo = async () => {
    try {
      await deleteLogo.mutateAsync();
      toast.success('Logo deleted');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete logo'));
    }
  };

  const handleDocumentUpload = (result: unknown) => {
    const payload = result as { data?: { documentUrl?: string; url?: string } } | null;
    const url = payload?.data?.documentUrl ?? payload?.data?.url;
    if (url) setDocumentUrl(url);
  };

  const handleSubmitVerification = async () => {
    if (!documentUrl && !reason.trim()) {
      toast.error('Upload a document or describe your company for verification');
      return;
    }
    try {
      await requestVerification.mutateAsync({
        verificationDocument: documentUrl || undefined,
        verificationReason: reason.trim() || undefined,
      });
      toast.success('Verification request submitted');
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to submit verification'));
    }
  };

  const verified = verification?.isVerified ?? profile?.isVerified ?? false;

  return (
    <div className="space-y-6">
      {/* Logo */}
      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Company Logo</h2>
        <FileUploadZone
          endpoint="/employer/company/logo"
          fieldName="logo"
          accept={IMAGE_MIME_TYPES}
          maxSizeMb={5}
          previewUrl={profile?.logoUrl}
          previewLabel="Current logo"
          label="Drag & drop your company logo here"
          hint="PNG, JPG or WEBP · max 5MB · fitted to 512px, optimised automatically"
          successMessage="Logo uploaded!"
          errorMessage="Failed to upload logo"
          invalidateKeys={LOGO_KEYS}
        />
        {profile?.logoUrl ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-3 text-destructive"
            onClick={() => void handleDeleteLogo()}
            disabled={deleteLogo.isPending}
          >
            {deleteLogo.isPending ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <Trash2 className="size-3.5" />
            )}
            Delete logo
          </Button>
        ) : null}
      </Card>

      {/* Company details */}
      <Card className="p-6">
        <h2 className="mb-4 font-semibold">Company Information</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="companyName">
              Company name *
            </label>
            <Input id="companyName" {...register('companyName')} placeholder="Your company name" />
            {errors.companyName ? (
              <p className="mt-1 text-xs text-destructive">{errors.companyName.message}</p>
            ) : null}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium" htmlFor="about">
              About company
            </label>
            <Textarea id="about" {...register('about')} rows={5} maxLength={ABOUT_MAX} />
            <p className="mt-1 text-xs text-muted-foreground">
              {(profile?.about ?? '').length}/{ABOUT_MAX} characters (minimum {ABOUT_MIN})
            </p>
            {errors.about ? <p className="mt-1 text-xs text-destructive">{errors.about.message}</p> : null}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="website">
                Website
              </label>
              <Input id="website" {...register('website')} placeholder="https://yourcompany.com" />
              {errors.website ? (
                <p className="mt-1 text-xs text-destructive">{errors.website.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="location">
                Location
              </label>
              <select
                id="location"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                {...register('location')}
              >
                <option value="">Select a city…</option>
                {CITIES.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="foundedYear">
                Founded year
              </label>
              <Input
                id="foundedYear"
                type="number"
                min={1900}
                max={new Date().getFullYear()}
                {...register('foundedYear')}
                placeholder="2015"
              />
              {errors.foundedYear ? (
                <p className="mt-1 text-xs text-destructive">{errors.foundedYear.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="employees">
                Employee count
              </label>
              <Input id="employees" type="number" min={1} {...register('employees')} placeholder="250" />
              {errors.employees ? (
                <p className="mt-1 text-xs text-destructive">{errors.employees.message}</p>
              ) : null}
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="industry">
                Industry
              </label>
              <select
                id="industry"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                {...register('industry')}
              >
                <option value="">Select an industry…</option>
                {INDUSTRIES.map((entry) => (
                  <option key={entry} value={entry}>
                    {entry}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="phone">
                Phone
              </label>
              <Input id="phone" {...register('phone')} placeholder="+880..." />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="email">
                Email
              </label>
              <Input id="email" type="email" {...register('email')} placeholder="hr@company.com" />
              {errors.email ? <p className="mt-1 text-xs text-destructive">{errors.email.message}</p> : null}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="linkedinUrl">
                LinkedIn URL
              </label>
              <Input id="linkedinUrl" {...register('linkedinUrl')} placeholder="https://linkedin.com/company/…" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="twitterUrl">
                Twitter URL
              </label>
              <Input id="twitterUrl" {...register('twitterUrl')} placeholder="https://twitter.com/…" />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="facebookUrl">
                Facebook URL
              </label>
              <Input id="facebookUrl" {...register('facebookUrl')} placeholder="https://facebook.com/…" />
            </div>
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={updateProfile.isPending}>
              {updateProfile.isPending && <Loader2 className="size-4 animate-spin" />}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={() => reset()} disabled={updateProfile.isPending}>
              Cancel
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="font-semibold">Company Verification</h2>
          {verified ? (
            <Badge className="flex items-center gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
              <BadgeCheck className="size-3.5" />
              VERIFIED
            </Badge>
          ) : documentUrl || profile?.verificationRequest ? (
            <Badge
              variant="outline"
              className="flex items-center gap-1 border-amber-200 bg-amber-50 text-amber-700"
            >
              <Clock className="size-3.5" />
              PENDING
            </Badge>
          ) : (
            <Badge variant="outline">NOT VERIFIED</Badge>
          )}
        </div>

        {verified ? (
          <div className="space-y-2 text-sm">
            <p className="text-emerald-700">
              ✅ Verified
              {profile?.verifiedAt ? ` on ${new Date(profile.verifiedAt).toLocaleDateString()}` : ''}
            </p>
            <ul className="list-inside list-disc text-muted-foreground">
              <li>Verified badge on every job posting</li>
              <li>Higher placement in candidate search</li>
              <li>Faster approval for new postings</li>
            </ul>
          </div>
        ) : (
          <div className="space-y-4">
            <FileUploadZone
              endpoint="/employer/company/verification-document"
              fieldName="document"
              accept={DOCUMENT_MIME_TYPES}
              extensions={['pdf', 'doc', 'docx']}
              maxSizeMb={5}
              label="Drag & drop your verification document"
              hint="Trade license, registration certificate or tax ID · PDF/DOC · max 5MB"
              successMessage="Document uploaded"
              errorMessage="Failed to upload document"
              invalidateKeys={[['companyProfile'], ['verificationStatus']]}
              onUploaded={handleDocumentUpload}
            />

            {documentUrl ? (
              <p className="text-xs text-muted-foreground">
                Document ready:{' '}
                <a
                  href={documentUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary hover:underline"
                >
                  view uploaded file
                </a>
              </p>
            ) : null}

            <div>
              <label className="mb-1 block text-sm font-medium" htmlFor="verificationReason">
                Verification reason
              </label>
              <Textarea
                id="verificationReason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                rows={3}
                placeholder="Explain why your company should be verified (optional when a document is uploaded)."
              />
            </div>

            <Button
              type="button"
              onClick={() => void handleSubmitVerification()}
              disabled={requestVerification.isPending}
            >
              {requestVerification.isPending && <Loader2 className="size-4 animate-spin" />}
              Submit for Verification
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
};

export default CompanySettingsTab;