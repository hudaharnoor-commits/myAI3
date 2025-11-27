"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

// Assuming these components are already styled to a professional standard
import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
// Ensure these config variables exist or replace them with strings
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config"; 
import Image from "next/image";
import Link from "next/link";

const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

const STORAGE_KEY = 'chat-messages';

type StorageData = {
  messages: UIMessage[];
  durations: Record<string, number>;
};

const loadMessagesFromStorage = (): { messages: UIMessage[]; durations: Record<string, number> } => {
  if (typeof window === 'undefined') return { messages: [], durations: {} };
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return { messages: [], durations: {} };

    const parsed = JSON.parse(stored);
    return {
      messages: parsed.messages || [],
      durations: parsed.durations || {},
    };
  } catch (error) {
    console.error('Failed to load messages from localStorage:', error);
    return { messages: [], durations: {} };
  }
};

const saveMessagesToStorage = (messages: UIMessage[], durations: Record<string, number>) => {
  if (typeof window === 'undefined') return;
  try {
    const data: StorageData = { messages, durations };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save messages to localStorage:', error);
  }
};

export default function Chat() {
  const [isClient, setIsClient] = useState(false);
  const [durations, setDurations] = useState<Record<string, number>>({});
  const welcomeMessageShownRef = useRef<boolean>(false);

  // Load stored data safely
  const stored = typeof window !== 'undefined' ? loadMessagesFromStorage() : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  // Client-side initialization
  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    if (stored.messages.length > 0) {
      setMessages(stored.messages);
    }
  }, []);

  // Save messages and durations to local storage whenever they change
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

  // Display welcome message if no prior messages exist
  useEffect(() => {
    if (isClient && initialMessages.length === 0 && !welcomeMessageShownRef.current) {
      const welcomeMessage: UIMessage = {
        id: `welcome-${Date.now()}`,
        role: "assistant",
        parts: [
          {
            type: "text",
            text: WELCOME_MESSAGE, // Assuming WELCOME_MESSAGE is defined in "@/config"
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
    const newDurations = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared");
  }

  return (
    // Use a very light, neutral background for a luxurious feel
    <div className="flex h-screen items-center justify-center font-sans bg-gray-50 dark:bg-gray-950">
      <main className="w-full h-screen relative bg-gray-50 dark:bg-gray-950">
        
        {/* === ELEGANT HEADER (Floating/Blurred) === */}
        <div 
          className="fixed top-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md dark:bg-gray-900/90 shadow-lg border-b border-gray-100 dark:border-gray-800 transition-all duration-300"
        >
          <div className="relative py-4"> {/* Increased vertical padding */}
            <ChatHeader>
              <ChatHeaderBlock />
              <ChatHeaderBlock className="justify-center items-center gap-3">
                <Avatar
                  className="size-11 ring-2 ring-primary border-4 border-white dark:border-gray-900 shadow-md" // Prominent avatar
                >
                  <AvatarImage src="/logo.png" />
                  <AvatarFallback>
                    <Image src="/logo.png" alt="Logo" width={44} height={44} />
                  </AvatarFallback>
                </Avatar>
                <p className="tracking-tight font-semibold text-xl text-gray-800 dark:text-white">Chat with **{AI_NAME}**</p>
              </ChatHeaderBlock>
              <ChatHeaderBlock className="justify-end">
                <Button
                  variant="ghost" // Use ghost for a cleaner look, minimal styling
                  size="sm"
                  className="cursor-pointer text-sm font-medium hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200 rounded-full" 
                  onClick={clearChat}
                >
                  <Plus className="size-4 mr-1 text-primary" />
                  **New Chat**
                </Button>
              </ChatHeaderBlock>
            </ChatHeader>
          </div>
        </div>

        {/* === MESSAGE WALL CONTAINER === */}
        {/* Generous padding for content visibility */}
        <div className="h-screen overflow-y-auto px-5 w-full pt-[110px] pb-[170px]"> 
          <div className="flex flex-col items-center justify-end min-h-full">
            {isClient ? (
              <>
                <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                {status === "submitted" && (
                  // Loading indicator
                  <div className="flex justify-start max-w-3xl w-full pt-4"> 
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-2xl w-full">
                <Loader2 className="size-6 animate-spin text-primary" /> 
              </div>
            )}
          </div>
        </div>

        {/* === SLEEK FLOATING INPUT FOOTER === */}
        <div 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-md dark:bg-gray-900/90 shadow-2xl pt-6 pb-2" 
        >
          <div className="w-full px-5 items-center flex justify-center relative">
            <div className="max-w-3xl w-full">
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)} className="mb-4">
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="chat-form-message" className="sr-only">
                          Message
                        </FieldLabel>
                        <div className="relative">
                          <Input
                            {...field}
                            id="chat-form-message"
                            // Very heavy rounded corners (rounded-[30px]) for the capsule look
                            className="h-16 pr-20 pl-6 bg-white dark:bg-gray-800 border-2 border-gray-200 dark:border-gray-700 focus-visible:ring-primary shadow-lg rounded-[30px] transition-all duration-300 placeholder:text-gray-400 text-lg" 
                            placeholder="Ask me for style advice, color palettes, or outfit ideas..."
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
                          {/* Send button styling */}
                          {(status == "ready" || status == "error") && (
                            <Button
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 shadow-md"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-5" />
                            </Button>
                          )}
                          {/* Stop button styling */}
                          {(status == "streaming" || status == "submitted") && (
                            <Button
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-destructive hover:bg-destructive/90 shadow-md"
                              size="icon"
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
          
          {/* === FOOTER LINKS === */}
          <div className="w-full px-5 py-3 items-center flex justify-center text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-800">
            <p className="text-center font-medium">
              © {new Date().getFullYear()} {OWNER_NAME}&nbsp;·&nbsp;
              <Link href="/terms" className="underline underline-offset-2 hover:text-primary transition-colors">Terms of Use</Link>
              &nbsp;·&nbsp;Powered by&nbsp;
              <Link href="https://ringel.ai/" className="underline underline-offset-2 hover:text-primary transition-colors">Ringel.AI</Link>
            </p>
          </div>
        </div>
      </main>
    </div >
  );
}
