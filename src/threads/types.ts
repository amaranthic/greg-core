/**
 * @fileoverview Thread session and transcript type definitions.
 * @packageDocumentation
 */

import type { ModelMessage } from "../model/types.js";

/**
 * Thread session lifecycle status.
 */
export type ThreadStatus = "idle" | "running" | "error";

/**
 * Supported reasoning effort levels in the native Vercel AI SDK v7.
 */
export type AgentReasoningLevel =
  | "provider-default"
  | "none"
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

/**
 * Checkpoint configuration for a thread session.
 */
export interface ThreadCheckpointConfig {
  readonly enabled: boolean;
  readonly autoSnapshot?: "beforeMutatingTools" | "everyStep" | "manual";
  readonly storageDirectory?: string;
  readonly maxSnapshots?: number;
}

/**
 * Metadata capturing the local Git repository state when the thread is active.
 */
export interface ThreadGitMeta {
  readonly branch?: string;
  readonly commit?: string;
  readonly remote?: string;
}

/**
 * Operating system and runtime environment metadata.
 */
export interface ThreadEnvironmentMeta {
  readonly platform: string;
  readonly arch: string;
  readonly runtimeVersion: string;
}

/**
 * Cumulative token consumption for the entire thread session.
 */
export interface ThreadTokenUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly totalTokens: number;
  readonly reasoningTokens?: number;
  readonly cacheReadTokens?: number;
  readonly cacheWriteTokens?: number;
}

/**
 * Persisted summary metadata for a conversational thread.
 */
export interface ThreadMetadata {
  readonly version: 1;
  readonly id: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly title?: string | undefined;
  readonly tags: readonly string[];
  readonly workingDirectory: string;
  readonly model?: string | undefined;
  readonly provider?: string | undefined;
  readonly reasoning?: string | undefined;
  readonly turnCount: number;
  readonly status: ThreadStatus;
  readonly activeTranscriptSequence: number;
  readonly lastUserPromptPreview?: string | undefined;
  readonly usage: {
    readonly promptTokens?: number | undefined;
    readonly completionTokens?: number | undefined;
    readonly totalTokens?: number | undefined;
    readonly reasoningTokens?: number | undefined;
  };
}

/**
 * Authoritative append-only log entries in transcript.jsonl.
 */
export type TranscriptEntry =
  | {
      readonly type: "turnStarted";
      readonly sequence: number;
      readonly turnIndex: number;
      readonly userPrompt: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "modelMessage";
      readonly sequence: number;
      readonly message: ModelMessage;
      readonly timestamp: number;
    }
  | {
      readonly type: "toolCall";
      readonly sequence: number;
      readonly callId: string;
      readonly toolName: string;
      readonly parameters: unknown;
      readonly timestamp: number;
    }
  | {
      readonly type: "toolResult";
      readonly sequence: number;
      readonly callId: string;
      readonly toolName: string;
      readonly result: unknown;
      readonly isError: boolean;
      readonly timestamp: number;
    }
  | {
      readonly type: "checkpointRef";
      readonly sequence: number;
      readonly checkpointId: string;
      readonly checkpointSequence: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "turnFinished";
      readonly sequence: number;
      readonly turnIndex: number;
      readonly finishReason: string;
      readonly timestamp: number;
    };

export type NewTranscriptEntry =
  | {
      readonly type: "turnStarted";
      readonly turnIndex: number;
      readonly userPrompt: string;
      readonly timestamp: number;
    }
  | {
      readonly type: "modelMessage";
      readonly message: ModelMessage;
      readonly timestamp: number;
    }
  | {
      readonly type: "toolCall";
      readonly callId: string;
      readonly toolName: string;
      readonly parameters: unknown;
      readonly timestamp: number;
    }
  | {
      readonly type: "toolResult";
      readonly callId: string;
      readonly toolName: string;
      readonly result: unknown;
      readonly isError: boolean;
      readonly timestamp: number;
    }
  | {
      readonly type: "checkpointRef";
      readonly checkpointId: string;
      readonly checkpointSequence: number;
      readonly timestamp: number;
    }
  | {
      readonly type: "turnFinished";
      readonly turnIndex: number;
      readonly finishReason: string;
      readonly timestamp: number;
    };

export interface CreateThreadInput {
  readonly id?: string | undefined;
  readonly title?: string | undefined;
  readonly tags?: readonly string[] | undefined;
  readonly workingDirectory: string;
  readonly model?: string | undefined;
  readonly provider?: string | undefined;
  readonly reasoning?: string | undefined;
}

export interface ThreadStore {
  createThread(input: CreateThreadInput): Promise<ThreadMetadata>;
  getThread(threadId: string): Promise<ThreadMetadata | undefined>;
  listThreads(options?: {
    readonly workingDirectory?: string;
    readonly limit?: number;
  }): Promise<readonly ThreadMetadata[]>;
  updateThreadMetadata(
    threadId: string,
    patch: Partial<
      Omit<ThreadMetadata, "id" | "createdAt" | "activeTranscriptSequence">
    >,
  ): Promise<ThreadMetadata>;
  deleteThread(threadId: string): Promise<boolean>;
  appendTranscript(
    threadId: string,
    entry: NewTranscriptEntry,
  ): Promise<TranscriptEntry>;
  loadTranscript(threadId: string): Promise<readonly TranscriptEntry[]>;
  loadMessages(threadId: string): Promise<readonly ModelMessage[]>;
}
