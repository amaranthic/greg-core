/**
 * @fileoverview Error hook interface definitions.
 * @packageDocumentation
 */

import type { ErrorOrigin } from '../events/errorEvents.js';

/**
 * Context provided when an unhandled error occurs during execution.
 */
export interface ThreadErrorContext {
  /** The error instance encountered. */
  readonly error: Error;
  /** Origin subsystem where the error occurred. */
  readonly origin: ErrorOrigin;
  /** Active turn index when the error occurred. */
  readonly turnIndex: number;
  /** Associated tool name if the error happened during tool execution. */
  readonly toolName?: string;
  /** Whether the error is fatal and halts the turn. */
  readonly isFatal: boolean;
}

/**
 * Hook invoked when an error occurs during turn execution.
 * Allows products to log diagnostics, notify the user, or record telemetry.
 */
export type OnErrorHook = (context: ThreadErrorContext) => Promise<void> | void;
