import { createTogetherAI } from "@ai-sdk/togetherai";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for the official Together AI provider (`@ai-sdk/togetherai`).
 *
 * Configures Together AI with mandatory credentials and instantiates
 * LanguageModel instances via `createTogetherAI`.
 */
export class TogetherAIProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "togetherai";

  /**
   * Instantiates a Together AI LanguageModel.
   *
   * @param modelId - The Together AI model identifier (e.g. "meta-llama/Llama-3-70b-chat-hf").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated Together AI LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createTogetherAI({
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the TogetherAIProviderAdapter.
 */
export const togetherAIProviderAdapter = new TogetherAIProviderAdapter();
