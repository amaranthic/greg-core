import { createXai } from "@ai-sdk/xai";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for the official xAI provider (`@ai-sdk/xai`).
 *
 * Configures xAI with mandatory credentials and instantiates Grok models
 * defaulting to the xAI Responses API.
 */
export class XAIProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "xai";

  /**
   * Instantiates an xAI Grok LanguageModel.
   *
   * @param modelId - The xAI model identifier (e.g. "grok-2-1212", "grok-beta").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated xAI LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createXai({
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the XAIProviderAdapter.
 */
export const xaiProviderAdapter = new XAIProviderAdapter();
