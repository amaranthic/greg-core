import { createOpenAI } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for the official OpenAI provider (`@ai-sdk/openai`).
 *
 * Configures the OpenAI provider instance with mandatory credentials and utilizes
 * the OpenAI Responses API (`provider.responses(modelId)`) for model instantiation.
 */
export class OpenAIProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "openai";

  /**
   * Creates an OpenAI LanguageModel instance configured with the Responses API.
   *
   * @param modelId - The OpenAI model identifier (e.g. "gpt-4o", "o3-mini").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated OpenAI LanguageModel targeting the Responses API.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createOpenAI({
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider.responses(modelId);
  }
}

/**
 * Singleton instance of the OpenAIProviderAdapter.
 */
export const openAIProviderAdapter = new OpenAIProviderAdapter();
