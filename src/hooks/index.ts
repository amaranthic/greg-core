/**
 * @fileoverview Complete hook definitions and composite AgentHooks interface.
 * @packageDocumentation
 */

import type {
  OnErrorHook,
  OnThreadUpdateHook,
} from './threadHooks.js';
import type {
  OnAuthorizeToolHook,
  OnFormatToolInputHook,
  OnFormatToolOutputHook,
} from './toolHooks.js';
import type {
  OnPostTurnHook,
  OnPreTurnHook,
  OnShouldStopHook,
} from './turnHooks.js';
import type {
  OnCheckpointCreatedHook,
  OnPostRollbackHook,
} from './checkpointHooks.js';
import type { OnRetryHook } from './retryHooks.js';

export type {
  ThreadUpdateContext,
  OnThreadUpdateHook,
  ThreadErrorContext,
  OnErrorHook,
} from './threadHooks.js';

export type {
  ToolAuthorizeContext,
  PermissionDecision,
  OnAuthorizeToolHook,
  ToolInputFormatContext,
  OnFormatToolInputHook,
  ToolOutputFormatContext,
  OnFormatToolOutputHook,
} from './toolHooks.js';

export type {
  PreTurnContext,
  PreTurnResult,
  OnPreTurnHook,
  PostTurnContext,
  OnPostTurnHook,
  ShouldStopContext,
  StopDecision,
  OnShouldStopHook,
} from './turnHooks.js';

export type {
  CheckpointCreatedContext,
  OnCheckpointCreatedHook,
  PostRollbackContext,
  OnPostRollbackHook,
} from './checkpointHooks.js';

export type {
  RetryContext,
  RetryDecision,
  OnRetryHook,
} from './retryHooks.js';

/**
 * Composite hooks collection provided by products to customize agent core behavior.
 *
 * @example
 * ```typescript
 * const hooks: AgentHooks = {
 *   onAuthorizeTool: async ({ toolName, isMutating }) => {
 *     return isMutating ? { decision: 'askUser' } : { decision: 'allow' };
 *   },
 *   onThreadUpdate: async ({ threadId, messages }) => {
 *     await saveThread(threadId, messages);
 *   },
 * };
 * ```
 */
export interface AgentHooks {
  /** Invoked when thread state or messages are updated. */
  readonly onThreadUpdate?: OnThreadUpdateHook;
  /** Invoked to authorize proposed tool execution. */
  readonly onAuthorizeTool?: OnAuthorizeToolHook;
  /** Invoked to sanitize or format tool input parameters. */
  readonly onFormatToolInput?: OnFormatToolInputHook;
  /** Invoked to format or truncate tool output data. */
  readonly onFormatToolOutput?: OnFormatToolOutputHook;
  /** Invoked before a turn begins. */
  readonly onPreTurn?: OnPreTurnHook;
  /** Invoked after a turn finishes. */
  readonly onPostTurn?: OnPostTurnHook;
  /** Invoked to evaluate whether the agent loop is permitted to terminate. */
  readonly onShouldStop?: OnShouldStopHook;
  /** Invoked when a checkpoint snapshot is created. */
  readonly onCheckpointCreated?: OnCheckpointCreatedHook;
  /** Invoked after a rollback has been applied to disk. */
  readonly onPostRollback?: OnPostRollbackHook;
  /** Invoked on failure to decide backoff and retry behavior. */
  readonly onRetry?: OnRetryHook;
  /** Invoked when an unhandled error occurs during execution. */
  readonly onError?: OnErrorHook;
}
