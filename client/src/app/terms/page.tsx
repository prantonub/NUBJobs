import type { Metadata } from "next";
import Link from "next/link";
import type { ReactNode } from "react";

import { LEGAL } from "@/lib/legal";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = {
  title: { absolute: "Terms of Service | NUBJobs" },
  description: `The rules for using ${LEGAL.operatorName} as a student or an employer.`,
};

interface LegalSection {
  id: string;
  title: string;
  body: ReactNode;
}

const supportMailto = `mailto:${LEGAL.supportEmail}`;

const SECTIONS: LegalSection[] = [
  {
    id: "acceptable-use",
    title: "Acceptable use",
    body: (
      <p>
        Use {LEGAL.operatorName} only for lawful, honest purposes. Do not post
        false job offers, fake profiles, spam, harassment or illegal content.
      </p>
    ),
  },
  {
    id: "student-and-employer-responsibilities",
    title: "Student and employer responsibilities",
    body: (
      <p>
        Students must give accurate information in their profiles and
        applications. Employers must post real jobs and treat applicants
        respectfully.
      </p>
    ),
  },
  {
    id: "job-posts-and-admin-approval",
    title: "Job posts and admin approval",
    body: (
      <p>
        Every job post is reviewed by an admin before it goes live.{" "}
        {LEGAL.operatorName} may reject or remove posts that break these terms.
      </p>
    ),
  },
  {
    id: "company-verification",
    title: "Company verification",
    body: (
      <p>
        Verified badges are granted after document review. A badge does not
        guarantee a job or the company&apos;s performance.
      </p>
    ),
  },
  {
    id: "community-content-and-reporting",
    title: "Community content and reporting",
    body: (
      <p>
        You own the content you post but grant {LEGAL.operatorName} permission
        to display it on the platform. Report content that breaks these terms
        using the Report button.
      </p>
    ),
  },
  {
    id: "account-suspension",
    title: "Account suspension",
    body: (
      <p>
        {LEGAL.operatorName} may warn, suspend or remove accounts that violate
        these terms.
      </p>
    ),
  },
  {
    id: "limitation-of-liability",
    title: "Limitation of liability",
    body: (
      <p>
        {LEGAL.operatorName} connects students and employers but is not
        responsible for hiring decisions, employment terms or the conduct of
        users outside the platform.
      </p>
    ),
  },
  {
    id: "changes-to-these-terms",
    title: "Changes to these terms",
    body: (
      <p>
        We may update these terms. Material changes will be announced on the
        platform before they take effect.
      </p>
    ),
  },
  {
    id: "governing-law",
    title: "Governing law",
    body: (
      <p>
        These terms are governed by the laws of {LEGAL.governingCountry}.
      </p>
    ),
  },
  {
    id: "contact",
    title: "Contact",
    body: (
      <p>
        Questions:{" "}
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
];
export default function TermsPage() {
  return (
    <PageContainer as="main" className="py-12 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Terms of Service
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
        Read together with our{" "}
        <Link
          href="/privacy"
          className="font-medium text-foreground underline underline-offset-4"
        >
          Privacy Policy
        </Link>
        .
      </p>
    </PageContainer>
  );
}