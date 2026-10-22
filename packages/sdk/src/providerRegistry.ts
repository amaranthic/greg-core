import type { ProviderAdapter } from "./providers/base.js";
import { UnsupportedProviderError } from "./errors.js";
import { openAIProviderAdapter } from "./providers/openai.js";
import { anthropicProviderAdapter } from "./providers/anthropic.js";
import { googleProviderAdapter } from "./providers/google.js";
import { xaiProviderAdapter } from "./providers/xai.js";
import { deepSeekProviderAdapter } from "./providers/deepseek.js";
import { groqProviderAdapter } from "./providers/groq.js";
import { mistralProviderAdapter } from "./providers/mistral.js";
import { cohereProviderAdapter } from "./providers/cohere.js";
import { togetherAIProviderAdapter } from "./providers/togetherai.js";
import { alibabaProviderAdapter } from "./providers/alibaba.js";
import { openRouterProviderAdapter } from "./providers/openrouter.js";
import { compatibleProviderAdapter } from "./providers/compatible.js";
import { vercelGatewayProviderAdapter } from "./providers/vercelGateway.js";

/**
 * Internal registry mapping provider identifiers to their concrete ProviderAdapter instances.
 */
const providerRegistry = new Map<string, ProviderAdapter>();

/**
 * Registers a provider adapter in the global runtime registry.
 *
 * @param adapter - The provider adapter to register.
 */
export function registerProviderAdapter(adapter: ProviderAdapter): void {
  providerRegistry.set(adapter.providerId, adapter);
}

// Pre-register all built-in provider adapters
registerProviderAdapter(openAIProviderAdapter);
registerProviderAdapter(anthropicProviderAdapter);
registerProviderAdapter(googleProviderAdapter);
registerProviderAdapter(xaiProviderAdapter);
registerProviderAdapter(deepSeekProviderAdapter);
registerProviderAdapter(groqProviderAdapter);
registerProviderAdapter(mistralProviderAdapter);
registerProviderAdapter(cohereProviderAdapter);
registerProviderAdapter(togetherAIProviderAdapter);
registerProviderAdapter(alibabaProviderAdapter);
registerProviderAdapter(openRouterProviderAdapter);
registerProviderAdapter(compatibleProviderAdapter);
registerProviderAdapter(vercelGatewayProviderAdapter);

/**
 * Returns an array of all currently registered provider identifiers.
 *
 * @returns An array of provider identifier strings.
 */
export function getSupportedProviders(): readonly string[] {
  return Array.from(providerRegistry.keys());
}

/**
 * Checks whether a given provider identifier is currently registered in the runtime.
 *
 * @param providerId - The provider name to test.
 * @returns True if supported, false otherwise.
 */
export function hasProvider(providerId: string): boolean {
  return providerRegistry.has(providerId);
}

/**
 * Retrieves the provider adapter registered for the specified provider identifier.
 *
 * @param providerId - The provider identifier (e.g. "openai", "anthropic", "compatible").
 * @returns The matching ProviderAdapter instance.
 * @throws {UnsupportedProviderError} If the provider is not registered in the runtime.
 */
export function getProviderAdapter(providerId: string): ProviderAdapter {
  const adapter = providerRegistry.get(providerId);

  if (!adapter) {
    throw new UnsupportedProviderError({
      provider: providerId,
      supportedProviders: getSupportedProviders(),
    });
  }

  return adapter;
}
