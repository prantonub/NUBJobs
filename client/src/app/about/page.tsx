/**
 * /about — public "About NUBJobs" page (server component, App Router).
 *
 * All copy lives in the constants below (stats, mission, features, steps,
 * founder bio, links & trust) so content can be edited in one place
 * without touching the markup.
 */
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Footer } from "@/components/layout/Footer";

import founderPhoto from "@/bg-image/pranto.png";

export const metadata = {
  title: "About | NUBJobs",
  description:
    "NUBJobs is the campus job portal of Northern University Bangladesh. Find jobs, post opportunities, join the community and message professionals.",
};

// ═══ Editable content ══════════════════════════════════════════════════════

/** Hero stats — placeholder numbers; swap in real platform numbers anytime. */
const STATS = [
  { label: "Students", value: "5,000+" },
  { label: "Employers", value: "300+" },
  { label: "Opportunities", value: "1,200+" },
];

const MISSION = {
  heading: "Every student deserves a fair first chance",
  paragraph:
    "NUBJobs exists so Northern University Bangladesh students can earn, learn and build a career while they study. Jobs, community and mentorship live together in one campus-built platform — so finding your first opportunity takes days, not months.",
  commitments: [
    {
      title: "Free for every student",
      description: "Browsing, applying, posting and messaging are free — now and always.",
    },
    {
      title: "Verified employers",
      description: "Every company is reviewed by our admins before it can reach students.",
    },
    {
      title: "Privacy first",
      description: "Your data is yours. We never sell it to advertisers or third parties.",
    },
  ],
};

/** One entry per feature Card in the section-3 grid. */
const FEATURES = [
  {
    category: "Jobs",
    title: "Find your next opportunity",
    items: [
      "Browse and filter jobs by type, location and category",
      "Apply with one click and track every application",
      "Save jobs to apply later",
    ],
  },
  {
    category: "Employers",
    title: "Hire with confidence",
    items: [
      "Post jobs (admin-approved before going live)",
      "Kanban pipeline: APPLIED → REVIEWED → SHORTLISTED → INTERVIEWED → HIRED",
      "Analytics on jobs and applications",
      "Verified company badge",
    ],
  },
  {
    category: "Community",
    title: "Join the conversation",
    items: [
      "Discussion forums",
      "Q&A with best-answer marking",
      "Success stories",
      "Mentoring and events",
    ],
  },
  {
    category: "Social & Networking",
    title: "Grow your network",
    items: [
      "Follow students, employers and peers",
      "Post updates with photos and hashtags",
      "Like and comment, with threaded replies",
      "Trending hashtags and suggested connections",
    ],
  },
  {
    category: "Messaging",
    title: "Message anyone, instantly",
    items: [
      "Real-time direct messages with read receipts and typing status",
      "Filter conversations: All, Professional, Community",
      "Message employers or students from any profile or post",
    ],
  },
  {
    category: "AI Assistant",
    title: "Answers when you need them",
    items: ["Chatbot for quick answers about using NUBJobs"],
  },
  {
    category: "Admin & Safety",
    title: "A safe, moderated platform",
    items: [
      "Job approval workflow",
      "Company verification",
      "Report content and users",
      "Audit logs for admin actions",
    ],
  },
];

const STEPS = [
  {
    title: "Create your profile",
    description:
      "Add your skills, education and interests so peers and employers know who you are.",
  },
  {
    title: "Find or post opportunities",
    description:
      "Browse filtered jobs or publish a vacancy — every post is approved by admins first.",
  },
  {
    title: "Connect, apply and get hired",
    description:
      "Apply in one click, message employers and classmates, and track it all in one place.",
  },
];

const FOUNDER = {
  name: "Tauhidul Islam Pranto",
  initials: "TP",
  photo: founderPhoto,
  bio: "NUBJobs was built for the students of Northern University Bangladesh — because finding that first internship or job on campus shouldn't be a struggle. Tauhidul created NUBJobs to give every NUB student one trusted place to discover opportunities, meet mentors and take the next step in their career.",
  email: "support@nubjobs.online",
  linkedin: "#",
  github: "#",
};

const TRUST_ITEMS = [
  "Verified company badges",
  "Reporting tools for posts and users",
  "Admin review of all job posts",
  "Your data is never sold",
];

/** Focus ring shared by plain (non-Button) links on this page. */
const LINK_FOCUS =
  "rounded-sm outline-none focus-visible:ring-3 focus-visible:ring-ring/50";

// ── Shared markup ───────────────────────────────────────────────────────────

/** Badge above a section's `text-3xl` heading (spec §Layout). */
function SectionHeading({
  id,
  badge,
  children,
}: {
  id: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <div className="mb-8">
      <Badge variant="outline">{badge}</Badge>
      <h2 id={id} className="mt-3 text-3xl font-bold tracking-tight">
        {children}
      </h2>
    </div>
  );
}

