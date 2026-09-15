'use client';

import Link from 'next/link';
import { FileCheckIcon, UploadIcon } from 'lucide-react';
import { useProfile } from '@/hooks/useProfile';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';

export default function CvAtsPage() {
  const { data: profile, isLoading } = useProfile();
  const hasResume = Boolean(profile?.resumeUrl);
  const skills = profile?.skills?.length ?? 0;
  const checks = [hasResume, skills > 0, Boolean(profile?.bio), Boolean(profile?.linkedinUrl || profile?.githubUrl)];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold">CV & ATS</h1>
        <p className="mt-1 text-sm text-muted-foreground">Prepare a complete, searchable profile before applying.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="p-5 md:col-span-2">
          <div className="flex items-center gap-3"><FileCheckIcon className="size-5 text-brand-600" /><h2 className="font-semibold">Profile ATS readiness</h2></div>
          <div className="mt-5 flex items-end justify-between"><span className="text-3xl font-bold">{isLoading ? '--' : `${score}%`}</span><span className="text-sm text-muted-foreground">based on your profile</span></div>
          <Progress value={score} className="mt-3" />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <p className="text-sm">{hasResume ? '✓ Resume uploaded' : '○ Upload your resume'}</p>
            <p className="text-sm">{skills ? `✓ ${skills} skills added` : '○ Add relevant skills'}</p>
            <p className="text-sm">{profile?.bio ? '✓ Professional summary added' : '○ Add a professional summary'}</p>
            <p className="text-sm">{profile?.linkedinUrl || profile?.githubUrl ? '✓ Professional link added' : '○ Add LinkedIn or GitHub'}</p>
          </div>
        </Card>
        <Card className="p-5"><h2 className="font-semibold">Next step</h2><p className="mt-2 text-sm text-muted-foreground">{hasResume ? 'Run the resume analysis to identify improvements.' : 'Upload a PDF or DOC resume from your profile.'}</p><Button asChild className="mt-5"><Link href={hasResume ? '/profile/resume-analysis' : '/profile'}><UploadIcon className="mr-2 size-4" />{hasResume ? 'Analyze CV' : 'Upload CV'}</Link></Button></Card>
      </div>
    </div>
  );
}