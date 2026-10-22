"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { MessageCircle, X, Send, StopCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { useChatbot, ChatMessage } from "@/hooks/useChatbot";

export default function ChatbotWidget() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const {
    messages,
    isStreaming,
    error,
    sendMessage,
    stop,
    clearChat,
    retry,
  } = useChatbot();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const starterQuestions = [
    "How do I apply for a job?",
    "How do I post a job?",
    "How does messaging work?",
    "How do I turn on employer visibility?",
  ];

  // Hide the widget on the contact page, but only after all hooks have run so
  // the hook order stays stable between renders.
  if (pathname === "/social/contact") return null;

  return (
    <>
      {!isOpen && (
        <Button
          className="fixed bottom-5 right-5 z-50 rounded-full shadow-lg"
          onClick={() => setIsOpen(true)}
          aria-label="Open NUBJobs Assistant"
        >
          <MessageCircle className="w-5 h-5" />
        </Button>
      )}

      {isOpen && (
        <div className="fixed bottom-5 right-5 z-50 w-full md:w-96 lg:w-[360px]">
          <Card className="flex flex-col h-[520px] max-h-[80vh] md:h-[520px] shadow-2xl border border-border">
            <CardHeader className="flex items-center justify-between px-4 py-3">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  AI
                </Badge>
                <CardTitle className="text-sm">NUBJobs Assistant</CardTitle>
              </div>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  setIsOpen(false);
                  clearChat();
                }}
                aria-label="Close chat"
              >
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>

            <div className="px-4 py-1 text-[0.8rem] text-muted-foreground">
              AI can make mistakes. For account issues, use the{" "}
              <a
                href="/social/contact"
                className="underline underline-offset-4 hover:text-primary"
              >
                contact form
              </a>
              .
            </div>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && !error && !isStreaming ? (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">
                    Ask me anything about NUBJobs
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    {starterQuestions.map((q) => (
                      <Button
                        key={q}
                        variant="outline"
                        size="sm"
                        className="text-xs text-left"
                        onClick={() => sendMessage(q)}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : (
                <>
                  <ScrollArea className="h-full">
                    {messages.map((m: ChatMessage, i: number) => (
                      <div
                        key={i}
                        className={`flex ${
                          m.role === "user"
                            ? "justify-end"
                            : "justify-start"
                        }`}
                      >
                        <div
                          className={`max-w-[85%] rounded-lg p-3 text-sm ${
                            m.role === "user"
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted text-muted-foreground dark:bg-muted/50 dark:text-foreground"
                          }`}
                        >
                          {m.text}
                        </div>
                      </div>
                    ))}
                    {isStreaming && (
                      <div className="flex justify-start">
                        <div className="bg-muted text-muted-foreground dark:bg-muted/50 dark:text-foreground rounded-lg p-3 text-sm flex gap-1 items-end">
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "0ms" }}></span>
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "150ms" }}></span>
                          <span className="h-1.5 w-1.5 rounded-full bg-current animate-pulse" style={{ animationDelay: "300ms" }}></span>
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </ScrollArea>
                </>
              )}
            </CardContent>

            <div className="border-t p-3 flex gap-2">
              {error ? (
                <Alert variant="destructive" className="flex-1 px-0 py-0 text-xs">
                  <AlertTitle>Error</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              ) : null}

              <Input
                disabled={isStreaming}
                placeholder="Type a message..."
                onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                  if (e.key === "Enter" && !isStreaming) {
                    const input = e.target as HTMLInputElement;
                    sendMessage(input.value);
                    input.value = "";
                  }
                }}
              />

              {isStreaming ? (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={stop}
                  aria-label="Stop streaming"
                >
                  <StopCircle className="w-4 h-4" />
                </Button>
              ) : (
                <Button
                  size="sm"
                  onClick={() => {
                    const input = document.querySelector(
                      'input[placeholder="Type a message..."]'
                    ) as HTMLInputElement | null;
                    if (input) sendMessage(input.value);
                    input && (input.value = "");
                  }}
                  aria-label="Send message"
                >
                  <Send className="w-4 h-4" />
                </Button>
              )}

              {error && (
                <Button variant="outline" size="sm" onClick={retry}>
                  Retry
                </Button>
              )}
            </div>

            {error && (
              <div className="px-4 py-1 text-[0.8rem] text-muted-foreground border-t">
                Need more help?{" "}
                <a
                  href="/social/contact"
                  className="underline underline-offset-4 hover:text-primary"
                >
                  Contact us
                </a>
                .
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  );
}