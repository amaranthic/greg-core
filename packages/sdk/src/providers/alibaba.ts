import { createAlibaba } from "@ai-sdk/alibaba";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for the official Alibaba Cloud (Qwen / DashScope) provider (`@ai-sdk/alibaba`).
 *
 * Configures Alibaba Cloud with mandatory credentials and instantiates
 * Qwen LanguageModel instances via `createAlibaba`.
 */
export class AlibabaProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "alibaba";

  /**
   * Instantiates an Alibaba Qwen LanguageModel.
   *
   * @param modelId - The Alibaba model identifier (e.g. "qwen-max", "qwen-plus", "qwen-turbo").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated Alibaba LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createAlibaba({
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the AlibabaProviderAdapter.
 */
export const alibabaProviderAdapter = new AlibabaProviderAdapter();
