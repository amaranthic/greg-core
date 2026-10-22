/**
 * @fileoverview Resilience, retry, and runtime error event definitions.
 * @packageDocumentation
 */

/**
 * Origin subsystem where an error originated.
 */
export type ErrorOrigin = 'model' | 'tool' | 'checkpoint' | 'permission' | 'engine';

/**
 * Event emitted when an API or network failure triggers a retry backoff delay.
 */
export interface RetryScheduledEvent {
  /** Discriminant event type. */
  readonly type: 'retryScheduled';
  /** Zero-based attempt count. */
  readonly attempt: number;
  /** Maximum number of retries configured. */
  readonly maxRetries: number;
  /** Milliseconds delay before the next attempt. */
  readonly delayMs: number;
  /** The error that triggered the retry. */
  readonly error: Error;
}

/**
 * Event emitted when an error occurs during turn execution.
 */
export interface ErrorEvent {
  /** Discriminant event type. */
  readonly type: 'error';
  /** The error instance encountered. */
  readonly error: Error;
  /** Subsystem where the failure occurred. */
  readonly origin: ErrorOrigin;
  /** Associated tool name if the error happened during tool execution. */
  readonly toolName?: string;
  /** Whether this error halted turn execution. */
  readonly isFatal: boolean;
}
