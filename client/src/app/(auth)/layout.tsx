import Link from "next/link";
import {
  BotIcon,
  GraduationCapIcon,
  ShieldCheckIcon,
  SlidersHorizontalIcon,
} from "lucide-react";

interface AuthLayoutProps {
  children: React.ReactNode;
}

const HIGHLIGHTS = [
  {
    icon: <BotIcon />,
    title: "AI Resume Analyzer",
    description: "Score your resume against every job in seconds.",
  },
  {
    icon: <SlidersHorizontalIcon />,
    title: "CGPA-matched jobs",
    description: "Only see roles you actually qualify for.",
  },
  {
    icon: <ShieldCheckIcon />,
    title: "NUB-verified employers",
    description: "Every company is vetted for our campus.",
  },
];

/**
 * Shared shell for all authentication pages. Split-screen on desktop: the form
 * (children) sits on the left, a gradient brand/benefits panel on the right.
 * On mobile the panel is hidden and only the form + logo show.
 */
export default function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="flex min-h-svh flex-col lg:grid lg:grid-cols-2">
      {/* Left: form column */}
      <div className="flex flex-1 flex-col px-4 py-8 sm:px-6 lg:px-12">
        <Link href="/" className="flex items-center gap-2 self-start">
          <span className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-brand-700 text-white">
            <GraduationCapIcon className="size-5" />
          </span>
          <span className="font-heading text-lg font-bold tracking-tight text-foreground">
            NUB<span className="text-brand-600">Jobs</span>
          </span>
        </Link>

        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>

      {/* Right: brand / benefits panel (desktop only) */}
      <div className="relative hidden overflow-hidden bg-gradient-to-br from-brand-600 via-brand-700 to-navy text-white lg:flex lg:flex-col lg:justify-center lg:px-12 xl:px-16">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand-500/30 blur-3xl"
        />
        <div
          aria-hidden
          className="pointer-events-none absolute -bottom-32 -left-24 size-96 rounded-full bg-brand-900/40 blur-3xl"
        />

        <div className="relative max-w-md">
          <h2 className="font-heading text-3xl font-bold tracking-tight xl:text-4xl">
            Your campus career starts here.
          </h2>
          <p className="mt-4 text-blue-100">
            Join thousands of Northern University Bangladesh students who found
            jobs and internships built around their degree.
          </p>

          <ul className="mt-10 space-y-6">
            {HIGHLIGHTS.map((item) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur [&_svg]:size-5">
                  {item.icon}
                </span>
                <div>
                  <p className="font-heading font-semibold">{item.title}</p>
                  <p className="text-sm text-blue-100">{item.description}</p>
                </div>
              </li>
            ))}
          </ul>

          <div className="mt-12 flex items-center gap-6 border-t border-white/15 pt-6">
            <div>
              <p className="font-heading text-2xl font-bold">500+</p>
              <p className="text-sm text-blue-100">Jobs posted</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-bold">1000+</p>
              <p className="text-sm text-blue-100">Students placed</p>
            </div>
            <div>
              <p className="font-heading text-2xl font-bold">95%</p>
              <p className="text-sm text-blue-100">Placement rate</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
