import type { Chat } from "openai/resources/chat/index";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { figmaMCPClient } from "./mcp";

export const functions: Chat.ChatCompletionCreateParams.Function[] = [
  {
    name: "get_screenshot",
    description:
      "Generate a screenshot for a given node or the currently selected node in the Figma desktop app. Use the nodeId parameter to specify a node id. nodeId parameter is REQUIRED. Use the fileKey parameter to specify the file key. fileKey parameter is REQUIRED. If a URL is provided, extract the file key and node id from the URL. For example, if given the URL https://figma.com/design/pqrs/ExampleFile?node-id=1-2 the extracted fileKey would be `pqrs` and the extracted nodeId would be `1:2`. If the URL is of the format https://figma.com/design/:fileKey/branch/:branchKey/:fileName then use the branchKey as the fileKey.",
    parameters: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          pattern: "^$|^(?:-?\\d+[:-]-?\\d+)$",
          description:
            'The ID of the node in the Figma document, eg. "123:456" or "123-456". This should be a valid node ID in the Figma document.',
        },
        fileKey: {
          type: "string",
          description:
            "The key of the Figma file to use. If the URL is provided, extract the file key from the URL. The given URL must be in the format https://figma.com/design/:fileKey/:fileName?node-id=:int1-:int2. The extracted fileKey would be `:fileKey`.",
        },
        clientLanguages: {
          type: "string",
          description:
            "A comma separated list of programming languages used by the client in the current context in string form, e.g. `javascript`, `html,css,typescript`, etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which languages are being used. If you are unsure, it is better to list `unknown` than to make a guess.",
        },
        clientFrameworks: {
          type: "string",
          description:
            "A comma separated list of frameworks used by the client in the current context, e.g. `react`, `vue`, `django` etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which frameworks are being used. If you are unsure, it is better to list `unknown` than to make a guess",
        },
      },
      required: ["nodeId", "fileKey"],
      additionalProperties: false,
    },
  },
  {
    name: "create_design_system_rules",
    description:
      "Provides a prompt to generate design system rules for this repo.",
    parameters: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          pattern: "^$|^(?:-?\\d+[:-]-?\\d+)$",
          description:
            'The ID of the node in the Figma document, eg. "123:456" or "123-456". This should be a valid node ID in the Figma document.',
        },
        clientLanguages: {
          type: "string",
          description:
            "A comma separated list of programming languages used by the client in the current context in string form, e.g. `javascript`, `html,css,typescript`, etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which languages are being used. If you are unsure, it is better to list `unknown` than to make a guess.",
        },
        clientFrameworks: {
          type: "string",
          description:
            "A comma separated list of frameworks used by the client in the current context, e.g. `react`, `vue`, `django` etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which frameworks are being used. If you are unsure, it is better to list `unknown` than to make a guess",
        },
      },
      required: [],
      additionalProperties: false,
    },
  },
  {
    name: "get_design_context",
    description:
      "Generate UI code for a given node in Figma. Use the nodeId parameter to specify a node id. Use the fileKey parameter to specify the file key. If a URL is provided, extract the node id from the URL, for example, if given the URL https://figma.com/design/:fileKey/:fileName?node-id=1-2, the extracted nodeId would be `1:2` and the fileKey would be `:fileKey`. If the URL is of the format https://figma.com/design/:fileKey/branch/:branchKey/:fileName then use the branchKey as the fileKey. The response will contain a code string and a JSON of download URLs for the assets referenced in the code.",
    parameters: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          pattern: "^$|^(?:-?\\d+[:-]-?\\d+)$",
          description:
            'The ID of the node in the Figma document, eg. "123:456" or "123-456". This should be a valid node ID in the Figma document.',
        },
        fileKey: {
          type: "string",
          description:
            "The key of the Figma file to use. If the URL is provided, extract the file key from the URL. The given URL must be in the format https://figma.com/design/:fileKey/:fileName?node-id=:int1-:int2. The extracted fileKey would be `:fileKey`.",
        },
        clientLanguages: {
          type: "string",
          description:
            "A comma separated list of programming languages used by the client in the current context in string form, e.g. `javascript`, `html,css,typescript`, etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which languages are being used. If you are unsure, it is better to list `unknown` than to make a guess.",
        },
        clientFrameworks: {
          type: "string",
          description:
            "A comma separated list of frameworks used by the client in the current context, e.g. `react`, `vue`, `django` etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which frameworks are being used. If you are unsure, it is better to list `unknown` than to make a guess",
        },
        forceCode: {
          type: "boolean",
          description:
            "Whether code should always be returned, instead of returning just metadata if the output size is too large. Only set this when the user directly requests to force the code.",
        },
        disableCodeConnect: {
          type: "boolean",
          description:
            "Whether Code Connect should be used to get the design context. Only set this when the user directly requests to disable Code Connect.",
        },
      },
      required: ["nodeId", "fileKey"],
      additionalProperties: false,
    },
  },
  {
    name: "get_metadata",
    description:
      "IMPORTANT: Always prefer to use get_design_context tool. Get metadata for a node or page in the Figma desktop app in XML format. Useful only for getting an overview of the structure, it only includes node IDs, layer types, names, positions and sizes. You can call get_design_context on the node IDs contained in this response. Use the nodeId parameter to specify a node id, it can also be the page id (e.g. 0:1). Extract the node id from the URL, for example, if given the URL https://figma.com/design/:fileKey/:fileName?node-id=1-2, the extracted nodeId would be `1:2`. If the URL is of the format https://figma.com/design/:fileKey/branch/:branchKey/:fileName then use the branchKey as the fileKey.",
    parameters: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          pattern: "^$|^(?:-?\\d+[:-]-?\\d+)$",
          description:
            'The ID of the node in the Figma document, eg. "123:456" or "123-456". This should be a valid node ID in the Figma document.',
        },
        fileKey: {
          type: "string",
          description:
            "The key of the Figma file to use. If the URL is provided, extract the file key from the URL. The given URL must be in the format https://figma.com/design/:fileKey/:fileName?node-id=:int1-:int2. The extracted fileKey would be `:fileKey`.",
        },
        clientLanguages: {
          type: "string",
          description:
            "A comma separated list of programming languages used by the client in the current context in string form, e.g. `javascript`, `html,css,typescript`, etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which languages are being used. If you are unsure, it is better to list `unknown` than to make a guess.",
        },
        clientFrameworks: {
          type: "string",
          description:
            "A comma separated list of frameworks used by the client in the current context, e.g. `react`, `vue`, `django` etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which frameworks are being used. If you are unsure, it is better to list `unknown` than to make a guess",
        },
      },
      required: ["nodeId", "fileKey"],
      additionalProperties: false,
    },
  },
  {
    name: "get_variable_defs",
    description:
      "Get variable definitions for a given node id. E.g. {'icon/default/secondary': #949494}Variables are reusable values that can be applied to all kinds of design properties, such as fonts, colors, sizes and spacings. Use the nodeId parameter to specify a node id. Extract the node id from the URL, for example, if given the URL https://figma.com/design/:fileKey/:fileName?node-id=1-2, the extracted nodeId would be `1:2`. If the URL is of the format https://figma.com/design/:fileKey/branch/:branchKey/:fileName then use the branchKey as the fileKey.",
    parameters: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          pattern: "^$|^(?:-?\\d+[:-]-?\\d+)$",
          description:
            'The ID of the node in the Figma document, eg. "123:456" or "123-456". This should be a valid node ID in the Figma document.',
        },
        fileKey: {
          type: "string",
          description:
            "The key of the Figma file to use. If the URL is provided, extract the file key from the URL. The given URL must be in the format https://figma.com/design/:fileKey/:fileName?node-id=:int1-:int2. The extracted fileKey would be `:fileKey`.",
        },
        clientLanguages: {
          type: "string",
          description:
            "A comma separated list of programming languages used by the client in the current context in string form, e.g. `javascript`, `html,css,typescript`, etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which languages are being used. If you are unsure, it is better to list `unknown` than to make a guess.",
        },
        clientFrameworks: {
          type: "string",
          description:
            "A comma separated list of frameworks used by the client in the current context, e.g. `react`, `vue`, `django` etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which frameworks are being used. If you are unsure, it is better to list `unknown` than to make a guess",
        },
      },
      required: ["nodeId", "fileKey"],
      additionalProperties: false,
    },
  },
  {
    name: "get_figjam",
    description:
      "Generate UI code for a given FigJam node in Figma. Use the nodeId parameter to specify a node id. Use the fileKey parameter to specify the file key. If a URL is provided, extract the node id from the URL, for example, if given the URL https://figma.com/board/:fileKey/:fileName?node-id=1-2, the extracted nodeId would be `1:2` and the fileKey would be `:fileKey`. IMPORTANT: This tool only works for FigJam files, not other Figma files.",
    parameters: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          pattern: "^$|^(?:-?\\d+[:-]-?\\d+)$",
          description:
            'The ID of the node in the Figma document, eg. "123:456" or "123-456". This should be a valid node ID in the Figma document.',
        },
        fileKey: {
          type: "string",
          description:
            "The key of the Figma file to use. If the URL is provided, extract the file key from the URL. The given URL must be in the format https://figma.com/design/:fileKey/:fileName?node-id=:int1-:int2. The extracted fileKey would be `:fileKey`.",
        },
        clientLanguages: {
          type: "string",
          description:
            "A comma separated list of programming languages used by the client in the current context in string form, e.g. `javascript`, `html,css,typescript`, etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which languages are being used. If you are unsure, it is better to list `unknown` than to make a guess.",
        },
        clientFrameworks: {
          type: "string",
          description:
            "A comma separated list of frameworks used by the client in the current context, e.g. `react`, `vue`, `django` etc. If you do not know, please list `unknown`. This is used for logging purposes to understand which frameworks are being used. If you are unsure, it is better to list `unknown` than to make a guess",
        },
        includeImagesOfNodes: {
          type: "boolean",
          description: "Whether to include images of nodes in the response",
        },
      },
      required: ["nodeId", "fileKey"],
      additionalProperties: false,
    },
  },
  {
    name: "get_code_connect_map",
    description:
      "Get a mapping of {[nodeId]: {codeConnectSrc: e.g. location of component in codebase, codeConnectName: e.g. name of component in codebase} E.g. {'1:2': { codeConnectSrc: 'https://github.com/foo/components/Button.tsx', codeConnectName: 'Button' } }. Use the nodeId parameter to specify a node id. Use the fileKey parameter to specify the file key.If a URL is provided, extract the node id from the URL, for example, if given the URL https://figma.com/design/:fileKey/:fileName?node-id=1-2, the extracted nodeId would be `1:2` and the fileKey would be `:fileKey`.",
    parameters: {
      type: "object",
      properties: {
        nodeId: {
          type: "string",
          pattern: "^$|^(?:-?\\d+[:-]-?\\d+)$",
          description:
            'The ID of the node in the Figma document, eg. "123:456" or "123-456". This should be a valid node ID in the Figma document.',
        },
        fileKey: {
          type: "string",
          description:
            "The key of the Figma file to use. If the URL is provided, extract the file key from the URL. The given URL must be in the format https://figma.com/design/:fileKey/:fileName?node-id=:int1-:int2. The extracted fileKey would be `:fileKey`.",
        },
        codeConnectLabel: {
          type: "string",
          description:
            "The label used to fetch Code Connect information for a particular language or framework when multiple Code Connect mappings exist.",
        },
      },
      required: ["nodeId", "fileKey"],
      additionalProperties: false,
    },
  },
  {
    name: "whoami",
    description:
      "Returns information about the authenticated user. If you are experiencing permission issues with other tools, you can use this tool to get information about who is authenticated and validate the right user is logged in.",
    parameters: {
      type: "object",
      properties: {},
      required: [],
      additionalProperties: false,
    },
  },
];

