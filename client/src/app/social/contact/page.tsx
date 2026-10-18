/**
 * /social/contact — Contact NUBJobs (client component).
 * Renders inside the shared social layout (left + right sidebars stay visible).
 *
 * All copy lives in CONTACT / TOPICS below. Posts to `${NEXT_PUBLIC_API_URL}/contact`.
 */
'use client';

import * as React from 'react';
import Link from 'next/link';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import {
  Mail as MailIcon,
  Phone as PhoneIcon,
  Clock as ClockIcon,
  Loader2 as LoaderIcon,
  CheckCircle2 as SuccessIcon,
  TriangleAlert as ErrorIcon,
  MessageCircle as AssistantIcon,
} from 'lucide-react';
import api from '@/lib/axios';
import { getErrorMessage } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

// ═══ Editable content ══════════════════════════════════════════════════════

const CONTACT = {
  email: 'support@nubjobs.online',
  university: 'Northern University Bangladesh',
  phone: '+880 1XXX-XXXXXX', // placeholder
  hours: 'Sunday to Thursday, 10:00 AM to 5:00 PM',
  responseTime: 'Usually within 24 hours',
};

/** Must mirror the server's TOPICS enum (server/src/routes/contact.routes.ts). */
const TOPICS = [
  'Account help',
  'Job posting',
  'Company verification',
  'Report a problem',
  'Messaging',
  'Other',
] as const;

const MAX_MESSAGE = 1000;

// ── Validation (mirrors the server schema) ──────────────────────────────────

const contactSchema = z.object({
  name: z.string().trim().min(2, 'Enter your name (at least 2 characters).').max(80),
  email: z.string().trim().email('Enter a valid email address.'),
  topic: z.enum(TOPICS, { message: 'Choose a topic.' }),
  subject: z.string().trim().min(5, 'Subject needs at least 5 characters.').max(100),
  message: z.string().trim().min(20, 'Tell us a little more (at least 20 characters).').max(MAX_MESSAGE),
  website: z.string().optional().default(''), // honeypot — must stay empty
});

type ContactForm = z.infer<typeof contactSchema>;
type FormErrors = Partial<Record<keyof ContactForm, string>>;

const EMPTY_FORM: ContactForm = {
  name: '',
  email: '',
  topic: 'Account help',
  subject: '',
  message: '',
  website: '',
};

export default function ContactPage() {
  const [values, setValues] = React.useState<ContactForm>(EMPTY_FORM);
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [sent, setSent] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async (payload: ContactForm) => {
      const { data } = await api.post('/contact', payload);
      return data;
    },
    onSuccess: () => {
      setSent(true);
      setServerError(null);
      setValues(EMPTY_FORM);
      setErrors({});
    },
    onError: (error: unknown) => {
      // Keep the typed values — the user only has to retry.
      setServerError(getErrorMessage(error, 'Could not send your message. Please try again.'));
    },
  });

  const set = <K extends keyof ContactForm>(key: K, value: ContactForm[K]) => {
    setValues((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setServerError(null);
  };

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;

    const parsed = contactSchema.safeParse(values);
    if (!parsed.success) {
      const next: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof ContactForm | undefined;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      setSent(false);
      setServerError(next.website ? 'Something looks off. Please try again.' : null);
      return;
    }

    setErrors({});
    setServerError(null);
    mutation.mutate(parsed.data);
  };

  return (
    <div className="w-full max-w-3xl space-y-6">
      {/* 1. HEADER */}
      <section aria-labelledby="contact-heading">
        <Badge variant="outline">Support</Badge>
        <h1 id="contact-heading" className="mt-3 text-3xl font-bold tracking-tight">
          Contact NUBJobs
        </h1>
        <p className="mt-2 text-muted-foreground">
          Questions about jobs, your account, messaging or a company? Send us a
          message and our team will reply.
        </p>
      </section>

      {/* 2. CONTACT METHODS */}
      <section aria-label="Ways to reach us" className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card>
          <CardContent>
            <MailIcon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Email</p>
            <a
              href={`mailto:${CONTACT.email}`}
              className="mt-1 block truncate text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"
            >
              {CONTACT.email}
            </a>
            <p className="mt-2 text-xs text-muted-foreground">{CONTACT.responseTime}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <PhoneIcon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Phone</p>
            <a
              href={`tel:${CONTACT.phone.replace(/[\s-]/g, '')}`}
              className="mt-1 block truncate text-sm text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 rounded-sm"
            >
              {CONTACT.phone}
            </a>
            <p className="mt-2 text-xs text-muted-foreground">{CONTACT.responseTime}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent>
            <ClockIcon className="size-5 text-primary" aria-hidden="true" />
            <p className="mt-3 text-sm font-medium">Office hours</p>
            <p className="mt-1 text-sm">{CONTACT.hours}</p>
            <p className="mt-2 text-xs text-muted-foreground">{CONTACT.responseTime}</p>
          </CardContent>
        </Card>
      </section>

      {/* 3. CONTACT FORM */}
      <section aria-labelledby="contact-form-heading">
        <Card>
          <CardHeader>
            <CardTitle>Send us a message</CardTitle>
          </CardHeader>
          <CardContent>
            <h2 id="contact-form-heading" className="sr-only">
              Contact form
            </h2>

            {sent && (
              <Alert variant="success" className="mb-5">
                <SuccessIcon aria-hidden="true" />
                <AlertTitle>Message received</AlertTitle>
                <AlertDescription>
                  Thanks, we received your message. We will reply to your email.
                </AlertDescription>
              </Alert>
            )}
            {serverError && (
              <Alert variant="destructive" className="mb-5">
                <ErrorIcon aria-hidden="true" />
                <AlertTitle>Couldn&apos;t send it</AlertTitle>
                <AlertDescription>{serverError}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} noValidate className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="contact-name">Name</Label>
                  <Input
                    id="contact-name"
                    name="name"
                    autoComplete="name"
                    required
                    value={values.name}
                    onChange={(e) => set('name', e.target.value)}
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? 'contact-name-error' : undefined}
                    placeholder="Your full name"
                  />
                  {errors.name && (
                    <p id="contact-name-error" role="alert" className="text-xs text-destructive">
                      {errors.name}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="contact-email">Email</Label>
                  <Input
                    id="contact-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={values.email}
                    onChange={(e) => set('email', e.target.value)}
                    aria-invalid={Boolean(errors.email)}
                    aria-describedby={errors.email ? 'contact-email-error' : undefined}
                    placeholder="you@example.com"
                  />
                  {errors.email && (
                    <p id="contact-email-error" role="alert" className="text-xs text-destructive">
                      {errors.email}
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-topic">Topic</Label>
                <Select
                  name="topic"
                  value={values.topic}
                  onValueChange={(v) => set('topic', v as ContactForm['topic'])}
                >
                  <SelectTrigger id="contact-topic" className="w-full">
                    <SelectValue placeholder="Choose a topic" />
                  </SelectTrigger>
                  <SelectContent>
                    {TOPICS.map((topic) => (
                      <SelectItem key={topic} value={topic}>
                        {topic}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.topic && (
                  <p role="alert" className="text-xs text-destructive">
                    {errors.topic}
                  </p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="contact-subject">Subject</Label>
                <Input
                  id="contact-subject"
                  name="subject"
                  required
                  minLength={5}
                  maxLength={100}
                  value={values.subject}
                  onChange={(e) => set('subject', e.target.value)}
                  aria-invalid={Boolean(errors.subject)}
                  aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
                  placeholder="What is this about?"
                />
                {errors.subject && (
                  <p id="contact-subject-error" role="alert" className="text-xs text-destructive">
                    {errors.subject}
                  </p>
                )}
              </div>
              <div className="space-y-1.5">
                <div className="flex items-baseline justify-between">
                  <Label htmlFor="contact-message">Message</Label>
                  <span className="text-xs text-muted-foreground" aria-live="polite">
                    {values.message.length} / {MAX_MESSAGE}
                  </span>
                </div>
                <Textarea
                  id="contact-message"
                  name="message"
                  required
                  minLength={20}
                  maxLength={MAX_MESSAGE}
                  rows={6}
                  value={values.message}
                  onChange={(e) => set('message', e.target.value)}
                  aria-invalid={Boolean(errors.message)}
                  aria-describedby="contact-message-count contact-message-error"
                  placeholder="Write your message (at least 20 characters)…"
                />
                <span id="contact-message-count" className="sr-only" aria-live="polite">
                  {MAX_MESSAGE - values.message.length} characters left
                </span>
                {errors.message && (
                  <p id="contact-message-error" role="alert" className="text-xs text-destructive">
                    {errors.message}
                  </p>
                )}
              </div>

              {/* Honeypot — invisible to humans, must stay empty. */}
              <div className="hidden" aria-hidden="true">
                <Label htmlFor="contact-website">Website</Label>
                <Input
                  id="contact-website"
                  name="website"
                  tabIndex={-1}
                  autoComplete="off"
                  value={values.website}
                  onChange={(e) => set('website', e.target.value)}
                />
              </div>

              <Button type="submit" disabled={mutation.isPending} className="w-full sm:w-auto">
                {mutation.isPending && <LoaderIcon className="size-4 animate-spin" aria-hidden="true" />}
                {mutation.isPending ? 'Sending…' : 'Send message'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </section>

      {/* 4. HELP LINKS */}
      <section aria-labelledby="help-links-heading">
        <Card>
          <CardHeader>
            <CardTitle id="help-links-heading">Before you write</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-3 text-sm">
              <li>
                <Link
                  href="/about#faq"
                  className="rounded-sm font-medium text-primary underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"
                >
                  Read the FAQ
                </Link>
                <span className="text-muted-foreground"> — quick answers about jobs and accounts.</span>
              </li>
              <li>
                <span className="font-medium">Report a job or user</span>
                <span className="text-muted-foreground">
                  {' '}
                  — use the Report button on any post or profile and our moderators take a look.
                </span>
              </li>
              <li>
                <span className="inline-flex items-center gap-1.5 font-medium">
                  <AssistantIcon className="size-4 text-primary" aria-hidden="true" />
                  Ask the NUBJobs Assistant
                </span>
                <span className="text-muted-foreground">
                  {' '}
                  — open the chat bubble at the corner of the screen for instant help using NUBJobs.
                </span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}