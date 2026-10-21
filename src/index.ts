/**
 * Re-export the entire native Vercel AI SDK v7 surface.
 *
 * Ensures 100% feature preservation: all classes, tools, helpers, agents,
 * stream utilities, errors, and types from the pinned `ai` package remain directly accessible.
 */
export * from "ai";

/**
 * Greg Runtime Execution Functions
 */
export {
  generateText,
  streamText,
  generateObject,
  streamObject,
  type GregGenerateTextOptions,
  type GregStreamTextOptions,
  type GregGenerateObjectOptions,
  type GregStreamObjectOptions,
} from "./runtime.js";

/**
 * Model Resolution
 */
export {
  resolveModel,
  parseModelString,
  validateCredentials,
} from "./modelResolver.js";

/**
 * Provider Registry
 */
export {
  getProviderAdapter,
  getSupportedProviders,
  hasProvider,
  registerProviderAdapter,
} from "./providerRegistry.js";

/**
 * Provider Base Adapter
 */
export type { ProviderAdapter } from "./providers/base.js";

/**
 * Canonical Runtime Errors
 */
export {
  InvalidModelStringError,
  MissingCredentialsError,
  UnsupportedProviderError,
} from "./errors.js";

/**
 * TypeScript Types
 */
export type {
  GregCredentials,
  GregModelInput,
  ParsedModelString,
  GregRequest,
  GregGenerateTextParameters,
  GregStreamTextParameters,
  GregGenerateObjectParameters,
  GregStreamObjectParameters,
  GregEmbedParameters,
  GregEmbedManyParameters,
} from "./types.js";
