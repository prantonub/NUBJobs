import type { Metadata } from "next";
import Link from "next/link";

import { FAQ_CATEGORIES, FAQ_ITEMS } from "@/lib/faq";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { PageContainer } from "@/components/ui/PageContainer";

export const metadata: Metadata = {
  title: { absolute: "Frequently Asked Questions | NUBJobs" },
  description:
    "Answers about free access, job approval, employer trust, messaging filters, and personal information on NUBJobs.",
};

export default function FaqPage() {
  return (
    <PageContainer as="main" className="py-12 lg:py-16">
      <section id="faq" className="mx-auto max-w-3xl">
        <div className="text-center">
          <h1 className="font-heading text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Frequently Asked Questions
          </h1>
          <p className="mt-3 text-muted-foreground">
            Quick answers about using NUBJobs as a student or employer.
          </p>
        </div>

        <div className="mt-10 space-y-10">
          {FAQ_CATEGORIES.map((category) => {
            const items = FAQ_ITEMS.filter((item) => item.category === category);
            if (items.length === 0) return null;
            return (
              <div key={category}>
                <h2 className="font-heading text-lg font-semibold text-foreground">
                  {category}
                </h2>
                <Separator className="my-3" />
                <Accordion type="single" collapsible className="w-full">
                  {items.map((item) => (
                    <AccordionItem key={item.id} value={item.id}>
                      <AccordionTrigger>{item.question}</AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            );
          })}
        </div>

        <div className="mt-10 flex justify-center">
          <Button asChild>
            <Link href="/help">Still need help?</Link>
          </Button>
        </div>
      </section>
    </PageContainer>
  );
}
