import type { LanguageModel } from "ai";
import type { GregCredentials } from "../types.js";

/**
 * Interface that all provider adapters must implement.
 */
export interface ProviderAdapter {
  /**
   * Unique identifier of the provider.
   *
   * @example "openai", "anthropic", "google", "compatible"
   */
  readonly providerId: string;

  /**
   * Creates a concrete LanguageModel for the requested model identifier using supplied credentials.
   *
   * @param modelId - The provider's model identifier.
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel;
}
