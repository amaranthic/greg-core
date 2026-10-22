/**
 * @fileoverview Turn lifecycle, stopping decision, and intervention hook interface definitions.
 * @packageDocumentation
 */

import type { StepTokenUsage, TurnFinishReason } from '../events/stepEvents.js';

/**
 * Context provided before an autonomous turn starts.
 */
export interface PreTurnContext {
  /** One-based index of the upcoming turn. */
  readonly turnIndex: number;
  /** The user prompt submitted for this turn. */
  readonly userPrompt: string;
}

/**
 * Optional modifications returned by a pre-turn hook.
 */
export interface PreTurnResult {
  /** Modified user prompt string. */
  readonly userPrompt?: string;
  /** Additional system instructions to append for this turn. */
  readonly injectedInstructions?: string;
}

/**
 * Hook invoked before a turn commences.
 * Allows products to inject instructions, append reminders, or modify user prompts.
 */
export type OnPreTurnHook = (
  context: PreTurnContext,
) => Promise<PreTurnResult | void> | PreTurnResult | void;

/**
 * Context provided after a turn finishes.
 */
export interface PostTurnContext {
  /** One-based index of the concluded turn. */
  readonly turnIndex: number;
  /** Reason why the turn finished. */
  readonly finishReason: TurnFinishReason;
  /** Cumulative token usage for the turn. */
  readonly totalUsage: StepTokenUsage;
}

/**
 * Hook invoked after a turn completes.
 * Allows products to run cleanups, post-turn metrics, or trigger context compaction.
 */
export type OnPostTurnHook = (context: PostTurnContext) => Promise<void> | void;

/**
 * Context provided when evaluating whether the agent loop should terminate.
 */
export interface ShouldStopContext {
  /** Active turn index. */
  readonly turnIndex: number;
  /** Candidate finish reason. */
  readonly finishReason: TurnFinishReason;
  /** Session transcript or execution history reference. */
  readonly transcript?: unknown;
}

/**
 * Decision whether the engine should stop or continue iterating.
 */
export type StopDecision =
  | { readonly shouldStop: true }
  | { readonly shouldStop: false; readonly reminderPrompt: string };

/**
 * Hook invoked when the agent proposes to stop.
 * Enables products to enforce multi-turn goals (e.g. `/goal`), verify criteria, or inject reminders.
 */
export type OnShouldStopHook = (
  context: ShouldStopContext,
) => Promise<StopDecision> | StopDecision;
