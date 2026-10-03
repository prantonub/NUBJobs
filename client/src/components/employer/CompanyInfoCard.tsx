'use client';

import type { FC } from 'react';
import { BadgeCheck, Building2, CalendarDays, MapPin, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { IMAGE_MIME_TYPES } from '@/hooks/useFileUpload';

export interface CompanyInfoCardProps {
  profile?: {
    companyName?: string;
    logoUrl?: string | null;
    location?: string | null;
    foundedYear?: number | null;
    employees?: number | null;
    industry?: string | null;
    isVerified?: boolean;
  } | null;
  verificationStatus?: { isVerified?: boolean; verificationBadge?: string } | null;
  /** Toggles the inline logo uploader in the Settings tab. */
  onLogoClick?: () => void;
  /** Renders the drag & drop logo uploader below the header. */
  showLogoUploader?: boolean;
  onUploaded?: () => void;
}

/**
 * Company header card: logo, name, verification badge and the key facts
 * (location, founded year, head-count, industry).
 */
export const CompanyInfoCard: FC<CompanyInfoCardProps> = ({
  profile,
  verificationStatus,
  onLogoClick,
  showLogoUploader = false,
  onUploaded,
}) => {
  const verified = verificationStatus?.isVerified ?? profile?.isVerified ?? false;

  return (
    <Card className="p-6">
      <div className="flex flex-wrap items-start gap-5">
        <button
          type="button"
          onClick={onLogoClick}
          title="Change logo"
          className="shrink-0 rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {profile?.logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.logoUrl}
              alt={`${profile.companyName ?? 'Company'} logo`}
              className="size-20 rounded-xl border object-cover"
            />
          ) : (
            <span className="flex size-20 items-center justify-center rounded-xl border bg-muted">
              <Building2 className="size-8 text-muted-foreground" />
            </span>
          )}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">{profile?.companyName ?? 'Your company'}</h1>
            {verified ? (
              <Badge className="flex items-center gap-1 border-emerald-200 bg-emerald-50 text-emerald-700">
                <BadgeCheck className="size-3.5" />
                Verified
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700">
                {verificationStatus?.verificationBadge ?? 'Not verified'}
              </Badge>
            )}
          </div>

          <div className="mt-2 flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-4" />
              {profile?.location || 'Location not set'}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-4" />
              Founded {profile?.foundedYear ?? '—'}
            </span>
            <span className="inline-flex items-center gap-1">
              <Users className="size-4" />
              {profile?.employees ? `${profile.employees} employees` : 'Head-count not set'}
            </span>
            {profile?.industry ? <span>{profile.industry}</span> : null}
          </div>

          {!verified ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Get verified to build trust with candidates.{' '}
              <a href="/employer/company?tab=settings" className="text-primary hover:underline">
                Submit for verification
              </a>
            </p>
          ) : null}
        </div>

        <div className="flex gap-2">
          <Button asChild variant="outline" size="sm">
            <a href="/employer/company?tab=settings">Edit Profile</a>
          </Button>
        </div>
      </div>

      {showLogoUploader && (
        <div className="mt-5 border-t pt-5">
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
            invalidateKeys={[
              ['companyProfile'],
              ['employerJobs'],
              ['jobs'],
              ['job'],
              ['recommendedJobs'],
              ['savedJobs'],
              ['jobCategories'],
            ]}
            onUploaded={onUploaded}
          />
        </div>
      )}
    </Card>
  );
};

export default CompanyInfoCard;