import { createAnthropic } from "@ai-sdk/anthropic";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for the official Anthropic provider (`@ai-sdk/anthropic`).
 *
 * Configures the Anthropic provider with mandatory credentials and instantiates
 * Anthropic messages LanguageModel instances.
 */
export class AnthropicProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "anthropic";

  /**
   * Instantiates an Anthropic LanguageModel.
   *
   * @param modelId - The Anthropic model identifier (e.g. "claude-3-7-sonnet-20250219").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated Anthropic LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createAnthropic({
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the AnthropicProviderAdapter.
 */
export const anthropicProviderAdapter = new AnthropicProviderAdapter();
