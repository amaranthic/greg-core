/**
 * @fileoverview Complete hook definitions and composite AgentHooks interface.
 * @packageDocumentation
 */

import type { OnErrorHook } from './threadHooks.js';
import type { OnAuthorizeToolHook } from './toolHooks.js';
import type {
  OnPostTurnHook,
  OnPreTurnHook,
  OnShouldStopHook,
} from './turnHooks.js';

export type {
  ThreadErrorContext,
  OnErrorHook,
} from './threadHooks.js';

export type {
  ToolAuthorizeContext,
  PermissionDecision,
  OnAuthorizeToolHook,
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

/**
 * Composite hooks collection provided by products to customize agent core behavior.
 *
 * @example
 * ```typescript
 * const hooks: AgentHooks = {
 *   onAuthorizeTool: async ({ toolName, parameters }) => {
 *     return { decision: 'allow' };
 *   },
 *   onPreTurn: async ({ turnIndex, userPrompt }) => {
 *     return { userPrompt: `[Context: Prod]\n${userPrompt}` };
 *   },
 *   onShouldStop: async () => {
 *     return { shouldStop: true };
 *   },
 * };
 * ```
 */
export interface AgentHooks {
  /** Invoked to authorize proposed tool execution. Fails closed by default if omitted. */
  readonly onAuthorizeTool?: OnAuthorizeToolHook | undefined;
  /** Invoked before a turn begins. Can augment prompt, inject instructions, or veto. */
  readonly onPreTurn?: OnPreTurnHook | undefined;
  /** Invoked after a turn finishes with final usage and finish reason. */
  readonly onPostTurn?: OnPostTurnHook | undefined;
  /** Invoked to evaluate whether the autonomous agent loop is permitted to terminate. */
  readonly onShouldStop?: OnShouldStopHook | undefined;
  /** Invoked when an unhandled error occurs during turn execution. */
  readonly onError?: OnErrorHook | undefined;
}
