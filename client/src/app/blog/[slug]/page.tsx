import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeftIcon, CalendarIcon, ClockIcon } from "lucide-react";

import { BLOG_POSTS } from "@/lib/blog-posts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageContainer } from "@/components/ui/PageContainer";

interface BlogPostPageProps {
  params: Promise<{ slug: string }>;
}

export function generateStaticParams() {
  return BLOG_POSTS.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({
  params,
}: BlogPostPageProps): Promise<Metadata> {
  const { slug } = await params;
  const post = BLOG_POSTS.find((entry) => entry.slug === slug);
  if (!post) return { title: { absolute: "Post not found | NUBJobs" } };
  return {
    title: { absolute: `${post.title} | NUBJobs` },
    description: post.excerpt,
  };
}

export default async function BlogPostPage({ params }: BlogPostPageProps) {
  const { slug } = await params;
  const post = BLOG_POSTS.find((entry) => entry.slug === slug);
  if (!post) notFound();

  return (
    <PageContainer as="main" className="max-w-3xl py-12 lg:py-16">
      <article>
        <header>
          <Badge variant="secondary" className="w-fit">
            {post.category}
          </Badge>
          <h1 className="mt-4 font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            {post.title}
          </h1>
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <CalendarIcon className="size-4" />
              {post.date}
            </span>
            <span className="flex items-center gap-1.5">
              <ClockIcon className="size-4" />
              {post.readingTime}
            </span>
          </div>
          <Separator className="mt-6" />
        </header>

        <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
          {post.body.map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      </article>

      <div className="mt-10">
        <Button asChild variant="outline">
          <Link href="/blog">
            <ArrowLeftIcon className="size-4" />
            Back to blog
          </Link>
        </Button>
      </div>
    </PageContainer>
  );
}
