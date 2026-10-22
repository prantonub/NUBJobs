"use client";

import { useState, useCallback, useRef } from "react";

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// The API accepts a user turn of up to 500 characters and a larger limit for
// an assistant turn. The UI caps user input at 500 characters, but a previous
// answer can easily be longer than that. Empty assistant turns (an aborted or
// failed stream) carry no information and are rejected by the API, so the
// payload is sanitised here as well: every turn is trimmed and length-capped,
// and empty turns are dropped.
const USER_TEXT_MAX = 500;
const MODEL_TEXT_MAX = 4000;

function sanitizeForRequest(messages: ChatMessage[]): ChatMessage[] {
  return messages
    .map((message) => {
      const limit = message.role === "user" ? USER_TEXT_MAX : MODEL_TEXT_MAX;
      const text = message.text.trim();
      return {
        role: message.role,
        text: text.length > limit ? text.slice(0, limit) : text,
      };
    })
    .filter((message) => message.text.length > 0);
}

export function useChatbot() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastUserTextRef = useRef<string>("");
  const timedOutRef = useRef(false);
  // Mirrors `messages` so sendMessage always builds its payload from the
  // latest state, even when a second message is sent before React re-renders.
  const messagesRef = useRef<ChatMessage[]>([]);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

  const sendMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > 500) return;

      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      setError(null);
      setIsStreaming(true);
      lastUserTextRef.current = trimmed;

      abortControllerRef.current = new AbortController();
      // Hard timeout so the UI never hangs on a stalled upstream connection.
      const timeoutId = setTimeout(() => {
        timedOutRef.current = true;
        abortControllerRef.current?.abort();
      }, 60000);

      // The placeholder for the streaming answer is appended right away so the
      // UI can render it. The ref is updated synchronously (the state updater
      // only runs at render time) so the request payload below is always built
      // from the latest conversation.
      const history = messagesRef.current;
      // The index is kept local to this request: a second message sent while
      // this one is still streaming aborts it, and the aborted request must
      // not touch the placeholder of the new one.
      const botIndex = history.length + 1;
      const nextMessages: ChatMessage[] = [
        ...history,
        { role: "user", text: trimmed },
        { role: "model", text: "" },
      ];
      messagesRef.current = nextMessages;
      setMessages(nextMessages);

      try {
        // Build the payload from the live history plus the new user turn, then
        // sanitise it: empty turns are removed and every turn is length-capped,
        // so a previous long answer can never make the request invalid.
        const currentMsgs = sanitizeForRequest([
          ...history,
          { role: "user", text: trimmed },
        ]);
        const recentMsgs = currentMsgs.slice(-8);

        const res = await fetch(`${apiUrl}/chatbot/ask`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: recentMsgs }),
          signal: abortControllerRef.current.signal,
        });

        if (!res.ok || !res.body) {
          // Try to read the server's JSON error message (429 busy, 503 unavailable).
          let serverMessage = "";
          try {
            const errBody = await res.json();
            if (errBody && typeof errBody.error === "string") {
              serverMessage = errBody.error;
            }
          } catch {
            // body was not JSON - fall back to the generic message below
          }
          const err = new Error(
            serverMessage ||
              (res.status === 429
                ? "You are sending messages too quickly. Please wait a minute and try again."
                : "The assistant is unavailable right now. Please try again in a moment.")
          );
          (err as any).status = res.status;
          throw err;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmedLine = line.trim();
            if (!trimmedLine.startsWith("data: ")) continue;

            const dataStr = trimmedLine.slice(6);
            try {
              const data = JSON.parse(dataStr);
              if (data.done) {
                setIsStreaming(false);
                // The stream ended without any visible content. Remove the empty
                // placeholder so the next request cannot carry an empty
                // assistant turn, and tell the user what happened.
                const current = messagesRef.current[botIndex];
                if (!current || !current.text.trim()) {
                  setMessages((prev) => {
                    const next = prev.filter((_, i) => i !== botIndex);
                    messagesRef.current = next;
                    return next;
                  });
                  setError(
                    "The assistant did not return an answer. Please try again."
                  );
                }
                return;
              }
              if (data.error) {
                setError(data.error);
                setIsStreaming(false);
                setMessages((prev) => {
                  const next = prev.filter((_, i) => i !== botIndex);
                  messagesRef.current = next;
                  return next;
                });
                return;
              }
              if (typeof data.delta === "string") {
                setMessages((prev) => {
                  const next = [...prev];
                  next[botIndex] = {
                    ...next[botIndex],
                    text: next[botIndex].text + data.delta,
                  };
                  messagesRef.current = next;
                  return next;
                });
              }
            } catch {
              // Ignore malformed SSE lines
            }
          }
        }

        // The stream ended without a "done" marker (e.g. the connection was
        // closed). Treat an answer that is still empty the same way as above.
        setIsStreaming(false);
        const last = messagesRef.current[botIndex];
        if (!last || !last.text.trim()) {
          setMessages((prev) => {
            const next = prev.filter((_, i) => i !== botIndex);
            messagesRef.current = next;
            return next;
          });
          setError("The assistant did not return an answer. Please try again.");
        }
      } catch (err: any) {
        if (err.name === "AbortError") {
          // Distinguish a user-initiated stop from the 60s hard timeout.
          if (timedOutRef.current) {
            setError(
              "The assistant took too long to respond. Please try again in a moment."
            );
          }
          // A stopped or timed-out request that produced no text yet must not
          // leave an empty bubble behind, and an empty turn would also be
          // rejected by the API on the next request.
          const partial = messagesRef.current[botIndex];
          if (!partial || !partial.text.trim()) {
            setMessages((prev) => {
              const next = prev.filter((_, i) => i !== botIndex);
              messagesRef.current = next;
              return next;
            });
          }
          setIsStreaming(false);
          return;
        }
        setError(
          err?.message ||
            "The assistant is unavailable right now. Please try again in a moment."
        );
        setIsStreaming(false);
        setMessages((prev) => {
          const next = prev.filter((_, i) => i !== botIndex);
          messagesRef.current = next;
          return next;
        });
      } finally {
        clearTimeout(timeoutId);
        timedOutRef.current = false;
      }
    },
    [apiUrl]
  );

  const stop = useCallback(() => {
    timedOutRef.current = false;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsStreaming(false);
  }, []);

  const clearChat = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    messagesRef.current = [];
    setMessages([]);
    setError(null);
    setIsStreaming(false);
  }, []);

  const retry = useCallback(() => {
    if (lastUserTextRef.current) {
      sendMessage(lastUserTextRef.current);
    }
  }, [sendMessage]);

  return {
    messages,
    isStreaming,
    error,
    sendMessage,
    stop,
    clearChat,
    retry,
  };
}