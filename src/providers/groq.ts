import { createGroq } from "@ai-sdk/groq";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for the official Groq provider (`@ai-sdk/groq`).
 *
 * Configures Groq with mandatory credentials and instantiates
 * ultra-low latency LPU-accelerated LanguageModel instances via `createGroq`.
 */
export class GroqProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "groq";

  /**
   * Instantiates a Groq LanguageModel.
   *
   * @param modelId - The Groq model identifier (e.g. "llama-3.3-70b-versatile").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated Groq LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createGroq({
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the GroqProviderAdapter.
 */
export const groqProviderAdapter = new GroqProviderAdapter();
