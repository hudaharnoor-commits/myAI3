"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useChat } from "@ai-sdk/react";
// Only importing ArrowUp, Loader2, Plus, and Square
import { ArrowUp, Loader2, Plus, Square } from "lucide-react"; 
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
// Import constants from the config file
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config"; 
import Image from "next/image";
import Link from "next/link";

// Define the Stylist's Name and Image Path
const STYLIST_NAME = AI_NAME;
const STYLIST_IMAGE_PATH = "https://files.catbox.moe/hcek6h.png"; 

// Define the required custom color (HARDCODED for Tailwind stability)
const ACCENT_COLOR_HEX = "#FFD1DC"; 

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

  const stored = typeof window !== 'undefined' ? loadMessagesFromStorage() : { messages: [], durations: {} };
  const [initialMessages] = useState<UIMessage[]>(stored.messages);

  const { messages, sendMessage, status, stop, setMessages } = useChat({
    messages: initialMessages,
  });

  useEffect(() => {
    setIsClient(true);
    setDurations(stored.durations);
    setMessages(stored.messages);
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
    if (isClient && initialMessages.length === 0 && !welcomeMessageShownRef.current) {
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
    const newDurations = {};
    setMessages(newMessages);
    setDurations(newDurations);
    saveMessagesToStorage(newMessages, newDurations);
    toast.success("Chat cleared");
  }

  return (
    // Outer container for the full-screen pink background
    <div className="flex h-screen w-full items-center justify-center font-sans bg-[#FFD1DC] dark:bg-gray-900">
      
      {/* === MAIN CONTENT AREA (The scrollable white column) === */}
      <main 
        // Changed to have fixed width/height but uses a white background for the central chat window look
        className="relative w-full max-w-3xl h-full bg-white dark:bg-gray-800 shadow-xl transition-all duration-300"
      >
        
        {/* === FIXED HEADER (Professional & Styled) === */}
        <div 
          // Header uses a white background with blur for a clean look
          className="fixed top-0 left-0 right-0 z-10 mx-auto max-w-3xl w-full bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 py-4 px-6 border-b border-muted shadow-md transition-all duration-300"
        >
          <ChatHeader>
            <ChatHeaderBlock className="flex items-center gap-3">
              <Avatar
                // Hardcoded pink ring
                className="size-12 ring-2 ring-[#FFD1DC] border-2 border-white dark:border-gray-800" 
              >
                <AvatarImage src={STYLIST_IMAGE_PATH} alt={`${STYLIST_NAME} Avatar`} />
                {/* Hardcoded pink fallback background */}
                <AvatarFallback className="bg-[#FFD1DC] text-gray-700 font-bold">A</AvatarFallback>
              </Avatar>
              <p className="font-semibold text-lg text-foreground">Chat with {STYLIST_NAME}</p> 
            </ChatHeaderBlock>
            <ChatHeaderBlock className="flex justify-end gap-2"> 
              
              {/* New Chat Button (Pink Accent - Dynamic Hover) */}
              <Button
                variant="outline"
                size="sm" 
                className="cursor-pointer rounded-full px-4 py-2 flex items-center gap-1 bg-[#FFD1DC] hover:bg-[#FFD1DC]/70 transition-all duration-200 border-[#FFD1DC] text-gray-700 hover:scale-[1.05]" 
                onClick={clearChat}
                title="Start new chat"
              >
                <Plus className="size-4" />
                {CLEAR_CHAT_TEXT}
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* === MESSAGE WALL CONTAINER (Scrollable Content Area) === */}
        {/* Note: Scrolling is now handled by this 'main' component's overflow, 
           but since 'main' has h-full, we adjust the inner padding and let content scroll. */}
        <div className="h-full overflow-y-auto w-full px-6 py-4 pt-[96px] pb-[136px]"> 
          <div className="flex flex-col items-center justify-end min-h-full w-full"> 
            {isClient ? (
              <>
                {/* MessageWall content takes the full width of the centered main container */}
                <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                
                {status === "submitted" && (
                  <div className="flex justify-start w-full pt-4"> 
                    <Loader2 className="size-5 animate-spin text-primary" />
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center w-full">
                <Loader2 className="size-6 animate-spin text-primary" /> 
              </div>
            )}
          </div>
        </div>

        {/* === FIXED FLOATING INPUT FOOTER (Seamless) === */}
        <div 
          // Footer is fixed to the bottom of the visible chat window (main)
          className="fixed bottom-0 left-0 right-0 z-10 mx-auto max-w-3xl w-full bg-white/90 backdrop-blur-sm dark:bg-gray-800/90 pt-5 px-6 pb-4 shadow-xl transition-all duration-300" 
        >
          <div className="w-full flex justify-center relative">
            <div className="w-full"> 
              <form id="chat-form" onSubmit={form.handleSubmit(onSubmit)} className="mb-2">
                <FieldGroup>
                  <Controller
                    name="message"
                    control={form.control}
                    render={({ field, fieldState }) => (
                      <Field data-invalid={fieldState.invalid}>
                        <FieldLabel htmlFor="chat-form-message" className="sr-only">
                          Message
                        </FieldLabel>
                        <div className="relative h-14">
                          <Input
                            {...field}
                            id="chat-form-message"
                            // Capsule look input
                            className="h-full w-full pr-16 pl-6 bg-gray-50 dark:bg-gray-700 border-2 border-gray-200 dark:border-gray-600 focus-visible:ring-primary shadow-inner rounded-full transition-all duration-300 placeholder:text-gray-400 text-base" 
                            placeholder="Type your message here..."
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
                          
                          {/* Send button with hardcoded pink background - Dynamic Hover */}
                          {(status == "ready" || status == "error") && (
                            <Button
                              // Hardcoded pink background
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 shadow-md bg-[#FFD1DC] text-gray-800 transition-all duration-200 hover:translate-y-[-55%]"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                            >
                              <ArrowUp className="size-5" />
                            </Button>
                          )}
                          
                          {/* Stop button */}
                          {(status == "streaming" || status == "submitted") && (
                            <Button
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 bg-destructive hover:bg-destructive/90 shadow-md"
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
          <div className="w-full px-5 py-2 flex justify-center text-xs text-muted-foreground">
            <p className="text-center font-medium">
              © {new Date().getFullYear()} {OWNER_NAME}&nbsp;·&nbsp;
              <Link href="/terms" className="underline underline-offset-2 hover:text-foreground/80 transition-colors">Terms of Use</Link>
              &nbsp;·&nbsp;Powered by&nbsp;
              <Link href="https://ringel.ai/" className="underline underline-offset-2 hover:text-foreground/80 transition-colors">Ringel.AI</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
