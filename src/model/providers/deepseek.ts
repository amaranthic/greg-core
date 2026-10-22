import { createDeepSeek } from "@ai-sdk/deepseek";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for the official DeepSeek provider (`@ai-sdk/deepseek`).
 *
 * Configures DeepSeek with mandatory credentials and instantiates
 * DeepSeek LanguageModel instances via `createDeepSeek`.
 */
export class DeepSeekProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "deepseek";

  /**
   * Instantiates a DeepSeek LanguageModel.
   *
   * @param modelId - The DeepSeek model identifier (e.g. "deepseek-chat", "deepseek-reasoner").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated DeepSeek LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createDeepSeek({
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the DeepSeekProviderAdapter.
 */
export const deepSeekProviderAdapter = new DeepSeekProviderAdapter();
