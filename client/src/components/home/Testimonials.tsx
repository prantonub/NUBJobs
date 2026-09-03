import { QuoteIcon, StarIcon } from "lucide-react";

import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Reveal, Stagger, StaggerItem } from "@/components/motion-primitives";

interface Testimonial {
  name: string;
  department: string;
  initials: string;
  quote: string;
  /** Tailwind classes for the avatar fallback tint. */
  tint: string;
}

const TESTIMONIALS: Testimonial[] = [
  {
    name: "Tahmid Rahman",
    department: "CSE, Batch 210",
    initials: "TR",
    quote:
      "The CGPA filter meant I only saw jobs I actually qualified for. I landed a frontend role at Brain Station 23 within three weeks of signing up.",
    tint: "bg-blue-500/15 text-blue-600 dark:text-blue-300",
  },
  {
    name: "Nusrat Jahan",
    department: "BBA, Batch 201",
    initials: "NJ",
    quote:
      "The AI Resume Analyzer completely changed how I applied. My callback rate doubled and I got hired as a marketing executive at Shohoz.",
    tint: "bg-pink-500/15 text-pink-600 dark:text-pink-300",
  },
  {
    name: "Sabbir Hossain",
    department: "EEE, Batch 202",
    initials: "SH",
    quote:
      "A campus drive on NUBJobs got my resume straight to the recruiter. The mock interview practice sealed it — I start at Tiger IT next month.",
    tint: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-300",
  },
];

/**
 * Student success stories. Three cards, each with an avatar (initials
 * fallback), name, department, star rating, and a quote — revealed in sequence.
 */
export function Testimonials() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8 lg:py-20">
      <Reveal className="mx-auto max-w-2xl text-center">
        <h2 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Loved by NUB Students
        </h2>
        <p className="mt-3 text-muted-foreground">
          Real stories from students who found their start through NUBJobs.
        </p>
      </Reveal>

      <Stagger className="mt-12 grid gap-6 md:grid-cols-3">
        {TESTIMONIALS.map((testimonial) => (
          <StaggerItem key={testimonial.name}>
            <figure className="flex h-full flex-col rounded-2xl border border-border bg-card p-6 shadow-sm">
              <QuoteIcon
                aria-hidden
                className="size-8 text-brand-500/30"
                fill="currentColor"
              />
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-foreground">
                “{testimonial.quote}”
              </blockquote>

              <div
                className="mt-4 flex gap-0.5 text-amber-400"
                aria-label="Rated 5 out of 5"
              >
                {Array.from({ length: 5 }).map((_, i) => (
                  <StarIcon key={i} className="size-4" fill="currentColor" />
                ))}
              </div>

              <figcaption className="mt-4 flex items-center gap-3 border-t border-border pt-4">
                <Avatar size="lg" className="size-11">
                  <AvatarFallback className={`font-semibold ${testimonial.tint}`}>
                    {testimonial.initials}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="font-heading font-semibold text-foreground">
                    {testimonial.name}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {testimonial.department}
                  </p>
                </div>
              </figcaption>
            </figure>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
