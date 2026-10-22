import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import http from "node:http";
import { generateText } from "../src/index.js";

/**
 * Test suite for compatible/* custom OpenAI-compatible endpoints with mock server.
 */
describe("compatibleProvider", () => {
  let server: http.Server;
  let serverBaseUrl: string;
  let receivedAuthHeader = "";
  let receivedRequestBody: Record<string, unknown> = {};

  beforeAll(async () => {
    server = http.createServer((req, res) => {
      receivedAuthHeader = req.headers.authorization ?? "";

      let body = "";
      req.on("data", (chunk) => {
        body += chunk;
      });

      req.on("end", () => {
        try {
          receivedRequestBody = JSON.parse(body) as Record<string, unknown>;
        } catch {
          receivedRequestBody = {};
        }

        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(
          JSON.stringify({
            id: "chatcmpl-test-123",
            object: "chat.completion",
            created: 1700000000,
            model: "custom-org/llama-3-8b",
            choices: [
              {
                index: 0,
                message: {
                  role: "assistant",
                  content: "Response from mock compatible endpoint",
                },
                finish_reason: "stop",
              },
            ],
            usage: {
              prompt_tokens: 15,
              completion_tokens: 7,
              total_tokens: 22,
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

  it("should successfully execute generateText against a custom OpenAI-compatible endpoint", async () => {
    const result = await generateText({
      model: "compatible/custom-org/llama-3-8b",
      apiKey: "secret-token-xyz",
      baseUrl: serverBaseUrl,
      prompt: "Tell me a joke",
    });

    expect(result.text).toBe("Response from mock compatible endpoint");
    expect(result.usage.inputTokens).toBe(15);
    expect(result.usage.outputTokens).toBe(7);

    // Verify request headers and model payload received by the server
    expect(receivedAuthHeader).toBe("Bearer secret-token-xyz");
    expect(receivedRequestBody["model"]).toBe("custom-org/llama-3-8b");
  });
});
