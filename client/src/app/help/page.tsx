"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  BriefcaseBusinessIcon,
  LifeBuoyIcon,
  MessageSquareIcon,
  PencilLineIcon,
  SearchIcon,
  ShieldAlertIcon,
  UserIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageContainer } from "@/components/ui/PageContainer";

const TOPICS = [
  {
    icon: UserIcon,
    title: "Account and profile",
    description: "Sign up, verification, and editing your profile.",
    href: "/faq",
  },
  {
    icon: PencilLineIcon,
    title: "Applying for jobs",
    description: "Applications, saved jobs, and tracking status.",
    href: "/faq",
  },
  {
    icon: BriefcaseBusinessIcon,
    title: "Posting jobs (employers)",
    description: "Drafting, submitting, and approving job posts.",
    href: "/faq",
  },
  {
    icon: MessageSquareIcon,
    title: "Messaging and community",
    description: "Professional chats, community posts, and notifications.",
    href: "/faq",
  },
  {
    icon: ShieldAlertIcon,
    title: "Report a problem",
    description: "Fake job posts, bugs, and account issues.",
    href: "/social/contact",
  },
] as const;

/**
 * /help — searchable Help Center. Client component: the search input filters
 * the category cards locally (no API involved).
 */
export default function HelpPage() {
  const [query, setQuery] = useState("");

  const filteredTopics = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return TOPICS;
    return TOPICS.filter(
      (topic) =>
        topic.title.toLowerCase().includes(needle) ||
        topic.description.toLowerCase().includes(needle)
    );
  }, [query]);

  return (
    <PageContainer as="main" className="py-12 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Help Center
        </h1>
        <p className="mt-3 text-muted-foreground">
          Find answers fast, or contact us if you get stuck.
        </p>
      </div>

      <div className="mx-auto mt-8 max-w-xl">
        <Label htmlFor="help-search" className="sr-only">
          Search help topics
        </Label>
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="help-search"
            type="search"
            placeholder="Search help topics"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filteredTopics.length === 0 ? (
        <div className="mx-auto mt-10 max-w-md text-center">
          <p className="text-sm text-muted-foreground">
            No topics match your search. Contact support.
          </p>
          <Button asChild className="mt-4">
            <Link href="/social/contact">Contact support</Link>
          </Button>
        </div>
      ) : (
        <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredTopics.map((topic) => (
            <Card key={topic.title} className="flex flex-col">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <topic.icon className="size-5 text-brand-600" />
                  {topic.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{topic.description}</p>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter>
                <Button asChild variant="outline" size="sm">
                  <Link href={topic.href}>View articles</Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      <div className="mx-auto mt-10 max-w-5xl">
        <Card className="bg-muted/40">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoyIcon className="size-5 text-brand-600" />
              Still need help?
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Our support team replies to every message, usually within one
              working day.
            </p>
          </CardHeader>
          <CardFooter>
            <Button asChild>
              <Link href="/social/contact">Contact support</Link>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </PageContainer>
  );
}
