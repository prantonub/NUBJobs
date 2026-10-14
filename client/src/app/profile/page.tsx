'use client';

import { FC, useState, useCallback } from 'react';
import Link from 'next/link';
import { useProfile, useUpdateProfile, useAnalyzeResume, useProfileCompletion, useRequestProfileVerification } from '@/hooks/useProfile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, ClockIcon, ShieldAlertIcon } from 'lucide-react';
import { getErrorMessage } from '@/lib/utils';
import { FileUploadZone } from '@/components/ui/FileUploadZone';
import { VerifiedBadge } from '@/components/ui/verified-badge';
import { DOCUMENT_MIME_TYPES, IMAGE_MIME_TYPES } from '@/hooks/useFileUpload';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(80, 'Name is too long'),
  nubId: z.string().optional(),
  cgpa: z.number().min(0).max(4).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().optional(),
  linkedinUrl: z.string().url().optional().or(z.literal('')),
  githubUrl: z.string().url().optional().or(z.literal('')),
  portfolioUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const ProfilePage: FC = () => {
  const { data: profile, isLoading } = useProfile();
  const { data: completion } = useProfileCompletion();
  const updateProfileMutation = useUpdateProfile();
  const analyzeResumeMutation = useAnalyzeResume();
  const requestVerification = useRequestProfileVerification();

  const handleSubmitVerification = () => {
    requestVerification.mutate(undefined, {
      onSuccess: () => toast.success('Profile submitted for admin review'),
      onError: (error) => toast.error(getErrorMessage(error, 'Failed to submit for verification')),
    });
  };

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  // Render-phase sync: when the server profile (re)loads, seed the form + skills
  // once per profile instead of calling setState inside an effect.
  const [syncedProfileId, setSyncedProfileId] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  if (profile && profile.id !== syncedProfileId) {
    setSyncedProfileId(profile.id);
    reset({
      name: profile.user?.name || '',
      nubId: profile.nubId || '',
      cgpa: profile.cgpa || undefined,
      phone: profile.phone || '',
      location: profile.location || '',
      bio: profile.bio || '',
      linkedinUrl: profile.linkedinUrl || '',
      githubUrl: profile.githubUrl || '',
      portfolioUrl: profile.portfolioUrl || '',
    });
    setSkills(profile.skills || []);
  }

  const handleAddSkill = () => {
    if (skillInput.trim()) {
      setSkills([...skills, skillInput.trim()]);
      setSkillInput('');
    }
  };

  const handleRemoveSkill = (index: number) => {
    setSkills(skills.filter((_, i) => i !== index));
  };

  const onSubmit = useCallback(
    async (data: ProfileFormData) => {
      try {
        // Only send fields the API persists. `experience` / `projects` /
        // `certifications` have no columns in StudentProfile yet, so posting
        // them would fail the request.
        await updateProfileMutation.mutateAsync({ ...data, skills });
        toast.success('Profile updated!');
      } catch (error) {
        toast.error(getErrorMessage(error, 'Failed to update profile'));
      }
    },
    [skills, updateProfileMutation]
  );

  const handleAnalyzeResume = async () => {
    try {
      const result = await analyzeResumeMutation.mutateAsync();
      window.location.href = '/profile/resume-analysis';
    } catch (error) {
      toast.error('Failed to analyze resume');
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="mb-8 flex items-center gap-2">
          <h1 className="text-3xl font-bold">My Profile</h1>
          {profile?.isVerified ? <VerifiedBadge label /> : null}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Photo Upload */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Photo</h2>
            <FileUploadZone
              endpoint="/profile/photo"
              fieldName="photo"
              accept={IMAGE_MIME_TYPES}
              maxSizeMb={5}
              previewUrl={profile?.photoUrl}
              previewShape="circle"
              previewAlt={profile?.user?.name || 'Profile photo'}
              label="Drag & drop your photo here"
              hint="JPG, PNG or WEBP · max 5MB · square crop, optimised automatically"
              successMessage="Profile photo updated!"
              errorMessage="Failed to upload photo"
              invalidateKeys={[['profile'], ['profileCompletion'], ['currentUser']]}
            />
          </Card>

          {/* Personal Info */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Full Name</label>
                <Input {...register('name')} placeholder="Your full name" />
                {errors.name ? (
                  <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>
                ) : (
                  <p className="mt-1 text-xs text-gray-500">
                    Shown in the top-right profile menu.
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Phone</label>
                <Input {...register('phone')} placeholder="+880..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <Input {...register('location')} placeholder="City, Country" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Bio</label>
                <Textarea {...register('bio')} placeholder="Tell us about yourself..." rows={3} />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">LinkedIn URL</label>
                <Input {...register('linkedinUrl')} placeholder="https://linkedin.com/in/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">GitHub URL</label>
                <Input {...register('githubUrl')} placeholder="https://github.com/..." />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Portfolio URL</label>
                <Input {...register('portfolioUrl')} placeholder="https://portfolio.com/..." />
              </div>
            </div>
          </Card>
{/* education card */}
          {/* Education */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Education</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">NUB ID</label>
                <Input {...register('nubId')} placeholder="NUB-20XX-XXX" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">CGPA</label>
                <Input
                  {...register('cgpa', { valueAsNumber: true })}
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  placeholder="3.50"
                />
              </div>
            </div>
          </Card>

          {/* Skills */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Skills</h2>
            <div className="space-y-3">
              <div className="flex gap-2">
                <Input
                  value={skillInput}
                  onChange={(e) => setSkillInput(e.target.value)}
                  placeholder="Add a skill..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddSkill();
                    }
                  }}
                />
                <Button type="button" onClick={handleAddSkill} size="sm">
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill, i) => (
                  <Badge key={i} variant="secondary" className="cursor-pointer">
                    {skill}
                    <button
                      type="button"
                      onClick={() => handleRemoveSkill(i)}
                      className="ml-1 hover:text-red-600"
                    >
                      ×
                    </button>
                  </Badge>
                ))}
              </div>
            </div>
          </Card>

          {/* Resume card */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Resume</h2>
            <div className="space-y-3">
              <FileUploadZone
                endpoint="/profile/resume"
                fieldName="resume"
                accept={DOCUMENT_MIME_TYPES}
                extensions={['pdf', 'doc', 'docx']}
                maxSizeMb={5}
                label="Drag & drop your resume here"
                hint="PDF, DOC or DOCX · max 5MB · old file is replaced automatically"
                successMessage="Resume uploaded!"
                errorMessage="Failed to upload resume"
                invalidateKeys={[['profile'], ['profileCompletion']]}
              />

              {profile?.resumeUrl && (
                <div className="flex flex-wrap items-center gap-3">
                  <a
                    href={profile.resumeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 hover:underline"
                  >
                    View current resume
                  </a>
                  <Button
                    type="button"
                    onClick={handleAnalyzeResume}
                    disabled={analyzeResumeMutation.isPending}
                  >
                    {analyzeResumeMutation.isPending && (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    )}
                    Analyze Resume
                  </Button>
                </div>
              )}
            </div>
          </Card>

          {/* Verification status (blue verified badge gate) */}
          <Card className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-semibold">Profile Verification</h2>
                {profile?.isVerified ? (
                  <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                    <VerifiedBadge />
                    <span>
                      <span className="font-medium text-foreground">Your profile is verified.</span>{' '}
                      The blue badge is shown across NUBJobs and you can apply to jobs.
                      {profile?.verifiedAt ? ` Approved ${new Date(profile.verifiedAt).toLocaleDateString()}.` : ''}
                    </span>
                  </p>
                ) : profile?.verificationRequest ? (
                  <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                    <ClockIcon className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <span>
                      <span className="font-medium text-amber-600">Verification pending review.</span>{' '}
                      A system admin will review your profile — you can apply to jobs once approved.
                    </span>
                  </p>
                ) : (
                  <>
                    <p className="mt-2 flex items-start gap-2 text-sm text-muted-foreground">
                      <ShieldAlertIcon className="mt-0.5 size-4 shrink-0" />
                      <span>
                        Your profile must be <span className="font-medium text-foreground">100% complete</span> and
                        approved by an admin before you can apply to jobs. Completion:{' '}
                        <span className="font-medium text-foreground">{profile?.completionPercentage ?? completion?.percentage ?? 0}%</span>
                      </span>
                    </p>
                    {profile?.verificationRejectReason ? (
                      <p className="mt-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                        Last review rejected: {profile.verificationRejectReason} — fix the issue and re-submit.
                      </p>
                    ) : null}
                  </>
                )}
              </div>
              {!profile?.isVerified && !profile?.verificationRequest ? (
                <Button
                  type="button"
                  onClick={handleSubmitVerification}
                  disabled={requestVerification.isPending || (profile?.completionPercentage ?? completion?.percentage ?? 0) < 100}
                >
                  {requestVerification.isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                  Submit for verification
                </Button>
              ) : null}
            </div>
          </Card>

          {/* Submit */}
          <div className="flex gap-3">
            <Button
              type="submit"
              disabled={updateProfileMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {updateProfileMutation.isPending && (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              )}
              Save Profile
            </Button>
            <Link href="/dashboard">
              <Button type="button" variant="outline">
                Back to Dashboard
              </Button>
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfilePage;