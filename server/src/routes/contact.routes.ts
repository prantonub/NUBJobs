import { Router, Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { Resend } from 'resend';
import prisma from '../lib/prisma';
import { optionalAuth, validate, rateLimit, AuthRequest } from '../middleware/auth.middleware';
import { responses } from '../utils/response.utils';

const router = Router();

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@nubjobs.com';

/** Where contact form submissions are delivered. Set CONTACT_INBOX_EMAIL in server/.env. */
const SUPPORT_EMAIL = process.env.CONTACT_INBOX_EMAIL || 'support@nubjobs.online';
const COMPANY_NAME = 'NUBJobs';

/** The six topics offered by the form's Select. Keep in sync with the client. */
const TOPICS = [
  'Account help',
  'Job posting',
  'Company verification',
  'Report a problem',
  'Messaging',
  'Other',
] as const;

// Validation schema - mirrors the client-side Zod rules.
const contactSchema = z.object({
  name: z.string().trim().min(2, 'Name must be at least 2 characters').max(80, 'Name must be at most 80 characters'),
  email: z.string().trim().email('Enter a valid email address'),
  topic: z.enum(TOPICS, { message: 'Choose a topic' }),
  subject: z.string().trim().min(5, 'Subject must be at least 5 characters').max(100, 'Subject must be at most 100 characters'),
  message: z.string().trim().min(20, 'Message must be at least 20 characters').max(1000, 'Message must be at most 1000 characters'),
  // Honeypot - must stay empty. Optional so a missing field (older clients) still parses.
  website: z.string().optional().default(''),
});

/** Minimal HTML-escape for user content interpolated into the notification email. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

type ContactInput = z.infer<typeof contactSchema>;

async function sendContactEmail(body: ContactInput): Promise<boolean> {
  const html = `
    <div style="font-family:Arial,sans-serif;color:#333;max-width:600px;margin:0 auto;padding:20px">
      <h2 style="margin-bottom:8px">New ${COMPANY_NAME} contact message</h2>
      <p><strong>Topic:</strong> ${escapeHtml(body.topic)}</p>
      <p><strong>From:</strong> ${escapeHtml(body.name)} &lt;${escapeHtml(body.email)}&gt;</p>
      <p><strong>Subject:</strong> ${escapeHtml(body.subject)}</p>
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0" />
      <p style="white-space:pre-wrap">${escapeHtml(body.message)}</p>
    </div>
  `;

  const result = await resend.emails.send({
    from: FROM_EMAIL,
    to: SUPPORT_EMAIL,
    replyTo: body.email,
    subject: `[${COMPANY_NAME} Contact] ${body.topic}: ${body.subject}`,
    html,
  });

  if (result && result.error) {
    console.error('Contact email send failed:', result.error);
    return false;
  }
  return true;
}

async function submitContact(req: AuthRequest, res: Response) {
  const body = req.body as ContactInput;

  // Honeypot filled → almost certainly a bot. Pretend success, do NOT save or send.
  if (body.website && body.website.trim() !== '') {
    return responses.ok(res, 'Thanks, we received your message.');
  }

  try {
    await prisma.contactMessage.create({
      data: {
        name: body.name,
        email: body.email,
        topic: body.topic,
        subject: body.subject,
        message: body.message,
      },
    });
  } catch (dbError) {
    // Persisting is best-effort - still try to email support below, but log it.
    console.error('Failed to persist contact message:', dbError);
  }

  try {
    await sendContactEmail(body);
  } catch (emailError) {
    // Don't fail the request just because the notification email hiccuped -
    // the message is already stored for admin review.
    console.error('Contact notification email errored:', emailError);
  }

  return responses.ok(res, 'Thanks, we received your message.');
}

// POST /api/contact - public, optional auth, rate-limited to 5 / 15 min per IP.
router.post(
  '/',
  optionalAuth,
  rateLimit(5, 15 * 60 * 1000),
  validate(contactSchema),
  (req: AuthRequest, res: Response, next: NextFunction) => {
    submitContact(req, res).catch(next);
  }
);

export default router;