import { createGoogle } from "@ai-sdk/google";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for the official Google provider (`@ai-sdk/google`).
 *
 * Configures Google generative AI with mandatory credentials and instantiates
 * Gemini LanguageModel instances via `createGoogle`.
 */
export class GoogleProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "google";

  /**
   * Instantiates a Google Gemini LanguageModel.
   *
   * @param modelId - The Google model identifier (e.g. "gemini-2.5-flash", "gemini-2.5-pro").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated Google LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createGoogle({
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the GoogleProviderAdapter.
 */
export const googleProviderAdapter = new GoogleProviderAdapter();
