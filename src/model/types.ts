import type {
  LanguageModel,
  ModelMessage,
  generateText,
  streamText,
  generateObject,
  streamObject,
  embed,
  embedMany,
} from "ai";

export type { LanguageModel, ModelMessage };
export type HernexCredentials = GregCredentials;
export type HernexModelInput = GregModelInput;

/**
 * Parsed representation of a Greg model specification.
 */
export interface ParsedModelString {
  /**
   * The provider segment extracted from before the first slash.
   *
   * @example "openai", "anthropic", "compatible"
   */
  readonly provider: string;

  /**
   * The model identifier segment extracted from after the first slash.
   * Preserves all subsequent slashes intact.
   *
   * @example "gpt-4o", "openrouter/free"
   */
  readonly modelId: string;
}

/**
 * Credentials required for all Greg requests.
 *
 * Every Greg call mandates both `apiKey` and `baseUrl`.
 */
export interface GregCredentials {
  /**
   * The authentication key for the target model or provider.
   * Where an endpoint requires no authentication, a non-empty placeholder may be provided.
   */
  readonly apiKey: string;

  /**
   * The base URL endpoint for the target provider or proxy.
   */
  readonly baseUrl: string;
}

/**
 * Contract implemented by each dedicated provider adapter in Greg.
 */
export interface ProviderAdapter {
  /**
   * Unique identifier of the provider handled by this adapter.
   *
   * @example "openai", "anthropic", "google", "compatible"
   */
  readonly providerId: string;

  /**
   * Instantiates a concrete AI SDK LanguageModel using the provided model ID and credentials.
   *
   * @param modelId - The provider-specific model identifier.
   * @param credentials - Mandatory apiKey and baseUrl credentials.
   * @returns A concrete AI SDK LanguageModel instance.
   */
  createModel(modelId: string, credentials: GregCredentials): LanguageModel;
}

/**
 * Form of a Greg model reference: either a `provider/model_id` string or an existing LanguageModel instance.
 */
export type GregModelInput = `${string}/${string}` | string | LanguageModel;

/**
 * Wrapper utility type transforming native AI SDK call options into Greg request options.
 *
 * Replaces the `model` property with `GregModelInput` and mandates `apiKey` and `baseUrl`.
 */
export type GregRequest<TNativeParams> = Omit<TNativeParams, "model"> & {
  /**
   * The model to use, expressed as a "provider/model_id" string or a pre-instantiated LanguageModel.
   *
   * @example "openai/gpt-4o", "anthropic/claude-3-7-sonnet", "compatible/meta-llama/llama-3-8b"
   */
  readonly model: GregModelInput;

  /**
   * API key used to authenticate with the model endpoint.
   */
  readonly apiKey: string;

  /**
   * Base URL endpoint for the provider.
   */
  readonly baseUrl: string;
};

/**
 * Greg parameters for `generateText`, derived directly from AI SDK's `generateText` parameters.
 */
export type GregGenerateTextParameters = GregRequest<Parameters<typeof generateText>[0]>;

/**
 * Greg parameters for `streamText`, derived directly from AI SDK's `streamText` parameters.
 */
export type GregStreamTextParameters = GregRequest<Parameters<typeof streamText>[0]>;

/**
 * Greg parameters for `generateObject`, derived directly from AI SDK's `generateObject` parameters.
 */
export type GregGenerateObjectParameters = GregRequest<Parameters<typeof generateObject>[0]>;

/**
 * Greg parameters for `streamObject`, derived directly from AI SDK's `streamObject` parameters.
 */
export type GregStreamObjectParameters = GregRequest<Parameters<typeof streamObject>[0]>;

/**
 * Greg parameters for `embed`, derived directly from AI SDK's `embed` parameters.
 */
export type GregEmbedParameters = GregRequest<Parameters<typeof embed>[0]>;

/**
 * Greg parameters for `embedMany`, derived directly from AI SDK's `embedMany` parameters.
 */
export type GregEmbedManyParameters = GregRequest<Parameters<typeof embedMany>[0]>;
