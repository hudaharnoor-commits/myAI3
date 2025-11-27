
import { streamText, UIMessage, convertToModelMessages, stepCountIs, createUIMessageStream, createUIMessageStreamResponse } from 'ai';
import { MODEL } from '@/config';
import { SYSTEM_PROMPT } from '@/prompts';
import { isContentFlagged } from '@/lib/moderation';
import { webSearch } from './tools/web-search';
import { vectorDatabaseSearch } from './tools/search-vector-database';


// Wrap tools in safe fallbacks so they never crash the whole chat
const safeWebSearch = {
  ...webSearch,
  async execute(args: any, options?: any) {
    try {
      // @ts-ignore: underlying tool may define execute differently
      return await webSearch.execute(args, options);
    } catch (error) {
      console.error("❌ webSearch tool failed:", error);
      // Return a harmless fallback so model can continue
      return {
        results: [],
        message: "Web search is temporarily unavailable, please continue without it.",
      };
    }
  },
};

const safeVectorDatabaseSearch = {
  ...vectorDatabaseSearch,
  async execute(args: any, options?: any) {
    try {
      // @ts-ignore
      return await vectorDatabaseSearch.execute(args, options);
    } catch (error) {
      console.error("❌ vectorDatabaseSearch tool failed:", error);
      return {
        results: [],
        message: "Knowledge base search failed; answer using general reasoning.",
      };
    }
  },
};

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    // 🔹 1. Get latest user message for moderation
    const latestUserMessage = messages
      .filter((msg) => msg.role === "user")
      .pop();

    if (latestUserMessage) {
      const textParts = latestUserMessage.parts
        .filter((part) => part.type === "text")
        .map((part) => ("text" in part ? (part as any).text : ""))
        .join("");

      if (textParts) {
        const moderationResult = await isContentFlagged(textParts);

        if (moderationResult.flagged) {
          const stream = createUIMessageStream({
            execute({ writer }) {
              const textId = "moderation-denial-text";

              writer.write({ type: "start" });

              writer.write({
                type: "text-start",
                id: textId,
              });

              writer.write({
                type: "text-delta",
                id: textId,
                delta:
                  moderationResult.denialMessage ||
                  "Your message violates our guidelines. I can't answer that.",
              });

              writer.write({
                type: "text-end",
                id: textId,
              });

              writer.write({ type: "finish" });
            },
          });

          return createUIMessageStreamResponse({ stream });
        }
      }
    }

    // 🔹 2. Main model call with SAFE tools
    const result = streamText({
  model: MODEL,
  system: SYSTEM_PROMPT,
  messages: convertToModelMessages(messages),
  tools: {
    webSearch: safeWebSearch,
    vectorDatabaseSearch: safeVectorDatabaseSearch,
  },
  stopWhen: stepCountIs(10),
  providerOptions: {
    openai: {
      reasoningSummary: "auto",
      reasoningEffort: "low",
      parallelToolCalls: false,
    },
  },
});


    return result.toUIMessageStreamResponse({
      sendReasoning: true,
    });
  } catch (error: any) {
    // 🔥 3. Catch ANY crash (tool error, model error, etc.)
    console.error("🔥 /api/chat POST error:", error);

    const stream = createUIMessageStream({
      execute({ writer }) {
        const id = "fatal-error-message";

        writer.write({ type: "start" });

        writer.write({
          type: "text-start",
          id,
        });

        writer.write({
          type: "text-delta",
          id,
          delta:
            "Sorry, something went wrong on my side while answering your question. Please try again with a slightly different prompt.",
        });

        writer.write({
          type: "text-end",
          id,
        });

        writer.write({ type: "finish" });
      },
    });

    return createUIMessageStreamResponse({ stream });
  }
}
