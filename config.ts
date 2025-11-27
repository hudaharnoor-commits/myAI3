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
// Import all necessary icons, including the new side icons
import { ArrowUp, Loader2, Plus, Square, Image as ImageIcon, Settings } from "lucide-react"; 
import { MessageWall } from "@/components/messages/message-wall";
import { ChatHeader } from "@/app/parts/chat-header";
import { ChatHeaderBlock } from "@/app/parts/chat-header";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
// Import constants from the config file (MUST remain separate for stability)
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config"; 
import Image from "next/image";
import Link from "next/link";

// --- CONFIGURATION FOR STYLING ---
const STYLIST_NAME = AI_NAME;
const STYLIST_IMAGE_PATH = "https://files.catbox.moe/hcek6h.png";
const ACCENT_COLOR_HEX = "#FFD1DC"; // Soft blush pink

// --- ZOD SCHEMA ---
const formSchema = z.object({
  message: z
    .string()
    .min(1, "Message cannot be empty.")
    .max(2000, "Message must be at most 2000 characters."),
});

// --- LOCAL STORAGE LOGIC (Kept from original code) ---
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

// --- CHAT COMPONENT ---
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
  
  // Placeholder functions for the new side buttons
  const handleImageClick = () => {
    toast.info("Image generation feature coming soon!");
  };

  const handleSettingsClick = () => {
    toast.info("Settings panel coming soon!");
  };

  return (
    // Outer container for the full-screen background
    <div className="flex h-screen w-full items-center justify-center font-sans bg-gray-100 dark:bg-gray-900">
      
      {/* === MAIN CONTENT AREA (Seamless UI Integration) === */}
      <main 
        className="relative w-full h-full bg-white dark:bg-gray-800 transition-all duration-300"
      >
        
        {/* === FIXED HEADER (Professional & Styled) === */}
        <div 
          className="fixed top-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 py-4 px-6 border-b border-muted shadow-md transition-all duration-300"
        >
          <div className="flex justify-center w-full"> 
            <div className="max-w-3xl w-full"> 
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
                  {/* Styled text, no double asterisks */}
                  <p className="font-semibold text-lg text-foreground">Chat with {STYLIST_NAME}</p> 
                </ChatHeaderBlock>
                <ChatHeaderBlock className="flex justify-end gap-2"> 
                  
                  {/* 1. New Chat Button (Pink Accent) */}
                  <Button
                    variant="outline"
                    size="icon" 
                    className="cursor-pointer rounded-full h-10 w-10 flex items-center justify-center bg-[#FFD1DC] hover:bg-[#FFD1DC]/70 transition-colors border-[#FFD1DC] text-gray-700" 
                    onClick={clearChat}
                    title="Start new chat"
                  >
                    <Plus className="size-4" />
                  </Button>

                  {/* 2. Image Icon Button (Utility) */}
                  <Button
                    variant="ghost" // Using ghost/minimal variant for secondary icons
                    size="icon"
                    className="cursor-pointer rounded-full h-10 w-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors" 
                    onClick={handleImageClick}
                    title="Generate image"
                  >
                    <ImageIcon className="size-4" />
                  </Button>

                  {/* 3. Settings Icon Button (Utility) */}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="cursor-pointer rounded-full h-10 w-10 flex items-center justify-center text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 transition-colors" 
                    onClick={handleSettingsClick}
                    title="Settings"
                  >
                    <Settings className="size-4" />
                  </Button>
                </ChatHeaderBlock>
              </ChatHeader>
            </div>
          </div>
        </div>

        {/* === MESSAGE WALL CONTAINER (Scrollable Content Area) === */}
        <div className="h-full overflow-y-auto w-full px-6 py-4 pt-[96px] pb-[136px]"> 
          <div className="flex flex-col items-center justify-end min-h-full">
            {isClient ? (
              <>
                <div className="max-w-3xl w-full"> 
                    <MessageWall messages={messages} status={status} durations={durations} onDurationChange={handleDurationChange} />
                </div>
                {status === "submitted" && (
                  <div className="flex justify-start max-w-3xl w-full pt-4"> 
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
          className="fixed bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 pt-5 px-6 pb-4 shadow-xl transition-all duration-300" 
        >
          <div className="w-full flex justify-center relative">
            <div className="max-w-3xl w-full"> 
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
                          
                          {/* Send button with hardcoded pink background */}
                          {(status == "ready" || status == "error") && (
                            <Button
                              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full h-10 w-10 shadow-md bg-[#FFD1DC] text-gray-800 hover:bg-[#FFD1DC]/70 transition-colors"
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
