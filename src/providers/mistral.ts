import { createMistral } from "@ai-sdk/mistral";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for the official Mistral AI provider (`@ai-sdk/mistral`).
 *
 * Configures Mistral AI with mandatory credentials and instantiates
 * Mistral LanguageModel instances via `createMistral`.
 */
export class MistralProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "mistral";

  /**
   * Instantiates a Mistral LanguageModel.
   *
   * @param modelId - The Mistral model identifier (e.g. "mistral-large-latest", "pixtral-large-latest").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated Mistral LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createMistral({
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the MistralProviderAdapter.
 */
export const mistralProviderAdapter = new MistralProviderAdapter();
