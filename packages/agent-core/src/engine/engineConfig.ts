/**
 * @fileoverview Configuration contracts for instantiating and running the AgentEngine.
 * @packageDocumentation
 */

import type { LanguageModel } from '@amaranthic/greg-sdk';
import type { AgentHooks } from '../hooks/index.js';
import type { AgentReasoningLevel, ThreadCheckpointConfig } from '../thread/index.js';
import type { ToolRegistry } from '../tools/index.js';

/**
 * Static configuration options for instantiating an AgentEngine.
 *
 * @example
 * ```typescript
 * const engineConfig: AgentEngineConfig = {
 *   threadId: 'th_123456',
 *   workingDirectory: '/home/user/workspace',
 *   model: 'anthropic/claude-3-7-sonnet',
 *   apiKey: 'my-api-key',
 *   baseUrl: 'https://api.anthropic.com/v1',
 *   instructions: 'You are an autonomous engineering assistant.',
 *   tools: new ToolRegistry(),
 *   reasoning: 'high',
 *   maxSteps: 30,
 * };
 * ```
 */
export interface AgentEngineConfig {
  /**
   * Unique identifier of the conversational thread session.
   */
  readonly threadId: string;

  /**
   * Root working directory for tool operations and relative path resolution.
   */
  readonly workingDirectory: string;

  /**
   * Model specification formatted as "provider/model_id" or a pre-instantiated LanguageModel.
   */
  readonly model: string | LanguageModel;

  /**
   * Mandatory API key used for resolving provider credentials.
   */
  readonly apiKey: string;

  /**
   * Mandatory base URL for the model provider endpoint.
   */
  readonly baseUrl: string;

  /**
   * Optional system instructions passed to the model across all turns.
   */
  readonly instructions?: string;

  /**
   * Tool registry supplying available agent tools and schema definitions.
   */
  readonly tools: ToolRegistry;

  /**
   * Optional consumer lifecycle and authorization hooks.
   */
  readonly hooks?: AgentHooks;

  /**
   * Optional top-level reasoning/thinking effort level for the model.
   * Controls how much reasoning the model performs before generating a response.
   */
  readonly reasoning?: AgentReasoningLevel;

  /**
   * Maximum autonomous tool-execution steps allowed within a single turn before stopping.
   * Defaults to 25.
   */
  readonly maxSteps?: number;

  /**
   * Workspace checkpoint and delta-tracking configuration.
   */
  readonly checkpoint?: ThreadCheckpointConfig;

  /**
   * Optional global abort signal for cancelling in-flight engine operations.
   */
  readonly abortSignal?: AbortSignal;
}

/**
 * Options provided when executing a single autonomous turn via runTurn.
 */
export interface RunTurnOptions {
  /**
   * The user message or prompt initiating the turn.
   */
  readonly userPrompt: string;

  /**
   * One-based sequence index for the active turn within the thread session.
   * Defaults to 1 if not specified.
   */
  readonly turnIndex?: number;

  /**
   * Optional per-turn instructions appended to or overriding base instructions.
   */
  readonly instructions?: string;

  /**
   * Optional per-turn reasoning effort level overriding the engine-level setting.
   */
  readonly reasoning?: AgentReasoningLevel;

  /**
   * Maximum autonomous steps for this specific turn.
   */
  readonly maxSteps?: number;

  /**
   * Optional abort signal for cancelling this specific turn.
   */
  readonly abortSignal?: AbortSignal;

  /**
   * Optional product-defined metadata passed through to turn hooks.
   */
  readonly metadataOverride?: Record<string, unknown>;
}
