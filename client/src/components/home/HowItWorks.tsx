import {
  BriefcaseIcon,
  ClipboardCheckIcon,
  FileCheckIcon,
  SearchCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";

import { Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";

interface Step {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const STUDENT_STEPS: Step[] = [
  {
    icon: <UserPlusIcon />,
    title: "Create Profile",
    description:
      "Sign up with your NUB email, add your department, CGPA, and skills to build a standout profile.",
  },
  {
    icon: <SearchCheckIcon />,
    title: "Search Jobs",
    description:
      "Filter openings by category, CGPA, and location to find roles that fit you perfectly.",
  },
  {
    icon: <ClipboardCheckIcon />,
    title: "Apply & Track",
    description:
      "Apply in one click and follow every application's status from a single dashboard.",
  },
];

const EMPLOYER_STEPS: Step[] = [
  {
    icon: <BriefcaseIcon />,
    title: "Post a Job",
    description:
      "Publish a listing in minutes, set CGPA requirements, and target the right departments.",
  },
  {
    icon: <UsersIcon />,
    title: "Review Applicants",
    description:
      "Screen candidates with AI-ranked matches and shortlist the strongest fits fast.",
  },
  {
    icon: <FileCheckIcon />,
    title: "Hire",
    description:
      "Chat, schedule interviews, and send offers — all without leaving the platform.",
  },
];

function Track({
  label,
  accent,
  steps,
}: {
  label: string;
  accent: "brand" | "navy";
  steps: Step[];
}) {
  const chip =
    accent === "brand"
      ? "bg-brand-500/10 text-brand-600 dark:text-brand-100"
      : "bg-navy/10 text-navy dark:bg-white/10 dark:text-white";

  return (
    <div>
      <h3 className="font-heading text-xl font-semibold text-foreground">
        {label}
      </h3>
      <Stagger className="mt-6 space-y-5">
        {steps.map((step, index) => (
          <StaggerItem key={step.title}>
            <div className="relative flex gap-4 rounded-xl border border-border bg-card p-5">
              <div
                className={`flex size-12 shrink-0 items-center justify-center rounded-xl [&_svg]:size-6 ${chip}`}
              >
                {step.icon}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-bold text-brand-600">
                    Step {index + 1}
                  </span>
                </div>
                <h4 className="font-heading font-semibold text-foreground">
                  {step.title}
                </h4>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </div>
  );
}

/**
 * Two parallel "how it works" tracks — one for students, one for employers —
 * each a sequence of numbered, staggered steps.
 */
export function HowItWorks() {
  return (
    <section className="border-y border-border bg-muted/40">
      <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            How It Works
          </h2>
          <p className="mt-3 text-muted-foreground">
            Whether you&apos;re looking for a job or looking to hire, you&apos;re
            three steps away.
          </p>
        </Reveal>

        <div className="mt-12 grid gap-10 lg:grid-cols-2 lg:gap-16">
          <Track label="For Students" accent="brand" steps={STUDENT_STEPS} />
          <Track label="For Employers" accent="navy" steps={EMPLOYER_STEPS} />
        </div>
      </div>
    </section>
  );
}
