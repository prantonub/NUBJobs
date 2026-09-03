import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { CompanyLogo } from "@/components/ui/CompanyLogo";
import { Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";

const COMPANIES = [
  "Brain Station 23",
  "Pathao",
  "Shohoz",
  "Sheba.xyz",
  "Tiger IT",
  "BRAC Bank",
  "bKash",
  "Grameenphone",
] as const;

/**
 * Trust strip of hiring-partner logos followed by an employer CTA banner.
 * Logos use the shared CompanyLogo fallback (initials) since these are samples.
 */
export function CompaniesStrip() {
  return (
    <section className="border-t border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal className="text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
            Trusted by companies hiring NUB students
          </p>
        </Reveal>

        <Stagger className="mt-8 flex flex-wrap items-center justify-center gap-4 sm:gap-6">
          {COMPANIES.map((company) => (
            <StaggerItem key={company}>
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3">
                <CompanyLogo name={company} size="sm" />
                <span className="text-sm font-medium text-foreground">
                  {company}
                </span>
              </div>
            </StaggerItem>
          ))}
        </Stagger>

        {/* Employer CTA banner */}
        <Reveal className="mt-14">
          <div className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-brand-600 via-brand-700 to-navy px-6 py-12 text-center text-white sm:px-12 sm:py-16">
            <div
              aria-hidden
              className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full bg-white/10 blur-3xl"
            />
            <h2 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
              Hiring? Reach thousands of NUB students.
            </h2>
            <p className="mx-auto mt-3 max-w-2xl text-blue-100">
              Post your first job free, run a campus drive, and connect with
              qualified candidates from Northern University Bangladesh.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button
                asChild
                className="h-12 w-full bg-white px-6 text-base text-brand-700 hover:bg-blue-50 sm:w-auto"
              >
                <Link href="/register?role=employer">
                  Join as Employer
                  <ArrowRightIcon className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                variant="outline"
                className="h-12 w-full border-white/40 bg-transparent px-6 text-base text-white hover:bg-white/10 hover:text-white sm:w-auto"
              >
                <Link href="/employer/jobs/new">Post a Job</Link>
              </Button>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
