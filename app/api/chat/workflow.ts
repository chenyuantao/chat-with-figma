import { StateGraph, MessagesAnnotation } from "@langchain/langgraph";
import { ChatOpenAI } from "@langchain/openai";
import { ToolMessage, AIMessage, BaseMessage } from "@langchain/core/messages";
import { tools as openAiTools, runFunction } from "./functions";

// Initialize model
const model = new ChatOpenAI({
  modelName: "anthropic/claude-sonnet-4.5",
  openAIApiKey: process.env.OPENAI_API_KEY,
  configuration: {
    baseURL: "https://openrouter.ai/api/v1",
    defaultHeaders: {
      "HTTP-Referer": "https://github.com/cline/cline", // Optional: required by OpenRouter for some tiers
      "X-Title": "Chat with Figma", // Optional
    }
  },
  temperature: 0,
  streaming: true
});

// Bind tools to the model
const modelWithTools = model.bindTools(openAiTools);

// 1. Agent Node
async function agent(state: typeof MessagesAnnotation.State) {
  const { messages } = state;
  const response = await modelWithTools.invoke(messages);
  return { messages: [response] };
}

// 2. Tool Node
async function toolNode(state: typeof MessagesAnnotation.State) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  
  if (!lastMessage.tool_calls || lastMessage.tool_calls.length === 0) {
    return { messages: [] };
  }

  const results = await Promise.all(lastMessage.tool_calls.map(async (toolCall) => {
    try {
      const result = await runFunction(toolCall.id!, toolCall.name, toolCall.args);
      return new ToolMessage({
        tool_call_id: toolCall.id!,
        content: typeof result === 'string' ? result : JSON.stringify(result),
        name: toolCall.name
      });
    } catch (e) {
      return new ToolMessage({
        tool_call_id: toolCall.id!,
        content: `Error: ${e instanceof Error ? e.message : String(e)}`,
        name: toolCall.name
      });
    }
  }));

  return { messages: results };
}

// 3. Condition to continue or end
function shouldContinue(state: typeof MessagesAnnotation.State) {
  const { messages } = state;
  const lastMessage = messages[messages.length - 1] as AIMessage;
  if (lastMessage.tool_calls && lastMessage.tool_calls.length > 0) {
    return "tools";
  }
  return "__end__";
}

// 4. Define Graph
const workflow = new StateGraph(MessagesAnnotation)
  .addNode("agent", agent)
  .addNode("tools", toolNode)
  .addEdge("__start__", "agent")
  .addConditionalEdges("agent", shouldContinue)
  .addEdge("tools", "agent");

export const app = workflow.compile();

