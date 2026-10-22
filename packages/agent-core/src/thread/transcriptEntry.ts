/**
 * @fileoverview Append-only transcript entry schemas for transcript.jsonl.
 * @packageDocumentation
 */

import type { ModelMessage } from '@amaranthic/greg-sdk';
import type { TurnFinishReason } from '../events/stepEvents.js';
import type { ThreadTokenUsage } from './threadDocument.js';

/**
 * Base properties shared by all entries in transcript.jsonl.
 */
export interface BaseTranscriptEntry {
  /** Unique monotonic sequence number within this thread's transcript. */
  readonly sequence: number;
  /** Turn index this entry belongs to. */
  readonly turnIndex: number;
  /** ISO 8601 timestamp when this entry was appended. */
  readonly timestamp: string;
}

/**
 * Entry recorded when a new user turn commences.
 */
export interface TurnStartTranscriptEntry extends BaseTranscriptEntry {
  readonly entryType: 'turnStart';
  readonly userPrompt: string;
}

/**
 * Entry recording a verbatim model message turn.
 */
export interface ModelMessageTranscriptEntry extends BaseTranscriptEntry {
  readonly entryType: 'modelMessage';
  readonly message: ModelMessage;
}

/**
 * Entry recording a model-requested tool invocation.
 */
export interface ToolCallTranscriptEntry extends BaseTranscriptEntry {
  readonly entryType: 'toolCall';
  readonly callId: string;
  readonly toolName: string;
  readonly parameters: unknown;
}

/**
 * Entry recording the execution outcome of a tool call.
 */
export interface ToolResultTranscriptEntry extends BaseTranscriptEntry {
  readonly entryType: 'toolResult';
  readonly callId: string;
  readonly toolName: string;
  readonly result: unknown;
  readonly isError: boolean;
  readonly durationMs: number;
}

/**
 * Entry anchoring a restorable checkpoint to a point in the transcript.
 */
export interface CheckpointRefTranscriptEntry extends BaseTranscriptEntry {
  readonly entryType: 'checkpointRef';
  readonly checkpointId: string;
  readonly checkpointSequence: number;
}

/**
 * Entry recorded when an autonomous turn concludes.
 */
export interface TurnFinishTranscriptEntry extends BaseTranscriptEntry {
  readonly entryType: 'turnFinish';
  readonly finishReason: TurnFinishReason;
  readonly turnUsage: ThreadTokenUsage;
}

/**
 * Discriminated union of all entries that may be appended to transcript.jsonl.
 */
export type TranscriptEntry =
  | TurnStartTranscriptEntry
  | ModelMessageTranscriptEntry
  | ToolCallTranscriptEntry
  | ToolResultTranscriptEntry
  | CheckpointRefTranscriptEntry
  | TurnFinishTranscriptEntry;
