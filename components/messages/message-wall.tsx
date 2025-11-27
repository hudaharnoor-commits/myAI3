import { UIMessage } from "ai";
import { useEffect, useRef } from "react";
import { UserMessage } from "./user-message";
import { AssistantMessage } from "./assistant-message";

type MessageWallProps = {
  messages: UIMessage[];
  status?: string;
  durations?: Record<string, number>;
  onDurationChange?: (key: string, duration: number) => void;
};

export function MessageWall({
  messages,
  status,
  durations,
  onDurationChange,
}: MessageWallProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Filter out system/tool noise like “Used tool”
  const visibleMessages = messages.filter((m) => {
    const text = (m.parts || [])
      .map((p: any) => (p?.text ?? "").toString())
      .join(" ")
      .trim();

    // Filter log lines
    if (text === "Used tool" || text === "tool used") return false;

    // SYSTEM messages are hidden
    if (m.role === "system") return false;

    return true;
  });

  return (
    <div className="relative max-w-3xl w-full">
      <div className="relative flex flex-col gap-4">
        {visibleMessages.map((message, messageIndex) => {
          const isLastMessage = messageIndex === visibleMessages.length - 1;
          return (
            <div key={message.id} className="w-full">
              {message.role === "user" ? (
                <UserMessage message={message} />
              ) : (
                <AssistantMessage
                  message={message}
                  status={status}
                  isLastMessage={isLastMessage}
                  durations={durations}
                  onDurationChange={onDurationChange}
                />
              )}
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
