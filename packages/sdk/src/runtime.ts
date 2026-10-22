import {
  generateText as aiGenerateText,
  streamText as aiStreamText,
  generateObject as aiGenerateObject,
  streamObject as aiStreamObject,
} from "ai";
import { resolveModel } from "./modelResolver.js";
import type { GregModelInput } from "./types.js";

/**
 * Parameters for Greg's generateText runtime call, requiring model, apiKey, and baseUrl
 * while forwarding all native AI SDK options.
 */
export type GregGenerateTextOptions = Omit<
  Parameters<typeof aiGenerateText>[0],
  "model"
> & {
  /**
   * The model specification, formatted as "provider/model_id" (e.g. "openai/gpt-4o")
   * or a pre-instantiated LanguageModel.
   */
  readonly model: GregModelInput;

  /**
   * The mandatory API key for the target model or provider.
   */
  readonly apiKey: string;

  /**
   * The mandatory base URL for the target model or provider endpoint.
   */
  readonly baseUrl: string;
};

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
  options: GregGenerateTextOptions,
): ReturnType<typeof aiGenerateText> {
  const { model, apiKey, baseUrl, ...rest } = options;

  const resolvedModel = resolveModel(model, { apiKey, baseUrl });

  return aiGenerateText({
    ...rest,
    model: resolvedModel,
  } as Parameters<typeof aiGenerateText>[0]);
}

/**
 * Parameters for Greg's streamText runtime call, requiring model, apiKey, and baseUrl
 * while forwarding all native AI SDK options.
 */
export type GregStreamTextOptions = Omit<
  Parameters<typeof aiStreamText>[0],
  "model"
> & {
  /**
   * The model specification, formatted as "provider/model_id" (e.g. "anthropic/claude-3-7-sonnet")
   * or a pre-instantiated LanguageModel.
   */
  readonly model: GregModelInput;

  /**
   * The mandatory API key for the target model or provider.
   */
  readonly apiKey: string;

  /**
   * The mandatory base URL for the target model or provider endpoint.
   */
  readonly baseUrl: string;
};

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
  options: GregStreamTextOptions,
): ReturnType<typeof aiStreamText> {
  const { model, apiKey, baseUrl, ...rest } = options;

  const resolvedModel = resolveModel(model, { apiKey, baseUrl });

  return aiStreamText({
    ...rest,
    model: resolvedModel,
  } as Parameters<typeof aiStreamText>[0]);
}

/**
 * Parameters for Greg's generateObject runtime call.
 */
export type GregGenerateObjectOptions = Omit<
  Parameters<typeof aiGenerateObject>[0],
  "model"
> & {
  /**
   * The model specification, formatted as "provider/model_id" or a pre-instantiated LanguageModel.
   */
  readonly model: GregModelInput;

  /**
   * The mandatory API key for the target model or provider.
   */
  readonly apiKey: string;

  /**
   * The mandatory base URL for the target model or provider endpoint.
   */
  readonly baseUrl: string;
};

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
  options: GregGenerateObjectOptions,
): ReturnType<typeof aiGenerateObject> {
  const { model, apiKey, baseUrl, ...rest } = options;

  const resolvedModel = resolveModel(model, { apiKey, baseUrl });

  return aiGenerateObject({
    ...rest,
    model: resolvedModel,
  } as Parameters<typeof aiGenerateObject>[0]);
}

/**
 * Parameters for Greg's streamObject runtime call.
 */
export type GregStreamObjectOptions = Omit<
  Parameters<typeof aiStreamObject>[0],
  "model"
> & {
  /**
   * The model specification, formatted as "provider/model_id" or a pre-instantiated LanguageModel.
   */
  readonly model: GregModelInput;

  /**
   * The mandatory API key for the target model or provider.
   */
  readonly apiKey: string;

  /**
   * The mandatory base URL for the target model or provider endpoint.
   */
  readonly baseUrl: string;
};

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
  options: GregStreamObjectOptions,
): ReturnType<typeof aiStreamObject> {
  const { model, apiKey, baseUrl, ...rest } = options;

  const resolvedModel = resolveModel(model, { apiKey, baseUrl });

  return aiStreamObject({
    ...rest,
    model: resolvedModel,
  } as Parameters<typeof aiStreamObject>[0]);
}
