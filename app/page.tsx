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
import { ArrowUp, Loader2, Plus, Square } from "lucide-react";
import { MessageWall } from "@/components/messages/message-wall"; // You'll need to adjust MessageWall for bubble styling
import { ChatHeader } from "@/app/parts/chat-header"; // Assuming this is a div with flex properties
import { ChatHeaderBlock } from "@/app/parts/chat-header"; // Assuming this is a div
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { UIMessage } from "ai";
import { useEffect, useState, useRef } from "react";
// Ensure these config variables exist or replace them with strings
import { AI_NAME, CLEAR_CHAT_TEXT, OWNER_NAME, WELCOME_MESSAGE } from "@/config"; 
import Image from "next/image";
import Link from "next/link";

// Custom styles for colors based on the image
const primaryAccent = "#F5E9E4"; // Soft pinkish-beige for borders, accents
const secondaryAccent = "#C9F1EC"; // Soft mint/teal for assistant bubbles
const textGray = "#4A4A4A"; // Darker gray for primary text
const lightGray = "#E0E0E0"; // Lighter gray for input borders, subtle lines

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
    if (stored.messages.length > 0) {
      setMessages(stored.messages);
    }
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
    // Main container to center the chat card
    <div className="flex h-screen items-center justify-center font-sans bg-gray-100 dark:bg-gray-900 p-4">
      {/* The main chat card container, matching the image */}
      <main 
        className="relative w-full max-w-lg h-[600px] bg-white dark:bg-gray-800 rounded-3xl shadow-xl overflow-hidden"
        style={{ boxShadow: '0 10px 30px rgba(0,0,0,0.1), 0 4px 12px rgba(0,0,0,0.05)' }} // Custom shadow for depth
      >
        {/* === Header matching the image === */}
        <div 
          className="absolute top-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 py-4 px-6 border-b"
          style={{ borderColor: primaryAccent }} // Using custom primaryAccent for border
        >
          <ChatHeader className="flex items-center justify-between"> {/* Ensure ChatHeader has flex properties */}
            <ChatHeaderBlock className="flex items-center gap-3">
              <Avatar
                className="size-12 ring-2"
                style={{ borderColor: primaryAccent, borderWidth: '2px', backgroundColor: primaryAccent }} // Custom border and background for avatar ring
              >
                <AvatarImage src="/placeholder-stylist.jpg" alt="Stylist Avatar" /> {/* Placeholder image for stylist */}
                <AvatarFallback className="bg-gray-200 text-gray-700">AS</AvatarFallback>
              </Avatar>
              <p className="font-semibold text-lg" style={{ color: textGray }}>Chat with Ava, your Stylist</p>
            </ChatHeaderBlock>
            <ChatHeaderBlock className="flex justify-end">
              <Button
                variant="default" // Using default button with custom background
                size="sm"
                className="cursor-pointer text-sm font-medium rounded-full px-4 py-2 flex items-center gap-1"
                style={{ backgroundColor: primaryAccent, color: textGray, boxShadow: '0 2px 5px rgba(0,0,0,0.08)' }}
                onClick={clearChat}
              >
                <Plus className="size-4" />
                New Chat
              </Button>
            </ChatHeaderBlock>
          </ChatHeader>
        </div>

        {/* === MESSAGE WALL CONTAINER === */}
        {/* Adjusted padding to fit header and footer perfectly within the card */}
        <div className="h-full overflow-y-auto px-6 py-4 pt-[90px] pb-[130px]"> 
          <div className="flex flex-col items-center justify-end min-h-full">
            {isClient ? (
              <>
                {/* You will need to adjust your MessageWall component and individual message components 
                  to render bubbles like in the image (e.g., background colors, border-radii).
                  For now, I'm assuming MessageWall takes care of message display.
                */}
                <MessageWall 
                  messages={messages} 
                  status={status} 
                  durations={durations} 
                  onDurationChange={handleDurationChange} 
                  // Pass custom styles for bubbles if MessageWall supports it
                  // For example: assistantBubbleBg={secondaryAccent} userBubbleBg={lightGray}
                />
                {status === "submitted" && (
                  <div className="flex justify-start max-w-sm w-full pt-4"> 
                    <Loader2 className="size-5 animate-spin" style={{ color: primaryAccent }} />
                  </div>
                )}
              </>
            ) : (
              <div className="flex justify-center max-w-sm w-full">
                <Loader2 className="size-6 animate-spin" style={{ color: primaryAccent }} /> 
              </div>
            )}
          </div>
        </div>

        {/* === FLOATING INPUT FOOTER matching the image === */}
        <div 
          className="absolute bottom-0 left-0 right-0 z-10 bg-white dark:bg-gray-800 pt-5 px-6 pb-4" 
          style={{ boxShadow: '0 -10px 20px rgba(0,0,0,0.05)' }} // Subtle top shadow for the floating effect
        >
          <div className="w-full flex justify-center relative">
            <div className="w-full"> {/* Max width of 3xl might be too wide for the image, adjusting to full width within card */}
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
                        <div className="relative">
                          <Input
                            {...field}
                            id="chat-form-message"
                            // Very heavily rounded input field
                            className="h-14 pr-16 pl-5 bg-white dark:bg-gray-700 border-2 shadow-sm rounded-[30px] transition-all duration-300 placeholder:text-gray-400 text-base" 
                            style={{ borderColor: lightGray, color: textGray, boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.08)' }} // Custom border and inner shadow
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
                          {/* Send button styling */}
                          {(status == "ready" || status == "error") && (
                            <Button
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full h-9 w-9 shadow-md"
                              type="submit"
                              disabled={!field.value.trim()}
                              size="icon"
                              style={{ backgroundColor: primaryAccent, color: textGray, boxShadow: '0 2px 5px rgba(0,0,0,0.1)' }}
                            >
                              <ArrowUp className="size-4" />
                            </Button>
                          )}
                          {/* Stop button styling */}
                          {(status == "streaming" || status == "submitted") && (
                            <Button
                              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full h-9 w-9 bg-destructive hover:bg-destructive/90 shadow-md"
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
          <div className="w-full px-5 py-2 flex justify-center text-xs" style={{ color: textGray }}>
            <p className="text-center font-medium">
              © {new Date().getFullYear()} StyleMe&nbsp;·&nbsp;
              <Link href="/terms" className="underline underline-offset-2 hover:text-primary transition-colors" style={{ color: textGray }}>Terms of Use</Link>
              &nbsp;·&nbsp;Powered by&nbsp;
              <Link href="https://ringel.ai/" className="underline underline-offset-2 hover:text-primary transition-colors" style={{ color: textGray }}>FashionAI</Link>
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
