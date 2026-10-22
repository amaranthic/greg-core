/**
 * @fileoverview ProviderRegistry managing built-in and custom provider adapters.
 * @packageDocumentation
 */

import type { ProviderAdapter } from "./providers/base.js";
import { UnsupportedProviderError } from "../errors.js";
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
 * Built-in provider adapters bundled with Hernex.
 */
export const builtInAdapters: readonly ProviderAdapter[] = [
  openAIProviderAdapter,
  anthropicProviderAdapter,
  googleProviderAdapter,
  xaiProviderAdapter,
  deepSeekProviderAdapter,
  groqProviderAdapter,
  mistralProviderAdapter,
  cohereProviderAdapter,
  togetherAIProviderAdapter,
  alibabaProviderAdapter,
  openRouterProviderAdapter,
  compatibleProviderAdapter,
  vercelGatewayProviderAdapter,
];

/**
 * Isolated provider registry mapping provider identifiers to their concrete ProviderAdapter instances.
 */
export class ProviderRegistry {
  private readonly adapters = new Map<string, ProviderAdapter>();

  /**
   * Constructs a new ProviderRegistry instance.
   *
   * @param initialAdapters - Optional initial adapters to register. If omitted, registers built-in adapters.
   */
  public constructor(initialAdapters?: readonly ProviderAdapter[]) {
    const adaptersToRegister = initialAdapters ?? builtInAdapters;
    for (const adapter of adaptersToRegister) {
      this.register(adapter);
    }
  }

  /**
   * Registers a provider adapter in this registry instance.
   *
   * @param adapter - The provider adapter to register.
   */
  public register(adapter: ProviderAdapter): void {
    this.adapters.set(adapter.providerId, adapter);
  }

  /**
   * Checks whether a provider is registered in this registry.
   *
   * @param providerId - The provider name to test.
   * @returns True if registered, false otherwise.
   */
  public has(providerId: string): boolean {
    return this.adapters.has(providerId);
  }

  /**
   * Returns an array of all currently registered provider identifiers.
   *
   * @returns Array of provider identifier strings.
   */
  public getSupportedProviders(): readonly string[] {
    return Array.from(this.adapters.keys());
  }

  /**
   * Resolves the provider adapter for a provider identifier.
   *
   * @param providerId - Provider identifier to resolve.
   * @returns The resolved ProviderAdapter.
   * @throws {UnsupportedProviderError} If the provider is not registered.
   */
  public resolve(providerId: string): ProviderAdapter {
    const adapter = this.adapters.get(providerId);
    if (!adapter) {
      throw new UnsupportedProviderError({
        provider: providerId,
        supportedProviders: this.getSupportedProviders(),
      });
    }
    return adapter;
  }
}

/**
 * Global default registry instance.
 */
const defaultRegistry = new ProviderRegistry();

/**
 * Registers a provider adapter in the global runtime registry.
 *
 * @param adapter - The provider adapter to register.
 */
export function registerProviderAdapter(adapter: ProviderAdapter): void {
  defaultRegistry.register(adapter);
}

/**
 * Returns an array of all currently registered provider identifiers in the global registry.
 *
 * @returns An array of provider identifier strings.
 */
export function getSupportedProviders(): readonly string[] {
  return defaultRegistry.getSupportedProviders();
}

/**
 * Checks whether a given provider identifier is currently registered in the global registry.
 *
 * @param providerId - The provider name to test.
 * @returns True if supported, false otherwise.
 */
export function hasProvider(providerId: string): boolean {
  return defaultRegistry.has(providerId);
}

/**
 * Retrieves the provider adapter registered for the specified provider identifier.
 *
 * @param providerId - The provider identifier.
 * @returns The matching ProviderAdapter instance.
 * @throws {UnsupportedProviderError} If the provider is not registered in the runtime.
 */
export function getProviderAdapter(providerId: string): ProviderAdapter {
  return defaultRegistry.resolve(providerId);
}

/**
 * Creates an isolated ProviderRegistry instance.
 *
 * @param initialAdapters - Optional initial provider adapters.
 * @returns A fresh ProviderRegistry instance.
 */
export function createProviderRegistry(
  initialAdapters?: readonly ProviderAdapter[],
): ProviderRegistry {
  return new ProviderRegistry(initialAdapters);
}