export default function AboutPage() {
  return (
    <>
    <main className="flex-1 max-w-6xl mx-auto px-4 sm:px-6 py-16 space-y-24">
      {/* 1. HERO */}
      <section aria-labelledby="hero">
        <Badge variant="outline">Northern University Bangladesh</Badge>
        <h1
          id="hero"
          className="mt-4 text-4xl font-bold tracking-tight sm:text-5xl"
        >
          Connecting talent with opportunity
        </h1>
        <p className="mt-4 max-w-2xl text-lg text-muted-foreground">
          NUBJobs helps students find internships and first jobs, and helps
          employers reach qualified graduates.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button asChild size="lg">
            <Link href="/jobs">Browse Jobs</Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/employer/post-job">Post a Job</Link>
          </Button>
        </div>
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {STATS.map((stat) => (
            <Card key={stat.label} className="text-center">
              <CardContent>
                <p className="text-3xl font-bold tracking-tight">{stat.value}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {stat.label}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 2. MISSION */}
      <section aria-labelledby="mission">
        <div className="grid grid-cols-1 items-start gap-8 md:grid-cols-2">
          <div>
            <Badge variant="outline">Our mission</Badge>
            <h2 id="mission" className="mt-3 text-3xl font-bold tracking-tight">
              {MISSION.heading}
            </h2>
            <p className="mt-4 text-muted-foreground">{MISSION.paragraph}</p>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>What we commit to</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-4">
                {MISSION.commitments.map((commitment) => (
                  <li key={commitment.title}>
                    <p className="font-medium">{commitment.title}</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {commitment.description}
                    </p>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* 3. PLATFORM FEATURES */}
      <section aria-labelledby="features">
        <SectionHeading id="features" badge="Platform features">
          Everything NUBJobs offers
        </SectionHeading>
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((feature) => (
            <Card key={feature.category} className="h-full">
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  {feature.category}
                </Badge>
                <h3 className="text-base font-semibold leading-snug">
                  {feature.title}
                </h3>
              </CardHeader>
              <CardContent>
                <ul className="list-disc space-y-2 pl-5 text-sm text-muted-foreground marker:text-primary">
                  {feature.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* 4. HOW IT WORKS */}
      <section aria-labelledby="how-it-works">
        <SectionHeading id="how-it-works" badge="How it works">
          Three steps from profile to offer
        </SectionHeading>
        <ol className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Card className="h-full">
                <CardHeader>
                  <Badge className="size-10 rounded-full px-0 text-sm">
                    {index + 1}
                  </Badge>
                  <h3 className="mt-3 text-base font-semibold leading-snug">
                    {step.title}
                  </h3>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    {step.description}
                  </p>
                </CardContent>
              </Card>
            </li>
          ))}
        </ol>
      </section>

      {/* 5. FOUNDER */}
      <section aria-labelledby="founder">
        <Card>
          <CardContent className="grid grid-cols-1 items-center gap-8 md:grid-cols-2">
            <Avatar className="mx-auto size-64 rounded-xl after:rounded-xl md:mx-0">
              <AvatarImage
                asChild
                src={FOUNDER.photo.src}
                alt={`Portrait of ${FOUNDER.name}`}
              >
                <Image
                  src={FOUNDER.photo}
                  alt={`Portrait of ${FOUNDER.name}`}
                  width={400}
                  height={400}
                  className="size-64 rounded-xl object-cover"
                />
              </AvatarImage>
              <AvatarFallback className="rounded-xl text-4xl font-semibold">
                {FOUNDER.initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <Badge variant="secondary">Founder</Badge>
              <h2 id="founder" className="mt-3 text-2xl font-bold tracking-tight">
                {FOUNDER.name}
              </h2>
              <p className="mt-4 text-muted-foreground">{FOUNDER.bio}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild variant="outline">
                  <a href={FOUNDER.linkedin} target="_blank" rel="noreferrer">
                    LinkedIn
                  </a>
                </Button>
                <Button asChild variant="outline">
                  <a href={FOUNDER.github} target="_blank" rel="noreferrer">
                    GitHub
                  </a>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Email:{" "}
                <a
                  href={`mailto:${FOUNDER.email}`}
                  className={`font-medium text-primary underline underline-offset-4 ${LINK_FOCUS}`}
                >
                  {FOUNDER.email}
                </a>
              </p>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* 6. TRUST & SAFETY */}
      <section aria-labelledby="trust-safety">
        <SectionHeading id="trust-safety" badge="Trust &amp; safety">
          Built to be safe by default
        </SectionHeading>
        <Card>
          <CardContent>
            <ul className="list-disc space-y-3 pl-5 text-sm text-muted-foreground marker:text-primary">
              {TRUST_ITEMS.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </section>

    </main>
    <Footer />
    </>
  );
}