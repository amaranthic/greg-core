import { readFile as fsReadFile } from "node:fs/promises";
import * as readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
import { z } from "zod";
import {
  streamText,
  tool,
  isStepCount,
  type ModelMessage,
} from "../src/index.js";

/**
 * Tool for reading the content of a local file from disk.
 */
const readFileTool = tool({
  description: "Reads the content of a local file from disk.",
  inputSchema: z.object({
    filePath: z.string().describe("The relative or absolute file path to read"),
  }),
  execute: async ({ filePath }: { filePath: string }) => {
    try {
      const content = await fsReadFile(filePath, "utf-8");
      return { success: true, content: content.slice(0, 1000) };
    } catch (error) {
      return { success: false, error: String(error) };
    }
  },
});

/**
 * Tool for retrieving the current local and ISO system time.
 */
const getTimeTool = tool({
  description: "Returns the current system timestamp and date.",
  inputSchema: z.object({}),
  execute: async () => {
    return {
      isoTime: new Date().toISOString(),
      localTime: new Date().toLocaleString(),
    };
  },
});

/**
 * Map of available tools for the assistant.
 */
const agentTools = {
  readFile: readFileTool,
  getTime: getTimeTool,
};

/**
 * Runs an interactive terminal chat session with dynamic model switching and tool execution.
 *
 * Turns 1 to 3 use Google's Gemini Flash Lite model.
 * Turn 4 and beyond switch to OpenRouter's free model tier.
 */
async function startInteractiveChatSession(): Promise<void> {
  const googleApiKey =
    process.env["GOOGLE_API_KEY"] ??
    process.env["GEMINI_API_KEY"] ??
    process.env["TEXTC_API_KEY"] ??
    process.env["GGOGLE_API_KEY"] ??
    "";
  const openRouterApiKey = process.env["OPENROUTER_API_KEY"] ?? "";

  const googleBaseUrl = "https://generativelanguage.googleapis.com/v1beta";
  const openRouterBaseUrl = "https://openrouter.ai/api/v1";

  const rl = readline.createInterface({ input, output });
  const conversationHistory: ModelMessage[] = [];
  let userTurnCount = 0;

  console.log("=================================================");
  console.log("  Greg SDK Interactive Chat Session");
  console.log("  - Turns 1-3: google/gemini-2.5-flash-lite");
  console.log("  - Turn 4+:   openrouter/openrouter/free");
  console.log("  - Tools:     readFile, getTime");
  console.log("  Type 'exit' or 'quit' to end the session.");
  console.log("=================================================\n");

  try {
    while (true) {
      const userPrompt = await rl.question("You: ");

      if (!userPrompt || userPrompt.trim().length === 0) {
        continue;
      }

      const normalized = userPrompt.trim().toLowerCase();
      if (normalized === "exit" || normalized === "quit") {
        console.log("Exiting chat session. Goodbye!");
        break;
      }

      userTurnCount += 1;

      // Select model and credentials based on the turn count
      const isGoogleTurn = userTurnCount <= 3;
      const model = isGoogleTurn
        ? "google/gemini-2.5-flash-lite"
        : "openrouter/openrouter/free";
      const apiKey = isGoogleTurn ? googleApiKey : openRouterApiKey;
      const baseUrl = isGoogleTurn ? googleBaseUrl : openRouterBaseUrl;

      console.log(`[Turn ${userTurnCount} using ${model}]`);

      conversationHistory.push({
        role: "user",
        content: userPrompt,
      });

      try {
        const result = streamText({
          model,
          apiKey,
          baseUrl,
          tools: agentTools,
          stopWhen: isStepCount(5),
          messages: conversationHistory,
        });

        process.stdout.write("Assistant: ");

        for await (const part of result.stream) {
          switch (part.type) {
            case "text-delta": {
              process.stdout.write(part.text);
              break;
            }
            case "tool-call": {
              console.log(
                `\n[Tool Executing: ${part.toolName} with input: ${JSON.stringify(part.input)}]`,
              );
              break;
            }
            case "tool-result": {
              console.log(
                `[Tool Completed: ${part.toolName} -> result: ${JSON.stringify(part.output)}]`,
              );
              break;
            }
            default:
              break;
          }
        }
        process.stdout.write("\n\n");

        // Preserve response messages including tool calls and tool results across turns
        const responseMessages = await result.responseMessages;
        conversationHistory.push(...responseMessages);
      } catch (error) {
        console.error(`\nError generating response for turn ${userTurnCount}:`, error);
      }
    }
  } finally {
    rl.close();
  }
}

// Start the interactive chat session
startInteractiveChatSession().catch((error) => {
  console.error("Fatal error:", error);
});
