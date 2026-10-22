/**
 * @fileoverview Retry decision and backoff hook interface definitions.
 * @packageDocumentation
 */

/**
 * Context provided when evaluating a failed operation for retry.
 */
export interface RetryContext {
  /** Current zero-based retry attempt number. */
  readonly attempt: number;
  /** Maximum number of retry attempts configured. */
  readonly maxRetries: number;
  /** The error that triggered the retry evaluation. */
  readonly error: Error;
}

/**
 * Outcome of a retry evaluation deciding whether to retry and delay interval.
 */
export type RetryDecision =
  | { readonly shouldRetry: true; readonly delayMs: number }
  | { readonly shouldRetry: false };

/**
 * Hook invoked when an API call or network request fails.
 * Allows products to customize backoff algorithms or determine whether to retry.
 */
export type OnRetryHook = (
  context: RetryContext,
) => Promise<RetryDecision> | RetryDecision;
