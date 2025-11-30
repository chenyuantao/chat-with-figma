import { OpenRouter } from "@openrouter/sdk";
import {
  OpenAIStream,
  StreamingTextResponse,
} from "ai";
import fs from "fs";
import path from "path";
import { tools, runFunction } from "./functions";

// Create an OpenRouter API client
const openrouter = new OpenRouter({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "nodejs";

const MODEL = "anthropic/claude-sonnet-4.5";

export async function POST(req: Request) {
  const { messages: rawMessages } = await req.json();
  const messages = [
    {
      role: "system",
      content: fs.readFileSync(path.join(process.cwd(), 'prompt-system.md'), 'utf8'),
    },
    ...convertToOpenRouterMessages(rawMessages),
  ];

  // check if the conversation requires a function call to be made
  const initialResponse = await openrouter.chat.send({
    model: MODEL,
    messages: messages as any,
    stream: true,
    tools: tools as any,
    toolChoice: "auto",
  });

  // Transform OpenRouter SDK camelCase chunks to OpenAI snake_case chunks
  async function* transformStream(stream: AsyncIterable<any>) {
    for await (const chunk of stream) {
      yield {
        id: chunk.id,
        created: chunk.created,
        model: chunk.model,
        object: chunk.object,
        system_fingerprint: chunk.systemFingerprint,
        choices: chunk.choices.map((choice: any) => ({
          index: choice.index,
          finish_reason: choice.finishReason,
          delta: {
            content: choice.delta.content,
            role: choice.delta.role,
            tool_calls: choice.delta.toolCalls?.map((tc: any) => ({
              index: tc.index,
              id: tc.id,
              type: tc.type,
              function: tc.function
                ? {
                  name: tc.function.name,
                  arguments: tc.function.arguments,
                }
                : undefined,
            })),
            function_call: choice.delta.functionCall
              ? {
                name: choice.delta.functionCall.name,
                arguments: choice.delta.functionCall.arguments,
              }
              : undefined,
          },
        })),
      };
    }
  }

  const stream = OpenAIStream(transformStream(initialResponse), {
    experimental_onToolCall: async (
      toolCallPayload: any,
      appendToolCallMessage: any,
    ) => {
      const toolCallResults = await Promise.all(toolCallPayload.tools.map(async (toolCall: any) => {
        let args = toolCall.func.arguments;
        try {
          args = JSON.parse(args);
        } catch (error) {
          console.error(`Error parsing arguments for tool call ${toolCall.func.name}:`, error);
        }
        const result = await runFunction(
          toolCall.id,
          toolCall.func.name,
          args
        );
        return {
          tool_call_id: toolCall.id,
          function_name: toolCall.func.name,
          tool_call_result: result?.content ?? result ?? 'Unknown error',
        };
      }));
      // Append the results to the message history helper
      for (const result of toolCallResults) {
        appendToolCallMessage(result);
      }

      // Get the updated messages including the tool results
      const newMessages = appendToolCallMessage();
      const sendMessages = [...messages, ...convertToOpenRouterMessages(newMessages)] as any;
      console.log('--- sendMessages ---', sendMessages.length);
      const response = await openrouter.chat.send({
        model: MODEL,
        stream: true,
        messages: sendMessages,
        tools: tools as any,
        toolChoice: "auto",
      });

      return transformStream(response);
    },
  } as any);

  return new StreamingTextResponse(stream);
}

// Helper to convert Vercel AI SDK message format to OpenRouter SDK format
function convertToOpenRouterMessages(messages: any[]) {
  return messages.map((message) => {
    const newMessage = { ...message };

    // Convert tool_call_id to toolCallId for tool messages
    if (newMessage.role === 'tool' && newMessage.tool_call_id) {
      newMessage.toolCallId = newMessage.tool_call_id;
      delete newMessage.tool_call_id;
    }

    // Convert tool_calls to toolCalls for assistant messages
    if (newMessage.role === 'assistant' && newMessage.tool_calls) {
      newMessage.toolCalls = newMessage.tool_calls;
      delete newMessage.tool_calls;
    }

    return newMessage;
  });
}
