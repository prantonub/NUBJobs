/**
 * /pricing — public pricing page (server component).
 *
 * All plan copy lives in the PRICING constant so the offer can be edited in
 * one place. No price number is rendered anywhere except inside that constant.
 */
import type { Metadata } from "next";
import Link from "next/link";
import { CheckIcon } from "lucide-react";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { PageContainer } from "@/components/ui/PageContainer";
import { Separator } from "@/components/ui/separator";

export const metadata: Metadata = {
  title: { absolute: "Pricing | NUBJobs" },
  description:
    "NUBJobs is free for students and graduates. Employers post free during launch — every posting is approved by an admin.",
};

const PRICING = {
  students: {
    badge: "For students",
    name: "Students",
    price: "Free",
    priceNote: "Free for every NUB student and graduate — always.",
    features: [
      "Create your profile and get discovered by employers",
      "Apply to unlimited jobs and internships",
      "Join the campus community and study groups",
      "Message employers about your applications",
    ],
    cta: { label: "Browse jobs", href: "/jobs" },
  },
  employers: {
    badge: "For employers",
    name: "Employers",
    price: "Free during launch",
    priceNote:
      "Every posting is reviewed by our admin team before it goes live.",
    features: [
      "Job posting with admin approval",
      "Applicant pipeline to track every stage",
      "Search opted-in student talent by program and skills",
    ],
    cta: { label: "Post a job", href: "/employer/post-job" },
  },
  note: "Plans may change in the future. Existing users will be notified first.",
  faqs: [
    {
      question: "Is there a fee to apply for jobs?",
      answer:
        "No. Applying on NUBJobs is completely free for students and graduates — you can apply to as many jobs and internships as you like.",
    },
    {
      question: "Do employers pay to post a job?",
      answer:
        "Not during launch. Posting a job is free while NUBJobs is in its launch phase, and every posting is checked and approved by our admin team before it appears on the board.",
    },
    {
      question: "Will students ever pay to use NUBJobs?",
      answer:
        "There are no plans to charge students. If that ever changes, existing users will be notified first and given plenty of notice.",
    },
  ],
} as const;

const PLANS = [PRICING.students, PRICING.employers] as const;

export default function PricingPage() {
  return (
    <PageContainer as="main" className="py-12 lg:py-16">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
          Pricing
        </h1>
        <p className="mt-3 text-muted-foreground">
          NUBJobs is free for students and graduates.
        </p>
      </div>

      <div className="mx-auto mt-10 grid max-w-4xl gap-6 md:grid-cols-2">
        {PLANS.map((plan) => (
          <Card key={plan.name} className="flex flex-col">
            <CardHeader>
              <Badge variant="secondary" className="w-fit">
                {plan.badge}
              </Badge>
              <p className="mt-2 font-heading text-2xl font-bold text-foreground">
                {plan.price}
              </p>
              <p className="text-sm text-muted-foreground">{plan.priceNote}</p>
            </CardHeader>
            <CardContent className="flex-1">
              <ul className="space-y-3">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2 text-sm">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-brand-600" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button asChild className="w-full">
                <Link href={plan.cta.href}>{plan.cta.label}</Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="mx-auto mt-6 max-w-4xl text-center text-sm text-muted-foreground">
        {PRICING.note}
      </p>

      <div className="mx-auto mt-12 max-w-2xl">
        <h2 className="font-heading text-lg font-semibold text-foreground">
          Pricing questions
        </h2>
        <Separator className="my-4" />
        <Accordion type="single" collapsible className="w-full">
          {PRICING.faqs.map((faq, index) => (
            <AccordionItem key={faq.question} value={`faq-${index}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </PageContainer>
  );
}
