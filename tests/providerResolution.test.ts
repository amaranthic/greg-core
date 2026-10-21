import { describe, expect, it } from "bun:test";
import {
  getSupportedProviders,
  hasProvider,
  getProviderAdapter,
  resolveModel,
} from "../src/index.js";
import { UnsupportedProviderError } from "../src/errors.js";

/**
 * Test suite for provider registry, adapter resolution, and AI Gateway prevention.
 */
describe("providerResolution", () => {
  it("should contain all 13 supported providers in the registry", () => {
    const supported = getSupportedProviders();
    const expected = [
      "openai",
      "anthropic",
      "google",
      "xai",
      "deepseek",
      "groq",
      "mistral",
      "cohere",
      "togetherai",
      "alibaba",
      "openrouter",
      "compatible",
      "vercelgateway",
    ];

    for (const provider of expected) {
      expect(supported).toContain(provider);
      expect(hasProvider(provider)).toBe(true);
    }
  });

  it("should return false for unknown providers in hasProvider", () => {
    expect(hasProvider("unknown-ai")).toBe(false);
    expect(hasProvider("gateway")).toBe(false);
  });

  it("should throw UnsupportedProviderError for unregistered providers", () => {
    expect(() =>
      resolveModel("unknown-ai/some-model", {
        apiKey: "test-key",
        baseUrl: "https://api.unknown.com",
      }),
    ).toThrow(UnsupportedProviderError);

    try {
      getProviderAdapter("non-existent");
    } catch (error) {
      expect(UnsupportedProviderError.isInstance(error)).toBe(true);
      if (UnsupportedProviderError.isInstance(error)) {
        expect(error.provider).toBe("non-existent");
        expect(error.supportedProviders).toContain("openai");
        expect(error.message).toContain('compatible/model_name');
      }
    }
  });

  it("should instantiate models with official providers and never fall through to default Gateway", () => {
    const credentials = {
      apiKey: "test-api-key",
      baseUrl: "https://mock.endpoint.internal",
    };

    // OpenAI provider instantiation
    const openAIModel = resolveModel("openai/gpt-4o", credentials);
    expect(openAIModel.modelId).toBe("gpt-4o");
    expect(openAIModel.provider).toContain("openai");

    // Anthropic provider instantiation
    const anthropicModel = resolveModel("anthropic/claude-3-7-sonnet", credentials);
    expect(anthropicModel.modelId).toBe("claude-3-7-sonnet");
    expect(anthropicModel.provider).toContain("anthropic");

    // Google provider instantiation
    const googleModel = resolveModel("google/gemini-2.5-flash", credentials);
    expect(googleModel.modelId).toBe("gemini-2.5-flash");
    expect(googleModel.provider).toContain("google");

    // xAI provider instantiation
    const xaiModel = resolveModel("xai/grok-2-1212", credentials);
    expect(xaiModel.modelId).toBe("grok-2-1212");
    expect(xaiModel.provider).toContain("xai");

    // DeepSeek provider instantiation
    const deepSeekModel = resolveModel("deepseek/deepseek-chat", credentials);
    expect(deepSeekModel.modelId).toBe("deepseek-chat");
    expect(deepSeekModel.provider).toContain("deepseek");

    // OpenRouter provider instantiation
    const openRouterModel = resolveModel("openrouter/openrouter/free", credentials);
    expect(openRouterModel.modelId).toBe("openrouter/free");
    expect(openRouterModel.provider).toContain("openrouter");

    // Vercel AI Gateway provider instantiation
    const vercelGatewayModel = resolveModel("vercelgateway/openai/gpt-4o", credentials);
    expect(vercelGatewayModel.modelId).toBe("openai/gpt-4o");
    expect(vercelGatewayModel.provider).toBe("gateway");
  });

  it("should pass through existing LanguageModel objects directly without re-resolving", () => {
    const mockModel = {
      specificationVersion: "v1" as const,
      provider: "mock-custom-provider",
      modelId: "mock-custom-model",
      doGenerate: async () => {
        throw new Error("not implemented");
      },
      doStream: async () => {
        throw new Error("not implemented");
      },
    };

    const resolved = resolveModel(mockModel as any, {
      apiKey: "key",
      baseUrl: "https://url.com",
    });

    expect(resolved).toBe(mockModel as any);
  });
});
