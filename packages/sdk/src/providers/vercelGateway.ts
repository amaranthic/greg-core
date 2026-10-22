import { createGateway } from "@ai-sdk/gateway";
import type { LanguageModel } from "ai";
import type { ProviderAdapter } from "./base.js";
import type { GregCredentials } from "../types.js";

const defaultVercelGatewayBaseUrl = "https://ai-gateway.vercel.sh/v4/ai";

/**
 * Adapter for the Vercel AI Gateway provider using `@ai-sdk/gateway`.
 *
 * Configures Vercel AI Gateway routing with credentials, defaulting to
 * "https://ai-gateway.vercel.sh/v4/ai" if baseUrl is empty. Preserves multi-slash model
 * identifiers (e.g. "openai/gpt-4o", "anthropic/claude-3-7-sonnet").
 *
 * @example
 * ```typescript
 * import { generateText } from "@amaranthic/greg-sdk";
 *
 * const result = await generateText({
 *   model: "vercelgateway/openai/gpt-4o",
 *   apiKey: process.env.AI_GATEWAY_API_KEY!,
 *   baseUrl: "https://ai-gateway.vercel.sh/v4/ai",
 *   prompt: "Hello from Vercel Gateway!",
 * });
 * ```
 */
export class VercelGatewayProviderAdapter implements ProviderAdapter {
  /**
   * The provider identifier.
   */
  readonly providerId = "vercelgateway";

  /**
   * Instantiates a Vercel AI Gateway LanguageModel.
   *
   * @param modelId - The gateway model identifier (e.g. "openai/gpt-4o", "anthropic/claude-3-7-sonnet").
   * @param credentials - Mandatory credentials containing apiKey and baseUrl.
   * @returns An instantiated Vercel AI Gateway LanguageModel.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel {
    const effectiveBaseUrl = credentials.baseUrl || defaultVercelGatewayBaseUrl;

    const provider = createGateway({
      apiKey: credentials.apiKey,
      baseURL: effectiveBaseUrl,
    });

    return provider.languageModel(modelId);
  }
}

/**
 * Singleton instance of the VercelGatewayProviderAdapter.
 */
export const vercelGatewayProviderAdapter = new VercelGatewayProviderAdapter();
