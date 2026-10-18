import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { LEGAL } from "@/lib/legal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = {
  title: { absolute: "Privacy Policy | NUBJobs" },
  description: `How ${LEGAL.operatorName} collects, uses, and protects student and employer data.`,
};

interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

const supportMailto = `mailto:${LEGAL.supportEmail}`;

const SECTIONS: LegalSection[] = [
  {
    id: "information-we-collect",
    title: "Information we collect",
    body: (
      <p>
        Account details (name, email, university details), profile information,
        job applications, posts, comments, messages, and reports you submit.
      </p>
    ),
  },
  {
    id: "how-we-use-your-information",
    title: "How we use your information",
    body: (
      <p>
        To run accounts, show job applications to employers, send
        notifications, deliver messages, prevent abuse, and improve the
        platform.
      </p>
    ),
  },
  {
    id: "who-we-share-it-with",
    title: "Who we share it with",
    body: (
      <>
        <p>
          Employers see the profile and application details of students who
          apply to their jobs. Admins can view account and moderation records
          when needed for support or safety.
        </p>
        <p>We do not sell personal data.</p>
      </>
    ),
  },
  {
    id: "messages-and-community-content",
    title: "Messages and community content",
    body: (
      <>
        <p>Direct messages are private between the people involved.</p>
        <p>
          Public posts, comments and profiles can be seen by other users.
          Reported content may be reviewed by admins.
        </p>
      </>
    ),
  },
  {
    id: "student-talent-visibility",
    title: "Student talent visibility",
    body: (
      <p>
        Your profile is hidden from employer talent search unless you turn on
        &quot;Show my profile to employers&quot;. You can turn this off at any
        time.
      </p>
    ),
  },
  {
    id: "your-choices",
    title: "Your choices",
    body: (
      <p>
        You can edit your profile, delete your posts, block users, mute
        notifications and request account deletion by emailing{" "}
        <Link
          href={supportMailto}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {LEGAL.supportEmail}
        </Link>
        .
      </p>
    ),
  },
  {
    id: "data-security",
    title: "Data security",
    body: (
      <p>
        Passwords are stored in encrypted form. Admin actions are recorded in
        audit logs. No system is perfectly secure, so report suspected problems
        to{" "}
        <Link
          href={supportMailto}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {LEGAL.supportEmail}
        </Link>
        .
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions about this policy:{" "}
        <Link
          href={supportMailto}
          className="font-medium text-foreground underline underline-offset-4"
        >
          {LEGAL.supportEmail}
        </Link>
        , {LEGAL.universityName}.
      </p>
    ),
  },
];
export default function PrivacyPage() {
  return (
    <PageContainer as="main" className="py-12 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Privacy Policy
        </h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Last updated: {LEGAL.lastUpdated}
        </p>
      </div>

      <div className="mx-auto mt-10 max-w-3xl space-y-6">
        {SECTIONS.map((section, index) => (
          <Card
            key={section.id}
            id={section.id}
            aria-labelledby={`${section.id}-heading`}
            className="scroll-mt-24"
          >
            <CardHeader>
              <h2
                id={`${section.id}-heading`}
                className="font-heading text-lg font-semibold text-foreground"
              >
                {index + 1}. {section.title}
              </h2>
            </CardHeader>
            <CardContent className="space-y-3 text-sm leading-relaxed text-muted-foreground">
              {section.body}
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="mx-auto mt-8 max-w-3xl text-center text-xs text-muted-foreground">
        These policies are governed by the laws of {LEGAL.governingCountry}.
      </p>
    </PageContainer>
  );
}