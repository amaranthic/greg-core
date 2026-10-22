/**
 * @fileoverview Curated Hernex runtime wrappers around Vercel AI SDK functions.
 * @packageDocumentation
 */

import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  generateObject as aiGenerateObject,
  streamObject as aiStreamObject,
  embed as aiEmbed,
  embedMany as aiEmbedMany,
} from "ai";
import { resolveModel } from "./model/resolveModel.js";
import type { ProviderRegistry } from "./model/ProviderRegistry.js";
import type { HernexModelInput } from "./model/types.js";

/**
 * Parameters for Hernex generateText runtime call, requiring model, apiKey, and baseUrl
 * while forwarding all native AI SDK options.
 */
export type HernexGenerateTextOptions = Omit<
  Parameters<typeof aiGenerateText>[0],
  "model"
> & {
  /**
   * The model specification, formatted as "provider/model_id" (e.g. "openai/gpt-4o")
   * or a pre-instantiated LanguageModel.
   */
  readonly model: HernexModelInput;

  /**
   * The mandatory API key for the target model or provider.
   */
  readonly apiKey: string;

  /**
   * The mandatory base URL for the target model or provider endpoint.
   */
  readonly baseUrl: string;

  /**
   * Optional custom provider registry for isolated resolution.
   */
  readonly registry?: ProviderRegistry;
};

/**
 * Backwards-compatible alias for HernexGenerateTextOptions.
 */
export type GregGenerateTextOptions = HernexGenerateTextOptions;

/**
 * Generates text using the specified model and credentials.
 *
 * Dynamically resolves the provider and model according to the first-slash rule,
 * applies credentials, and forwards all options to Vercel AI SDK's native `generateText`.
 *
 * @param options - Generation options with required model, apiKey, and baseUrl.
 * @returns The native AI SDK GenerateTextResult promise.
 */
export async function generateText(
  options: HernexGenerateTextOptions,
): ReturnType<typeof aiGenerateText> {
  const { model, apiKey, baseUrl, registry, ...rest } = options;

  const resolvedModel = resolveModel(model, { apiKey, baseUrl }, registry);

  return aiGenerateText({
    ...rest,
    model: resolvedModel,
  } as Parameters<typeof aiGenerateText>[0]);
}

/**
 * Parameters for Hernex streamText runtime call, requiring model, apiKey, and baseUrl
 * while forwarding all native AI SDK options.
 */
export type HernexStreamTextOptions = Omit<
  Parameters<typeof aiStreamText>[0],
  "model"
> & {
  /**
   * The model specification, formatted as "provider/model_id" (e.g. "openai/gpt-4o")
   * or a pre-instantiated LanguageModel.
   */
  readonly model: HernexModelInput;

  /**
   * The mandatory API key for the target model or provider.
   */
  readonly apiKey: string;

  /**
   * The mandatory base URL for the target model or provider endpoint.
   */
  readonly baseUrl: string;

  /**
   * Optional custom provider registry for isolated resolution.
   */
  readonly registry?: ProviderRegistry;
};

/**
 * Backwards-compatible alias for HernexStreamTextOptions.
 */
export type GregStreamTextOptions = HernexStreamTextOptions;

/**
 * Streams text from the specified model and credentials.
 *
 * Dynamically resolves the provider and model, applies credentials,
 * and delegates to Vercel AI SDK's native `streamText`.
 *
 * @param options - Streaming generation options with required model, apiKey, and baseUrl.
 * @returns The native AI SDK StreamTextResult instance.
 */
export function streamText(
  options: HernexStreamTextOptions,
): ReturnType<typeof aiStreamText> {
  const { model, apiKey, baseUrl, registry, ...rest } = options;

  const resolvedModel = resolveModel(model, { apiKey, baseUrl }, registry);

  return aiStreamText({
    ...rest,
    model: resolvedModel,
  } as Parameters<typeof aiStreamText>[0]);
}

/**
 * Parameters for Hernex generateObject runtime call.
 */
export type HernexGenerateObjectOptions<TSchema = any> = Omit<
  Parameters<typeof aiGenerateObject>[0],
  "model"
