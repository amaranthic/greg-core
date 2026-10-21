import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

/**
 * Adapter for custom OpenAI-compatible endpoints using `@ai-sdk/openai-compatible`.
 *
 * Triggered by the "compatible/model_name" prefix. Enables routing any request to an arbitrary
 * OpenAI-compatible API using the provided apiKey and baseUrl credentials.
 */
export class CompatibleProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier matching the prefix "compatible".
   */
  readonly providerId = "compatible";

  /**
   * Instantiates an OpenAI-compatible LanguageModel.
   *
   * @param modelId - The model name on the target endpoint (e.g. "meta-llama/llama-3-8b").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated OpenAI-compatible LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const provider = createOpenAICompatible({
      name: "compatible",
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });

    return provider(modelId);
  }
}

/**
 * Singleton instance of the CompatibleProviderAdapter.
 */
export const compatibleProviderAdapter = new CompatibleProviderAdapter();
