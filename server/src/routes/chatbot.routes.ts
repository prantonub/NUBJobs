import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { optionalAuth, AuthRequest } from "../middleware/auth.middleware";
import { streamChatReply, ChatbotError } from "../services/chatbot.service";
import expressRateLimit, { ipKeyGenerator } from "express-rate-limit";

const router = Router();

// A user turn is limited to 500 characters (enforced in the UI as well).
// A model turn is the assistant's own answer, which is routinely longer than
// 500 characters, so it gets a separate, larger limit. Capping both with the
// same number made every follow-up question fail with 400 "Invalid input",
// because the client sends the previous answer back as part of the history.
const USER_TEXT_MAX = 500;
const MODEL_TEXT_MAX = 4000;

type AskMessage = { role: "user" | "model"; text: string };

// The base schema only enforces the shape (role, text, overall message count).
// Length and emptiness rules are applied afterwards in normalizeMessages, so an
// empty or over-long assistant turn is dropped instead of rejecting the whole
// request with 400 "Invalid input".
const askSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "model"]),
        text: z.string().max(20_000),
      })
    )
    .max(8, "Maximum 8 messages allowed"),
});

// Prepares the conversation for the model:
//  - every turn is trimmed;
//  - an empty assistant turn (an aborted or failed stream) is dropped, because
//    it carries no information and the API rejects empty content;
//  - an over-long user turn is truncated (the UI caps it at 500 characters);
//  - an over-long assistant turn is truncated, so a verbose previous answer
//    can never make the next request fail validation.
const normalizeMessages = (messages: AskMessage[]): AskMessage[] =>
  messages
    .map((message) => {
      const limit = message.role === "user" ? USER_TEXT_MAX : MODEL_TEXT_MAX;
      const text = message.text.trim();
      return {
        role: message.role,
        text: text.length > limit ? text.slice(0, limit) : text,
      };
    })
    .filter((message) => message.text.length > 0);

const BUSY_MSG =
  "The assistant is busy. Please try again in a minute, or use the contact form at /social/contact.";
const UNAVAILABLE_MSG =
  "The assistant is unavailable right now. Please use the contact form at /social/contact.";

const guestRateLimit = expressRateLimit({
  windowMs: 60 * 1000,
  max: 10,
  // ipKeyGenerator handles IPv6 subnet bucketing (required by express-rate-limit v8)
  keyGenerator: (req) => ipKeyGenerator(req.ip || "unknown"),
  message: { error: BUSY_MSG },
  standardHeaders: true,
  legacyHeaders: false,
});

const userRateLimit = expressRateLimit({
  windowMs: 60 * 1000,
  max: 30,
  keyGenerator: (req) => {
    const authReq = req as AuthRequest;
    if (authReq.userId) return authReq.userId;
    return ipKeyGenerator(req.ip || "unknown");
  },
  message: { error: BUSY_MSG },
  standardHeaders: true,
  legacyHeaders: false,
});

function rateLimiter(req: AuthRequest, res: Response, next: NextFunction) {
  const limiter = req.userId ? userRateLimit : guestRateLimit;
  return limiter(req, res, next);
}

router.post(
  "/ask",
  optionalAuth,
  rateLimiter,
  (req: AuthRequest, res: Response, next: NextFunction) => {
    const parseResult = askSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({ error: "Invalid input" });
    }

    const { messages } = parseResult.data;

    // Prepare the conversation for the model: empty turns are dropped and
    // over-long turns are truncated (see normalizeMessages).
    const normalized = normalizeMessages(messages);

    // The conversation must end with a non-empty user turn.
    const last = normalized[normalized.length - 1];
    if (!last) {
      // Every turn was empty, so there is nothing to answer.
      return res.status(400).json({ error: "Invalid input" });
    }
    if (last.role !== "user") {
      return res.status(400).json({ error: "Last message must be from user" });
    }

    const recentMessages = normalized.slice(-8);

    let streamStarted = false;
    let clientDisconnected = false;
    const startedAt = Date.now();
    let firstDeltaAt: number | null = null;

    // Detect client disconnects via the response stream. `res.on("close")` also
    // fires on a normal completion, so we only treat it as a disconnect when the
    // response was not ended by us. (Using req.on("close") is unreliable: it can
    // fire as soon as the request body stream ends, before any output is sent.)
    res.on("close", () => {
      if (!res.writableEnded) {
        clientDisconnected = true;
      }
    });

    // SSE headers are applied lazily, right before the first write, so that
    // failures that happen before any output can still return a JSON error
    // (setting them eagerly would make res.json() throw "headers already sent").
    const startStream = () => {
      if (res.headersSent) return;
      res.status(200);
      res.setHeader("Content-Type", "text/event-stream; charset=utf-8");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      res.flushHeaders?.();
    };

    (async () => {
      try {
        for await (const delta of streamChatReply(recentMessages)) {
          if (clientDisconnected) return;
          if (!streamStarted) {
            startStream();
            streamStarted = true;
            firstDeltaAt = Date.now();
          }
          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
        }
        if (!clientDisconnected) {
          if (!streamStarted) startStream();
          res.write("data: {\"done\":true}\n\n");
          res.end();
        }
        const totalMs = Date.now() - startedAt;
        console.log(
          `[chatbot] stream ok | ttfb=${
            firstDeltaAt ? firstDeltaAt - startedAt : totalMs
          }ms total=${totalMs}ms`
        );
      } catch (err: any) {
        if (clientDisconnected) return;

        let status = 503;
        let msg = UNAVAILABLE_MSG;
        if (err instanceof ChatbotError) {
          status = err.status;
          msg = status === 429 ? BUSY_MSG : UNAVAILABLE_MSG;
        }
        console.error(
          `[chatbot] stream failed after ${Date.now() - startedAt}ms status=${status}:`,
          err?.message || err
        );

        // If stream never started, send JSON error (no SSE headers sent yet)
        if (!streamStarted) {
          res.status(status).json({ error: msg });
          return;
        }

        if (!clientDisconnected) {
          res.write(
            `data: ${JSON.stringify({ error: msg })}\n\n`
          );
          res.end();
        }
      }
    })().catch((err) => {
      next(err);
    });
  }
);

export default router;