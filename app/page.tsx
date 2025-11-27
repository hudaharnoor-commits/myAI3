"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form"; 
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config";
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = "chat-messages";

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): {
  messages: UIMessage[];
  durations: Record<string, number>;
} => {
  if (typeof window === "undefined") return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error("Failed to load messages from localStorage:", error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (
  messages: UIMessage[],
  durations: Record<string, number>
) => {
  if (typeof window === "undefined") return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save messages to localStorage:", error);
  }
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);

  const stored =
    typeof window !== "undefined"
      ? loadMessagesFromStorage()
      : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (isClient) {
      saveMessagesToStorage(messages, durations);
    }
  }, [durations, messages, isClient]);

  const handleDurationChange = (key: string, duration: number) => {
    setDurations((prevDurations) => {
      const newDurations = { ...prevDurations };
      newDurations[key] = duration;
      return newDurations;
    });
  };

  useEffect(() => {
    if (
      isClient &&
      initialMessages.length === 0 &&
      !welcomeMessageShownRef.current
    ) {
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: WELCOME_MESSAGE,
          },
        ],
      };
      setMessages([welcomeMessage]);
      saveMessagesToStorage([welcomeMessage], {});
      welcomeMessageShownRef.current = true;
    }
  }, [isClient, initialMessages.length, setMessages]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      message: "",
    },
  });

  function onSubmit(data: z.infer<typeof formSchema>) {
    sendMessage({ text: data.message });
    form.reset();
  }

  function clearChat() {
    const newMessages: UIMessage[] = [];
    const newDurations: Record<string, number> = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared");
  }

  return (
    <div className="flex h-screen items-center justify-center font-sans bg-gradient-to-br from-slate-50 via-slate-100 to-slate-200 dark:from-black dark:via-slate-900 dark:to-black">
      <main className="relative flex h-screen w-full items-center justify-center">
        {/* Centered layout container */}
        <div className="relative flex h-full w-full max-w-6xl flex-col px-4 py-4 sm:px-6 sm:py-6">
          {/* Top header (fixed within the container) */}
          <div className="pointer-events-none fixed left-0 right-0 top-0 z-40 flex justify-center">
            <div className="pointer-events-auto mt-3 w-full max-w-6xl px-4 sm:px-6">
              <div className="rounded-2xl border border-slate-200/70 bg-linear-to-b from-background via-background/70 to-background shadow-sm dark:border-slate-800 dark:bg-black/90">
                <ChatHeader className="px-4 py-3 sm:px-5 sm:py-3.5">
                  <ChatHeaderBlock className="hidden flex-1 items-center text-xs sm:flex sm:text-sm text-muted-foreground">
                    <span className="inline-flex h-2 w-2 rounded-full bg-emerald-500 mr-1.5" />
                    Session active · Your wardrobe, curated in real time
                  </ChatHeaderBlock>

                  <ChatHeaderBlock className="flex flex-1 items-center justify-center gap-3">
                    <Avatar className="size-9 ring-2 ring-emerald-500/50 shadow-sm">
                      <AvatarImage src="/logo.png" />
                      <AvatarFallback>
                        <Image
                          src="/logo.png"
                          alt="Logo"
                          width={36}
                          height={36}
                        />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col items-start">
                      <p className="text-sm font-semibold leading-tight sm:text-base">
                        Chat with {AI_NAME}
                      </p>
                      <p className="text-[11px] text-muted-foreground sm:text-xs">
                        Modern looks built only from your own closet
                      </p>
                    </div>
                  </ChatHeaderBlock>

                  <ChatHeaderBlock className="flex flex-1 items-center justify-end gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 rounded-full border-slate-200 bg-white/60 px-3 text-xs font-medium shadow-sm hover:bg-white dark:border-slate-700 dark:bg-slate-900/80"
                      onClick={clearChat}
                    >
                      <Plus className="mr-1.5 size-3.5" />
                      {CLEAR_CHAT_TEXT}
                    </Button>
                  </ChatHeaderBlock>
                </ChatHeader>
              </div>
            </div>
          </div>

          {/* Chat body */}
          <div className="mt-[96px] flex h-full w-full justify-center pb-[170px]">
            <div className="flex h-full w-full max-w-4xl flex-col rounded-3xl border border-slate-200/70 bg-card/80 px-3 py-4 shadow-xl backdrop-blur-sm dark:border-slate-800 dark:bg-slate-950/80 sm:px-5 sm:py-6">
              <div className="mb-2 flex items-center justify-between text-xs text-muted-foreground sm:text-[11px]">
                <span>
                  Tip: describe the occasion + setting, and I’ll build 1–3
                  outfits for you.
                </span>
              </div>

              <div className="flex-1 overflow-y-auto">
                <div className="flex min-h-full flex-col items-center justify-end">
                  {isClient ? (
                    <>
                      <MessageWall
                        messages={messages}
                        status={status}
                        durations={durations}
                        onDurationChange={handleDurationChange}
                      />
                      {status === "submitted" && (
                        <div className="mt-2 flex w-full max-w-3xl justify-start">
                          <Loader2 className="size-4 animate-spin text-muted-foreground" />
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="flex w-full max-w-2xl justify-center">
                      <Loader2 className="size-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Composer + footer */}
          <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-40 flex justify-center">
            <div className="pointer-events-auto mb-2 w-full max-w-6xl px-4 sm:px-6">
              <div className="mb-1 flex w-full justify-center">
                <div className="max-w-4xl flex-1">
                  <form
                    id="chat-form"
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="w-full"
                  >
                    <FieldGroup>
                      <Controller
                        name="message"
                        control={form.control}
                        render={({ field, fieldState }) => (
                          <Field data-invalid={fieldState.invalid}>
                            <FieldLabel
                              htmlFor="chat-form-message"
                              className="sr-only"
                            >
                              Message
                            </FieldLabel>
                            <div className="relative">
                              <Input
                                {...field}
                                id="chat-form-message"
                                className="h-13 w-full rounded-full border border-slate-200 bg-white/90 pl-5 pr-14 text-sm shadow-lg placeholder:text-slate-400 focus-visible:ring-1 focus-visible:ring-emerald-500 dark:border-slate-700 dark:bg-slate-900/90"
                                placeholder="Tell me your occasion, setting, and any pieces you want or want to avoid…"
                                disabled={status === "streaming"}
                                aria-invalid={fieldState.invalid}
                                autoComplete="off"
                                onKeyDown={(e) => {
                                  if (e.key === "Enter" && !e.shiftKey) {
                                    e.preventDefault();
                                    form.handleSubmit(onSubmit)();
                                  }
                                }}
                              />
                              {(status === "ready" || status === "error") && (
                                <Button
                                  className="absolute right-2 top-1.5 h-10 w-10 rounded-full bg-emerald-600 text-white shadow-md hover:bg-emerald-700"
                                  type="submit"
                                  disabled={!field.value.trim()}
                                  size="icon"
                                >
                                  <ArrowUp className="size-4" />
                                </Button>
                              )}
                              {(status === "streaming" ||
                                status === "submitted") && (
                                <Button
                                  className="absolute right-2 top-1.5 h-10 w-10 rounded-full bg-slate-200 text-slate-700 shadow-md hover:bg-slate-300 dark:bg-slate-800 dark:text-slate-100"
                                  size="icon"
                                  type="button"
                                  onClick={() => {
                                    stop();
                                  }}
                                >
                                  <Square className="size-4" />
                                </Button>
                              )}
                            </div>
                          </Field>
                        )}
                      />
                    </FieldGroup>
                  </form>
                </div>
              </div>
              <div className="flex w-full justify-center pb-2 text-[11px] text-muted-foreground">
                <span className="max-w-4xl text-center">
                  © {new Date().getFullYear()} {OWNER_NAME}&nbsp;·&nbsp;
                  <Link href="/terms" className="underline">
                    Terms of Use
                  </Link>
                  &nbsp;·&nbsp;Powered by{" "}
                  <Link href="https://ringel.ai/" className="underline">
                    Ringel.AI
                  </Link>
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
