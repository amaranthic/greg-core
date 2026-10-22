/**
 * @fileoverview Configuration contracts for instantiating and configuring AgentThread sessions.
 * @packageDocumentation
 */

import type { ModelMessage } from '@amaranthic/greg-sdk';
import type { AgentHooks } from '../hooks/index.js';

/**
 * Checkpoint and file snapshot configuration for a thread session.
 */
export interface ThreadCheckpointConfig {
  /** Whether checkpoint tracking and file rollbacks are enabled. */
  readonly enabled: boolean;
  /** Snapshot trigger policy. */
  readonly autoSnapshot?: 'beforeMutatingTools' | 'everyStep' | 'manual';
  /** Path on disk to store content-addressed file snapshots. */
  readonly storageDirectory?: string;
  /** Maximum number of snapshots to retain before rolling over oldest records. */
  readonly maxSnapshots?: number;
}

/**
 * Configuration options required to create or resume an AgentThread.
 *
 * @example
 * ```typescript
 * const config: AgentThreadConfig = {
 *   workingDirectory: process.cwd(),
 *   model: 'anthropic/claude-3-7-sonnet',
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   baseUrl: 'https://api.anthropic.com/v1',
 *   systemPrompt: 'You are an autonomous coding assistant.',
 *   checkpoint: { enabled: true, autoSnapshot: 'beforeMutatingTools' },
 * };
 * ```
 */
export interface AgentThreadConfig {
  /** Optional custom thread ID; auto-generated if omitted. */
  readonly threadId?: string;
  /** Absolute working directory path on the host. */
  readonly workingDirectory: string;
  /** Target model identifier using the first-slash convention (e.g. 'anthropic/claude-3-7-sonnet'). */
  readonly model: string;
  /** Explicit API key for thread execution (no singleton process.env dependencies). */
  readonly apiKey: string;
  /** Base URL for the model provider. */
  readonly baseUrl: string;
  /** System instruction prompt. */
  readonly systemPrompt: string;
  /** Optional previous messages for resuming an existing session. */
  readonly initialMessages?: readonly ModelMessage[];
  /** Checkpoint snapshot configuration. */
  readonly checkpoint?: ThreadCheckpointConfig;
  /** Product-managed lifecycle and policy hooks. */
  readonly hooks?: AgentHooks;
  /** Maximum autonomous steps allowed per turn before pausing (defaults to 25). */
  readonly maxTurns?: number;
}
