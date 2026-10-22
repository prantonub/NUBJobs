import Groq from "groq-sdk";
import { config as loadEnv } from "dotenv";
import { FAQ_ITEMS } from "../lib/faq";

// Guarantee GROQ_* from server/.env is available even when this module is
// imported before the entrypoint had a chance to run dotenv itself.
// quiet: true keeps dotenv from printing its banner on every import.
loadEnv({ quiet: true });

// The API key never leaves the server: it is read from server/.env only.
// maxRetries: 0 disables the SDK's own retry loop so that the single,
// explicit retry below is the only retry that can happen.
const client = new Groq({ apiKey: process.env.GROQ_API_KEY, maxRetries: 0 });

// The model is configured through server/.env (GROQ_MODEL).
const GROQ_MODEL = (process.env.GROQ_MODEL || "").trim();

const ROLE_BLOCK = `You are the NUBJobs assistant for Northern University Bangladesh students and employers.
Answer only about NUBJobs features and career topics (jobs, applications, CVs, interviews, messaging, community, company verification).
Keep answers under 120 words in simple English. Use short bullet points for steps.
Never ask for passwords, card numbers or national ID numbers.
If you are not sure, say so and point to /social/contact.
Politely decline unrelated requests and steer back to NUBJobs.`;

/** Cap for the platform-facts block so the prompt stays small. */
const FACTS_MAX_CHARS = 1500;

/**
 * Serialises the FAQ into "Q:/A:" pairs. Items are added whole (and in order)
 * until the character budget is reached, so an answer is never cut in half
 * and a multi-byte character is never split.
 */
function buildFactsBlock(): string {
  const lines: string[] = [];
  let length = 0;

  for (const item of FAQ_ITEMS) {
    const line = `Q: ${item.question}\nA: ${item.answer}`;
    const cost = length === 0 ? line.length : line.length + 2;
    if (length + cost > FACTS_MAX_CHARS) break;
    lines.push(line);
    length += cost;
  }

  return lines.join("\n\n");
}

// Built once at module load: the facts block never changes at runtime.
const SYSTEM_INSTRUCTION = `${ROLE_BLOCK}\n\nPlatform facts:\n${buildFactsBlock()}`;

export class ChatbotError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ChatbotError";
  }
}

type ChatMessage = { role: "user" | "model"; text: string };

/**
 * Maps the client conversation to Groq's OpenAI-style message format.
 * "model" turns become "assistant" messages, "user" turns stay "user",
 * and the system instruction always goes first.
 */
function buildMessages(
  messages: ChatMessage[]
): Groq.Chat.ChatCompletionMessageParam[] {
  const mapped: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_INSTRUCTION },
  ];

  for (const message of messages) {
    mapped.push({
      role: message.role === "user" ? "user" : "assistant",
      content: message.text,
    });
  }

  return mapped;
}

/** Reads the HTTP status the provider returned, if any. */
function readStatus(error: unknown): number | undefined {
  const candidate = (error as { status?: unknown } | null)?.status;
  return typeof candidate === "number" ? candidate : undefined;
}

function readErrorType(error: unknown): string {
  const name = (error as { name?: unknown } | null)?.name;
  return typeof name === "string" && name ? name : "Error";
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Streams a reply for the given conversation.
 *
 * A 429 that happens before any output is produced is retried once after a
 * short pause. Once output has started the stream is never retried, and the
 * provider error text is never forwarded to the client.
 */
export async function* streamChatReply(
  messages: { role: "user" | "model"; text: string }[]
): AsyncGenerator<string> {
  const mappedMessages = buildMessages(messages);
  let yieldedAny = false;

  if (!GROQ_MODEL) {
    console.error("[chatbot] groq request failed status=none type=ConfigError");
    throw new ChatbotError("AI unavailable", 503);
  }

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const stream = await client.chat.completions.create({
        model: GROQ_MODEL,
        messages: mappedMessages,
        stream: true,
        max_tokens: 400,
        temperature: 0.3,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content;
        if (typeof content === "string" && content.length > 0) {
          yieldedAny = true;
          yield content;
        }
      }

      return;
    } catch (error: unknown) {
      const status = readStatus(error);
      const errorType = readErrorType(error);

      // Never log the conversation, only the failure kind.
      console.error(
        `[chatbot] groq request failed attempt=${attempt} status=${status ?? "none"} type=${errorType}`
      );

      // Output already started: the answer would be inconsistent, so do not retry.
      if (yieldedAny) {
        throw new ChatbotError("AI unavailable", 503);
      }

      if (status === 429 && attempt === 1) {
        await sleep(1500);
        continue;
      }

      if (status === 429) {
        throw new ChatbotError("Rate limited", 429);
      }

      throw new ChatbotError("AI unavailable", 503);
    }
  }

  throw new ChatbotError("AI unavailable", 503);
}
