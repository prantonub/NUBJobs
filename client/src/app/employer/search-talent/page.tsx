'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { SearchIcon } from 'lucide-react';

import { useAuthContext } from '@/contexts/AuthContext';
import { useTalentSearch, type TalentStudent } from '@/hooks/useEmployer';
import { getInitials } from '@/lib/utils';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

/** NUB departments as stored on `StudentProfile.department` (seed values). */
const PROGRAMS = [
  { value: 'CSE', label: 'Computer Science & Engineering' },
  { value: 'EEE', label: 'Electrical & Electronic Engineering' },
  { value: 'BBA', label: 'Business Administration' },
  { value: 'CIVIL', label: 'Civil Engineering' },
  { value: 'TEXTILE', label: 'Textile Engineering' },
  { value: 'LAW', label: 'Law' },
  { value: 'ARCH', label: 'Architecture' },
  { value: 'ENGLISH', label: 'English' },
] as const;

/** Upcoming graduates (current year + 4) through recent alumni (−6). */
const GRAD_YEARS = Array.from({ length: 11 }, (_, i) => new Date().getFullYear() + 4 - i);

const ALL = 'all';

/** Avatar + name + program/year, up to 5 skill badges, and a profile link. */
function TalentCard({ student }: { student: TalentStudent }) {
  const visibleSkills = student.skills.slice(0, 5);
  const hiddenCount = student.skills.length - visibleSkills.length;
  const programLine =
    [student.program, student.gradYear ? `Class of ${student.gradYear}` : null]
      .filter(Boolean)
      .join(' · ') || 'Program not listed';

  return (
    <Card>
      <CardHeader className="flex flex-row items-center gap-3">
        <Avatar size="lg">
          {student.photoUrl ? (
            <AvatarImage src={student.photoUrl} alt={student.fullName ?? 'Student'} />
          ) : null}
          <AvatarFallback>{getInitials(student.fullName ?? 'Student')}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <CardTitle className="truncate">{student.fullName ?? 'NUB student'}</CardTitle>
          <p className="truncate text-sm text-muted-foreground">{programLine}</p>
        </div>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-1.5">
        {student.skills.length === 0 ? (
          <span className="text-xs text-muted-foreground">No skills listed</span>
        ) : (
          <>
            {visibleSkills.map((skill) => (
              <Badge key={skill} variant="secondary">
                {skill}
              </Badge>
            ))}
            {hiddenCount > 0 ? (
              <span className="text-xs text-muted-foreground">+{hiddenCount} more</span>
            ) : null}
          </>
        )}
      </CardContent>
      <CardFooter>
        {student.username ? (
          <Button asChild variant="outline" size="sm" className="w-full">
            <Link href={`/social/profile/${student.username}`}>View profile</Link>
          </Button>
        ) : (
          <Button variant="outline" size="sm" className="w-full" disabled>
            View profile
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}

/** Placeholder Card (muted background) shown while a search is in flight. */
function TalentCardSkeleton() {
  return (
    <Card className="bg-muted/40">
      <CardHeader className="flex flex-row items-center gap-3">
        <div className="size-10 shrink-0 animate-pulse rounded-full bg-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-2/3 animate-pulse rounded-md bg-muted" />
          <div className="h-3 w-1/2 animate-pulse rounded-md bg-muted" />
        </div>
      </CardHeader>
      <CardContent className="flex gap-1.5">
        <div className="h-5 w-16 animate-pulse rounded-4xl bg-muted" />
        <div className="h-5 w-20 animate-pulse rounded-4xl bg-muted" />
        <div className="h-5 w-14 animate-pulse rounded-4xl bg-muted" />
      </CardContent>
      <CardFooter>
        <div className="h-8 w-full animate-pulse rounded-lg bg-muted" />
      </CardFooter>
    </Card>
  );
}

/**
 * /employer/search-talent - employer-only directory of students who opted in
 * to discovery. The parent /employer layout also guards the route; the checks
 * here keep the page safe on their own. The API never returns email, phone,
 * CV or date of birth, and only profiles with `visibleToEmployers = true`.
 */
export default function SearchTalentPage() {
  const { user, isLoading: authLoading } = useAuthContext();
  const isEmployer = !authLoading && user?.role === 'EMPLOYER';

  const [program, setProgram] = useState(ALL);
  const [gradYear, setGradYear] = useState(ALL);
  const [skillsInput, setSkillsInput] = useState('');
  const [skillsQuery, setSkillsQuery] = useState('');

  // Debounce the skills input by 300ms so every keystroke isn't a request.
  useEffect(() => {
    const timer = setTimeout(() => setSkillsQuery(skillsInput.trim()), 300);
    return () => clearTimeout(timer);
  }, [skillsInput]);

  const filters = useMemo(
    () => ({
      program: program === ALL ? '' : program,
      gradYear: gradYear === ALL ? '' : gradYear,
      skills: skillsQuery,
    }),
    [program, gradYear, skillsQuery]
  );

  const { data, isLoading, isError } = useTalentSearch(filters, {
    enabled: isEmployer,
  });

  if (authLoading) {
    return <LoadingSpinner label="Loading Search Talent…" fullscreen />;
  }

  if (!user) {
    return (
      <div className="mx-auto max-w-lg py-16">
        <Alert>
          <SearchIcon />
          <AlertTitle>Log in to search talent</AlertTitle>
          <AlertDescription>
            Search Talent is available to NUBJobs employer accounts.
            <Button asChild size="sm" className="mt-3">
              <Link href="/login">Log in</Link>
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (user.role !== 'EMPLOYER') {
    // Keep each role on its own home (mirrors RequireAuth in the layout).
    redirect(user.role === 'STUDENT' ? '/dashboard' : '/');
  }

  const students = data?.students ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold tracking-tight text-foreground">
          Search Talent
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Students below have chosen to appear in employer search. Contact
          details are never shown here.
        </p>
      </div>

      {/* Filter bar */}
      <Card>
        <CardContent className="grid gap-4 py-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="talent-program">Program</Label>
            <Select value={program} onValueChange={setProgram}>
              <SelectTrigger id="talent-program" className="w-full">
                <SelectValue placeholder="All programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All programs</SelectItem>
                {PROGRAMS.map((entry) => (
                  <SelectItem key={entry.value} value={entry.value}>
                    {entry.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="talent-grad-year">Graduation year</Label>
            <Select value={gradYear} onValueChange={setGradYear}>
              <SelectTrigger id="talent-grad-year" className="w-full">
                <SelectValue placeholder="Any year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Any year</SelectItem>
                {GRAD_YEARS.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {String(year)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="talent-skills">Skills (comma separated)</Label>
            <Input
              id="talent-skills"
              placeholder="e.g. React, Node.js, Figma"
              value={skillsInput}
              onChange={(event) => setSkillsInput(event.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      {isError ? (
        <Alert variant="destructive">
          <AlertTitle>Search unavailable</AlertTitle>
          <AlertDescription>
            We couldn&apos;t load talent right now. Please try again in a moment.
          </AlertDescription>
        </Alert>
      ) : isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <TalentCardSkeleton key={index} />
          ))}
        </div>
      ) : students.length === 0 ? (
        <p className="py-12 text-center text-sm text-muted-foreground">
          No students match these filters yet.
        </p>
      ) : (
        <>
          <p className="text-sm text-muted-foreground">
            {total} student{total === 1 ? '' : 's'} found
          </p>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {students.map((student) => (
              <TalentCard key={student.id} student={student} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
