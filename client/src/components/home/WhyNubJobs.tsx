import {
  BotIcon,
  CalendarCheckIcon,
  CheckIcon,
  GraduationCapIcon,
  MessagesSquareIcon,
  MicIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "lucide-react";

import { Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
  /** Whether the legacy job board (BDJobs) offers this. */
  onBdJobs: boolean;
}

const FEATURES: Feature[] = [
  {
    icon: <BotIcon />,
    title: "AI Resume Analyzer",
    description:
      "Instant, AI-powered feedback that scores your resume against each job and suggests concrete fixes.",
    onBdJobs: false,
  },
  {
    icon: <SlidersHorizontalIcon />,
    title: "CGPA Filter",
    description:
      "See only the roles you actually qualify for — listings are matched to your CGPA automatically.",
    onBdJobs: false,
  },
  {
    icon: <CalendarCheckIcon />,
    title: "Campus Drives",
    description:
      "Employers run NUB-exclusive hiring drives with dedicated slots reserved for our students.",
    onBdJobs: false,
  },
  {
    icon: <MessagesSquareIcon />,
    title: "Real-time Chat",
    description:
      "Message recruiters directly and get answers in real time — no more waiting on email threads.",
    onBdJobs: false,
  },
  {
    icon: <MicIcon />,
    title: "Mock Interview",
    description:
      "Practice with AI-driven mock interviews tailored to your field before the real thing.",
    onBdJobs: false,
  },
  {
    icon: <GraduationCapIcon />,
    title: "University Targeting",
    description:
      "Every posting is curated for NUB students, so you compete with your peers — not the whole country.",
    onBdJobs: false,
  },
];

/**
 * Feature grid positioning NUBJobs against a generic legacy job board. Each
 * card fades in with a staggered delay and shows a NUBJobs-vs-BDJobs comparison.
 */
export function WhyNubJobs() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <span className="inline-flex items-center rounded-full bg-brand-500/10 px-3 py-1 text-xs font-medium text-brand-600 dark:text-brand-100">
          Why NUBJobs
        </span>
        <h2 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Built for students, not the whole country
        </h2>
        <p className="mt-3 text-muted-foreground">
          Generic job boards weren&apos;t made for campus hiring. Here&apos;s
          what you get on NUBJobs that BDJobs can&apos;t offer.
        </p>
      </Reveal>

      <Stagger className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((feature) => (
          <StaggerItem key={feature.title}>
            <div className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 transition-shadow hover:shadow-md">
              <div className="flex size-12 items-center justify-center rounded-xl bg-brand-500/10 text-brand-600 [&_svg]:size-6 dark:text-brand-100">
                {feature.icon}
              </div>
              <h3 className="mt-4 font-heading text-lg font-semibold text-foreground">
                {feature.title}
              </h3>
              <p className="mt-2 flex-1 text-sm text-muted-foreground">
                {feature.description}
              </p>

              <div className="mt-5 grid grid-cols-2 gap-2 border-t border-border pt-4 text-sm">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <span className="flex size-5 items-center justify-center rounded-full bg-green-500/15 text-green-600 dark:text-green-400 [&_svg]:size-3.5">
                    <CheckIcon />
                  </span>
                  NUBJobs
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span className="flex size-5 items-center justify-center rounded-full bg-red-500/10 text-red-500 [&_svg]:size-3.5">
                    {feature.onBdJobs ? <CheckIcon /> : <XIcon />}
                  </span>
                  BDJobs
                </div>
              </div>
            </div>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
