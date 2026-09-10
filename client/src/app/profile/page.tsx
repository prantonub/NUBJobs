'use client';

import { FC, useState, useCallback, useEffect } from 'react';
import Link from 'next/link';
import { useProfile, useUpdateProfile, useUploadProfilePhoto, useUploadResume, useAnalyzeResume } from '@/hooks/useProfile';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2, Plus, Trash2 } from 'lucide-react';

const profileSchema = z.object({
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
  const updateProfileMutation = useUpdateProfile();
  const uploadPhotMutation = useUploadProfilePhoto();
  const uploadResumeMutation = useUploadResume();
  const analyzeResumeMutation = useAnalyzeResume();

  const [skills, setSkills] = useState<string[]>([]);
  const [skillInput, setSkillInput] = useState('');
  const [experience, setExperience] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [certifications, setCertifications] = useState<any[]>([]);

  const { register, handleSubmit, formState: { errors }, reset } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  useEffect(() => {
    if (profile) {
      reset({
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
      setExperience(profile.experience || []);
      setProjects(profile.projects || []);
      setCertifications(profile.certifications || []);
    }
  }, [profile, reset]);

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
        await updateProfileMutation.mutateAsync({
          ...data,
          skills,
          experience,
          projects,
          certifications,
        });
        toast.success('Profile updated!');
      } catch (error) {
        toast.error('Failed to update profile');
      }
    },
    [skills, experience, projects, certifications, updateProfileMutation]
  );

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadPhotMutation.mutateAsync(file);
        toast.success('Photo uploaded!');
      } catch (error) {
        toast.error('Failed to upload photo');
      }
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      try {
        await uploadResumeMutation.mutateAsync(file);
        toast.success('Resume uploaded!');
      } catch (error) {
        toast.error('Failed to upload resume');
      }
    }
  };

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
        <h1 className="text-3xl font-bold mb-8">My Profile</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Photo Upload */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Profile Photo</h2>
            <div className="flex items-center gap-4">
              {profile?.photoUrl && (
                <img
                  src={profile.photoUrl}
                  alt="Profile"
                  className="w-24 h-24 rounded-full object-cover"
                />
              )}
              <div>
                <label className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>Upload Photo</span>
                  </Button>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handlePhotoUpload}
                    disabled={uploadPhotMutation.isPending}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">JPG or PNG, max 5MB</p>
              </div>
            </div>
          </Card>

          {/* Personal Info */}
          <Card className="p-6">
            <h2 className="text-xl font-semibold mb-4">Personal Information</h2>
            <div className="space-y-4">
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
              <div>
                <label className="cursor-pointer">
                  <Button type="button" variant="outline" asChild>
                    <span>Upload Resume</span>
                  </Button>
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx"
                    className="hidden"
                    onChange={handleResumeUpload}
                    disabled={uploadResumeMutation.isPending}
                  />
                </label>
                <p className="text-xs text-gray-500 mt-2">PDF or DOC, max 5MB</p>
              </div>
              {profile?.resumeUrl && (
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
              )}
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