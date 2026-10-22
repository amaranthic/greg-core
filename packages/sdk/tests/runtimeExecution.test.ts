import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import http from "node:http";
import { z } from "zod";
import { generateText, streamText, generateObject } from "../src/index.js";

/**
 * Test suite for runtime execution functions forwarding options and preserving AI SDK result types.
 */
describe("runtimeExecution", () => {
  let server: http.Server;
  let serverBaseUrl: string;

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        const parsedBody = body ? (JSON.parse(body) as Record<string, unknown>) : {};
        const isStreaming = parsedBody["stream"] === true;

        if (isStreaming) {
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });

          res.write(
            `data: ${JSON.stringify({
              id: "stream-chunk-1",
              choices: [{ delta: { content: "Streaming " }, finish_reason: null }],
            })}\n\n`,
          );
          res.write(
            `data: ${JSON.stringify({
              id: "stream-chunk-2",
              choices: [{ delta: { content: "text " }, finish_reason: null }],
            })}\n\n`,
          );
          res.write(
            `data: ${JSON.stringify({
              id: "stream-chunk-3",
              choices: [{ delta: { content: "works!" }, finish_reason: "stop" }],
            })}\n\n`,
          );
          res.write("data: [DONE]\n\n");
          res.end();
          return;
        }

        // Non-streaming response (used for both generateText and generateObject)
        const isObjectRequest = JSON.stringify(parsedBody).includes("person");
        const content = isObjectRequest
          ? JSON.stringify({ name: "Alice", age: 30 })
          : "Standard execution response";

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: "chatcmpl-exec-123",
            object: "chat.completion",
            created: 1700000000,
            model: "test-model",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content,
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 12,
              completion_tokens: 8,
              total_tokens: 20,
            },
          }),
        );
      });
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => {
        const address = server.address() as { port: number };
        serverBaseUrl = `http://127.0.0.1:${address.port}/v1`;
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("should execute generateText with prompt and instructions", async () => {
    let onStartCalled = false;
    let onEndCalled = false;

    const result = await generateText({
      model: "compatible/test-model",
      apiKey: "test-key",
      baseUrl: serverBaseUrl,
      instructions: "Be concise.",
      prompt: "Hello runtime",
      onStart: () => {
        onStartCalled = true;
      },
      onEnd: () => {
        onEndCalled = true;
      },
    });

    expect(result.text).toBe("Standard execution response");
    expect(result.usage.inputTokens).toBe(12);
    expect(result.usage.outputTokens).toBe(8);
    expect(onStartCalled).toBe(true);
    expect(onEndCalled).toBe(true);
  });

  it("should execute streamText and stream tokens correctly", async () => {
    const result = streamText({
      model: "compatible/test-model",
      apiKey: "test-key",
      baseUrl: serverBaseUrl,
      prompt: "Stream to me",
    });

    let fullText = "";
    for await (const chunk of result.textStream) {
      fullText += chunk;
    }

    expect(fullText).toBe("Streaming text works!");
    expect(await result.text).toBe("Streaming text works!");
  });

  it("should execute generateObject and validate structured JSON output", async () => {
    const personSchema = z.object({
      name: z.string(),
      age: z.number(),
    });

    const result = await generateObject({
      model: "compatible/test-model",
      apiKey: "test-key",
      baseUrl: serverBaseUrl,
      schema: personSchema,
      prompt: "Generate person data",
    });

    expect(result.object).toEqual({
      name: "Alice",
      age: 30,
    });
  });
});