// Convert functions to tools format for the new API
export const tools: ChatCompletionTool[] = functions.map(
  (func) => ({
    type: "function" as const,
    function: func,
  })
);

export async function runFunction(name: string, args: any) {
  const startTime = Date.now();
  
  console.log(`[runFunction] Executing tool: ${name}`, {
    toolName: name,
    arguments: args,
    timestamp: new Date().toISOString(),
  });

  try {
    const data = await figmaMCPClient.callTool(
      name,
      args || {}
    );
    
    const duration = Date.now() - startTime;
    const result = data.result;
    
    // 记录结果信息
    const resultInfo = {
      toolName: name,
      duration: `${duration}ms`,
      hasResult: result !== undefined && result !== null,
      resultType: typeof result,
      timestamp: new Date().toISOString(),
    };

    // 如果是对象或数组，记录其结构信息
    if (typeof result === "object" && result !== null) {
      if (Array.isArray(result)) {
        (resultInfo as any).resultArrayLength = result.length;
      } else {
        (resultInfo as any).resultKeys = Object.keys(result);
      }
    } else if (typeof result === "string") {
      (resultInfo as any).resultLength = result.length;
    }

    console.log(`[runFunction] Tool execution completed: ${name}`, resultInfo);

    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[runFunction] Tool execution failed: ${name}`, {
      toolName: name,
      duration: `${duration}ms`,
      error: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
      timestamp: new Date().toISOString(),
    });
    throw error;
  }
}
