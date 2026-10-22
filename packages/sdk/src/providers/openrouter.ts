import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

const defaultOpenRouterBaseUrl = "https://openrouter.ai/api/v1";

/**
 * Adapter for the OpenRouter provider using `@ai-sdk/openai-compatible`.
 *
 * Configures OpenRouter routing with mandatory credentials, defaulting to
 * "https://openrouter.ai/api/v1" if baseUrl is empty. Preserves multi-slash model identifiers
 * (e.g. "openrouter/free" or "anthropic/claude-3-7-sonnet").
 */
export class OpenRouterProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "openrouter";

  /**
   * Instantiates an OpenRouter LanguageModel.
   *
   * @param modelId - The OpenRouter model identifier (e.g. "openrouter/free", "meta-llama/llama-3.3-70b-instruct").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated OpenRouter LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const effectiveBaseUrl = credentials.baseUrl || defaultOpenRouterBaseUrl;

    const provider = createOpenAICompatible({
      name: "openrouter",
      apiKey: credentials.apiKey,
      baseURL: effectiveBaseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the OpenRouterProviderAdapter.
 */
export const openRouterProviderAdapter = new OpenRouterProviderAdapter();
