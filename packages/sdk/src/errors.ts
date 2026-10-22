import { AISDKError } from "ai";

const invalidModelStringErrorName = "Greg_InvalidModelStringError";
const invalidModelStringMarker = `greg.error.${invalidModelStringErrorName}`;
const invalidModelStringSymbol = Symbol.for(invalidModelStringMarker);

/**
 * Error thrown when a model string does not conform to the expected format.
 *
 * Expected format is `provider/modelId` where `provider` is non-empty and
 * `modelId` is non-empty (e.g. `openai/gpt-4o` or `openrouter/openrouter/free`).
 */
export class InvalidModelStringError extends AISDKError {
  /**
   * Internal brand symbol confirming instance identity across package boundaries.
   */
  readonly [invalidModelStringSymbol] = true;

  /**
   * The raw model string that failed validation.
   */
  readonly modelString: string;

  /**
   * Creates an instance of InvalidModelStringError.
   *
   * @param params - Configuration parameters for the error.
   * @param params.modelString - The raw invalid model string provided by the caller.
   * @param params.reason - Detailed explanation of why the model string is invalid.
   */
  constructor({
    modelString,
    reason,
  }: {
    modelString: string;
    reason: string;
  }) {
    super({
      name: invalidModelStringErrorName,
      message: `Invalid model string "${modelString}": ${reason}. Expected format is "provider/model_id" (e.g. "openai/gpt-4o" or "compatible/my-model").`,
    });

    this.modelString = modelString;
  }

  /**
   * Type guard to check whether an unknown error is an instance of InvalidModelStringError.
   *
   * @param error - The value to check.
   * @returns True if the error is an InvalidModelStringError, false otherwise.
   */
  static override isInstance(
    error: unknown,
  ): error is InvalidModelStringError {
    return AISDKError.hasMarker(error, invalidModelStringMarker);
  }
}

const missingCredentialsErrorName = "Greg_MissingCredentialsError";
const missingCredentialsMarker = `greg.error.${missingCredentialsErrorName}`;
const missingCredentialsSymbol = Symbol.for(missingCredentialsMarker);

/**
 * Error thrown when mandatory credentials (`apiKey` or `baseUrl`) are missing from a Greg request.
 */
export class MissingCredentialsError extends AISDKError {
  /**
   * Internal brand symbol confirming instance identity across package boundaries.
   */
  readonly [missingCredentialsSymbol] = true;

  /**
   * The name of the missing credential parameter (`apiKey` or `baseUrl`).
   */
  readonly missingField: "apiKey" | "baseUrl";

  /**
   * The provider targeted by the request.
   */
  readonly provider: string;

  /**
   * Creates an instance of MissingCredentialsError.
   *
   * @param params - Configuration parameters for the error.
   * @param params.missingField - The specific field that was omitted or empty.
   * @param params.provider - The provider identifier.
   */
  constructor({
    missingField,
    provider,
  }: {
    missingField: "apiKey" | "baseUrl";
    provider: string;
  }) {
    super({
      name: missingCredentialsErrorName,
      message: `Missing required credential "${missingField}" for provider "${provider}". Every Greg request must supply both non-empty "apiKey" and "baseUrl".`,
    });

    this.missingField = missingField;
    this.provider = provider;
  }

  /**
   * Type guard to check whether an unknown error is an instance of MissingCredentialsError.
   *
   * @param error - The value to check.
   * @returns True if the error is an MissingCredentialsError, false otherwise.
   */
  static override isInstance(
    error: unknown,
  ): error is MissingCredentialsError {
    return AISDKError.hasMarker(error, missingCredentialsMarker);
  }
}

const unsupportedProviderErrorName = "Greg_UnsupportedProviderError";
const unsupportedProviderMarker = `greg.error.${unsupportedProviderErrorName}`;
const unsupportedProviderSymbol = Symbol.for(unsupportedProviderMarker);

/**
 * Error thrown when a requested provider is not supported by the runtime.
 */
export class UnsupportedProviderError extends AISDKError {
  /**
   * Internal brand symbol confirming instance identity across package boundaries.
   */
  readonly [unsupportedProviderSymbol] = true;

  /**
   * The unsupported provider identifier.
   */
  readonly provider: string;

  /**
   * List of provider identifiers currently supported by the runtime.
   */
  readonly supportedProviders: readonly string[];

  /**
   * Creates an instance of UnsupportedProviderError.
   *
   * @param params - Configuration parameters for the error.
   * @param params.provider - The unsupported provider name.
   * @param params.supportedProviders - Array of supported provider names.
   */
  constructor({
    provider,
    supportedProviders,
  }: {
    provider: string;
    supportedProviders: readonly string[];
  }) {
    super({
      name: unsupportedProviderErrorName,
      message: `Unsupported provider "${provider}". Supported providers are: ${supportedProviders.join(", ")}. For generic OpenAI endpoints, use the "compatible/model_name" prefix.`,
    });

    this.provider = provider;
    this.supportedProviders = supportedProviders;
  }

  /**
   * Type guard to check whether an unknown error is an instance of UnsupportedProviderError.
   *
   * @param error - The value to check.
   * @returns True if the error is an UnsupportedProviderError, false otherwise.
   */
  static override isInstance(
    error: unknown,
  ): error is UnsupportedProviderError {
    return AISDKError.hasMarker(error, unsupportedProviderMarker);
  }
}
