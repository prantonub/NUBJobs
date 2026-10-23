import Link from "next/link";
import Image from "next/image";
import { PageContainer } from "@/components/ui/PageContainer";
import { Separator } from "@/components/ui/separator";
import { BrandLogo } from "@/components/ui/BrandLogo";
import universityLogo from "@/bg-image/Northern University Logo.png";

const FOOTER_LINKS: Record<string, Array<{ label: string; href: string }>> = {
  "For Students": [
    { label: "Browse Jobs", href: "/jobs" },
    { label: "Internships", href: "/jobs?type=internship" },
    { label: "Companies", href: "/companies" },
    { label: "My Applications", href: "/my-applications" },
  ],
  "For Employers": [
    { label: "Post a Job", href: "/employer/post-job" },
    { label: "Search Talent", href: "/employer/search-talent" },
    { label: "Pricing", href: "/pricing" },
    { label: "Employer Dashboard", href: "/employer/dashboard" },
  ],
  Resources: [
    { label: "Career Blog", href: "/blog" },
    { label: "Resume Tips", href: "/resources/resume-tips" },
    { label: "FAQ", href: "/faq" },
    { label: "Help Center", href: "/help" },
  ],
  Company: [
    { label: "About NUBJobs", href: "/about" },
    { label: "Contact", href: "/social/contact" },
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
};

/**
 * Shared site footer: brand blurb, four link columns, and a bottom bar with
 * copyright and the support email.
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
                <BrandLogo className="size-5" />
              </span>
              <span className="font-heading text-lg font-bold tracking-tight text-foreground">
                NUB<span className="text-brand-600">Jobs</span>
              </span>
            </Link>
            <Image
              src={universityLogo}
              alt="Northern University Bangladesh logo"
              className="mt-4 h-10 w-auto"
            />
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">
              The job & internship portal for Northern University Bangladesh
              students find opportunities, track applications, and launch your
              career.
            </p>
          </div>

          {Object.entries(FOOTER_LINKS).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold">{title}</h3>
              <ul className="mt-3 space-y-2">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10">
          <Separator />
          <div className="flex flex-col items-center justify-between gap-2 pt-6 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              © {year} NUBJobs · Northern University Bangladesh
            </p>
            <a
              href="mailto:support@nubjobs.online"
              className="rounded-sm text-sm text-muted-foreground underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
            >
              support@nubjobs.online
            </a>
          </div>
        </div>
      </PageContainer>
    </footer>
  );
}