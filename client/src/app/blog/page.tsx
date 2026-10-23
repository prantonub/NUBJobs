import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRightIcon, CalendarIcon, ClockIcon } from "lucide-react";

import { BLOG_POSTS } from "@/lib/blog-posts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = {
  title: { absolute: "Career Blog | NUBJobs" },
  description:
    "Practical career advice for NUB students interview preparation, resume writing, and making the most of internships.",
};

export default function BlogPage() {
  return (
    <PageContainer as="main" className="py-12 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Career Blog
        </h1>
        <p className="mt-3 text-muted-foreground">
          Practical advice for interviews, resumes, and your first years at work.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-5xl gap-6 md:grid-cols-2 lg:grid-cols-3">
        {BLOG_POSTS.map((post) => (
          <Link key={post.slug} href={`/blog/${post.slug}`} className="group flex">
            <Card className="flex w-full flex-col transition-shadow group-hover:shadow-md">
              <CardHeader>
                <Badge variant="secondary" className="w-fit">
                  {post.category}
                </Badge>
                <CardTitle className="group-hover:text-brand-600">
                  {post.title}
                </CardTitle>
                <p className="text-sm text-muted-foreground">{post.excerpt}</p>
              </CardHeader>
              <CardContent className="flex-1" />
              <CardFooter className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <CalendarIcon className="size-3.5" />
                  {post.date}
                </span>
                <span className="flex items-center gap-1.5">
                  <ClockIcon className="size-3.5" />
                  {post.readingTime}
                </span>
              </CardFooter>
              <div className="border-t border-border px-(--card-spacing) py-3">
                <span className="flex items-center gap-1.5 text-sm font-medium text-brand-600">
                  Read article
                  <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
