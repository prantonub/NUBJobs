import Link from "next/link";
import { GraduationCapIcon } from "lucide-react";
import { PageContainer } from "@/components/ui/PageContainer";

type FooterLink = { label: string; href: string };
type FooterColumn = { title: string; links: FooterLink[] };

const COLUMNS: FooterColumn[] = [
  {
    title: "For Students",
    links: [
      { label: "Browse Jobs", href: "/jobs" },
      { label: "Internships", href: "/jobs?type=INTERNSHIP" },
      { label: "Companies", href: "/companies" },
      { label: "My Applications", href: "/dashboard/applications" },
    ],
  },
  {
    title: "For Employers",
    links: [
      { label: "Post a Job", href: "/employer/jobs/new" },
      { label: "Search Talent", href: "/employer/candidates" },
      { label: "Pricing", href: "/pricing" },
      { label: "Employer Dashboard", href: "/employer" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "Career Blog", href: "/blog" },
      { label: "Resume Tips", href: "/resources/resume" },
      { label: "FAQ", href: "/faq" },
      { label: "Help Center", href: "/help" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About NUBJobs", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Privacy Policy", href: "/privacy" },
      { label: "Terms of Service", href: "/terms" },
    ],
  },
];

/**
 * Site footer: brand blurb, four link columns, and a bottom bar with copyright
 * and legal links.
 */
export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t border-border bg-muted/30">
      <PageContainer className="py-12">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2">
              <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
                <GraduationCapIcon className="size-5" />
              </span>
              <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                NUB<span className="text-brand-600">Jobs</span>
              </span>
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The job & internship portal for Northern University Bangladesh
              students — find opportunities, track applications, and launch your
              career.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <div key={column.title}>
              <h3 className="text-sm font-semibold text-foreground">
                {column.title}
              </h3>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-brand-600"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-center justify-between gap-4 border-t border-border pt-6 sm:flex-row">
          <p className="text-sm text-muted-foreground">
            © {year} NUBJobs. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <Link
              href="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Terms
            </Link>
            <Link
              href="/contact"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Contact
            </Link>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}
