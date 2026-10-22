import { createCohere } from "@ai-sdk/cohere";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for the official Cohere provider (`@ai-sdk/cohere`).
 *
 * Configures Cohere with mandatory credentials and instantiates
 * Cohere Command models via `createCohere`.
 */
export class CohereProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "cohere";

  /**
   * Instantiates a Cohere LanguageModel.
   *
   * @param modelId - The Cohere model identifier (e.g. "command-r-plus", "command-r").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated Cohere LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createCohere({
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the CohereProviderAdapter.
 */
export const cohereProviderAdapter = new CohereProviderAdapter();
