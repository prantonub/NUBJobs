import type { Metadata } from "next";
import Link from "next/link";
import {
  CheckCircle2Icon,
  FileTextIcon,
  LayoutListIcon,
  PenLineIcon,
  RulerIcon,
  TriangleAlertIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = {
  title: { absolute: "Resume Tips | NUBJobs" },
  description:
    "How to structure, write, and upload a student resume that gets shortlisted by employers on NUBJobs.",
};

const SECTIONS = [
  {
    icon: LayoutListIcon,
    title: "Structure",
    bullets: [
      "Name, phone, email, and city at the very top.",
      "A two-line summary of your field and goals.",
      "Education first — students lead with academics.",
      "Experience: internships, jobs, and major projects.",
      "Skills section listing tools you actually use.",
    ],
  },
  {
    icon: PenLineIcon,
    title: "Writing",
    bullets: [
      "Start every bullet with an action verb.",
      "Use past tense for old roles, present for current.",
      "Add measurable results: numbers, sizes, deadlines.",
      "Keep one idea per bullet, one line each.",
      "Write for a human, not a keyword checker.",
    ],
  },
  {
    icon: RulerIcon,
    title: "Length",
    bullets: [
      "One page is right for students and fresh graduates.",
      "Cut coursework that does not serve the job.",
      "Use 10–12pt font with comfortable margins.",
      "Remove references available on request.",
      "If it overflows, tighten — do not shrink the font.",
    ],
  },
  {
    icon: TriangleAlertIcon,
    title: "Common mistakes",
    bullets: [
      "Typos and inconsistent date formats.",
      "A generic objective that fits any job.",
      "Unrelated hobbies with no connection to the role.",
      "Duties instead of achievements.",
      "File names like resume_final_v3.pdf.",
    ],
  },
  {
    icon: FileTextIcon,
    title: "Uploading",
    bullets: [
      "Open your profile page to manage your CV.",
      "Upload your CV from your profile page.",
      "Always export as PDF before uploading.",
      "Name the file Firstname-Lastname-Resume.pdf.",
      "Re-upload after every new experience.",
    ],
  },
] as const;

export default function ResumeTipsPage() {
  return (
    <PageContainer as="main" className="py-12 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Resume Tips
        </h1>
        <p className="mt-3 text-muted-foreground">
          Short, practical rules to make your resume get shortlisted.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2">
        {SECTIONS.map((section) => (
          <Card key={section.title}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <section.icon className="size-5 text-brand-600" />
                {section.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {section.bullets.map((bullet) => (
                  <li
                    key={bullet}
                    className="flex items-start gap-2 text-sm text-muted-foreground"
                  >
                    <CheckCircle2Icon className="mt-0.5 size-4 shrink-0 text-brand-600" />
                    <span>{bullet}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}

        <Card className="bg-muted/40 md:col-span-2">
          <CardContent className="flex flex-col items-center gap-4 py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Your resume lives on your NUBJobs profile, ready to attach to any
              application.
            </p>
            <Button asChild>
              <Link href="/profile">Go to my profile</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
