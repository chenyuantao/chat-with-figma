import { StreamingTextResponse } from "ai";
import { app } from "./workflow";
import { HumanMessage, AIMessage, SystemMessage, ToolMessage, BaseMessage } from "@langchain/core/messages";
import fs from "fs";
import path from "path";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const { messages: rawMessages } = await req.json();

  // Read system prompt
  const systemPrompt = fs.readFileSync(path.join(process.cwd(), 'prompt-system.md'), 'utf8');

  // Convert messages
  const messages: BaseMessage[] = [
    new SystemMessage(systemPrompt),
    ...rawMessages.map((m: any) => {
      if (m.role === 'user') return new HumanMessage(m.content);
      if (m.role === 'assistant') {
        return new AIMessage({
          content: m.content || "",
          tool_calls: m.tool_calls || [],
        });
      }
      if (m.role === 'tool') {
        return new ToolMessage({
          content: m.content,
          tool_call_id: m.tool_call_id,
          name: m.name || "tool_result" // fallback
        });
      }
      return new HumanMessage(m.content);
    })
  ];

  const encoder = new TextEncoder();

  // Create a stream
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const eventStream = await app.streamEvents(
          { messages },
          { version: "v2" }
        );

        for await (const { event, data } of eventStream) {
          if (event === "on_chat_model_stream") {
            // data.chunk is AIMessageChunk
            // Only stream text content
            if (data.chunk.content && typeof data.chunk.content === "string") {
               controller.enqueue(encoder.encode(data.chunk.content));
            }
          }
        }
        controller.close();
      } catch (e) {
        console.error("Error in stream:", e);
        controller.error(e);
      }
    }
  });

  return new StreamingTextResponse(stream);
}