> & {
  /**
   * The model specification, formatted as "provider/model_id" or a pre-instantiated LanguageModel.
   */
  readonly model: HernexModelInput;

  /**
   * The mandatory API key for the target model or provider.
   */
  readonly apiKey: string;

  /**
   * The mandatory base URL for the target model or provider endpoint.
   */
  readonly baseUrl: string;

  /**
   * Optional custom provider registry for isolated resolution.
   */
  readonly registry?: ProviderRegistry;

  /**
   * Optional schema for structured output generation.
   */
  readonly schema?: TSchema;

  /**
   * Optional output type mode.
   */
  readonly output?: any;
};

/**
 * Backwards-compatible alias for HernexGenerateObjectOptions.
 */
export type GregGenerateObjectOptions = HernexGenerateObjectOptions;

/**
 * Generates a structured object matching a schema using the specified model and credentials.
 *
 * Dynamically resolves the provider and model, applies credentials,
 * and delegates to Vercel AI SDK's native `generateObject`.
 *
 * @param options - Structured object options with required model, apiKey, and baseUrl.
 * @returns The native AI SDK GenerateObjectResult promise.
 */
export async function generateObject(
  options: HernexGenerateObjectOptions,
): ReturnType<typeof aiGenerateObject> {
  const { model, apiKey, baseUrl, registry, ...rest } = options;

  const resolvedModel = resolveModel(model, { apiKey, baseUrl }, registry);

  return aiGenerateObject({
    ...rest,
    model: resolvedModel,
  } as Parameters<typeof aiGenerateObject>[0]);
}

/**
 * Parameters for Hernex streamObject runtime call.
 */
export type HernexStreamObjectOptions = Omit<
  Parameters<typeof aiStreamObject>[0],
  "model"
> & {
  /**
   * The model specification, formatted as "provider/model_id" or a pre-instantiated LanguageModel.
   */
  readonly model: HernexModelInput;

  /**
   * The mandatory API key for the target model or provider.
   */
  readonly apiKey: string;

  /**
   * The mandatory base URL for the target model or provider endpoint.
   */
  readonly baseUrl: string;

  /**
   * Optional custom provider registry for isolated resolution.
   */
  readonly registry?: ProviderRegistry;
};

/**
 * Backwards-compatible alias for HernexStreamObjectOptions.
 */
export type GregStreamObjectOptions = HernexStreamObjectOptions;

/**
 * Streams a structured object matching a schema using the specified model and credentials.
 *
 * Dynamically resolves the provider and model, applies credentials,
 * and delegates to Vercel AI SDK's native `streamObject`.
 *
 * @param options - Streaming object options with required model, apiKey, and baseUrl.
 * @returns The native AI SDK StreamObjectResult instance.
 */
export function streamObject(
  options: HernexStreamObjectOptions,
): ReturnType<typeof aiStreamObject> {
  const { model, apiKey, baseUrl, registry, ...rest } = options;

  const resolvedModel = resolveModel(model, { apiKey, baseUrl }, registry);

  return aiStreamObject({
    ...rest,
    model: resolvedModel,
  } as Parameters<typeof aiStreamObject>[0]);
}

/**
 * Parameters for Hernex embed runtime call.
 */
export type HernexEmbedOptions = Omit<
  Parameters<typeof aiEmbed>[0],
  "model"
> & {
  readonly model: any;
  readonly apiKey?: string;
  readonly baseUrl?: string;
};

/**
 * Computes an embedding vector for a single value.
 *
 * @param options - Embedding options.
 * @returns The native AI SDK EmbedResult promise.
 */
export async function embed(
  options: HernexEmbedOptions,
): ReturnType<typeof aiEmbed> {
  return aiEmbed(options as Parameters<typeof aiEmbed>[0]);
}

/**
 * Parameters for Hernex embedMany runtime call.
 */
export type HernexEmbedManyOptions = Omit<
  Parameters<typeof aiEmbedMany>[0],
  "model"
> & {
  readonly model: any;
  readonly apiKey?: string;
  readonly baseUrl?: string;
};

/**
 * Computes embedding vectors for multiple values.
 *
 * @param options - Embedding options.
 * @returns The native AI SDK EmbedManyResult promise.
 */
export async function embedMany(
  options: HernexEmbedManyOptions,
): ReturnType<typeof aiEmbedMany> {
  return aiEmbedMany(options as Parameters<typeof aiEmbedMany>[0]);
}
