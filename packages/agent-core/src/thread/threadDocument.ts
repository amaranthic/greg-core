/**
 * @fileoverview Thread document manifest and metadata schema definitions.
 * @packageDocumentation
 */

/**
 * Metadata capturing the local Git repository state when the thread is active.
 */
export interface ThreadGitMeta {
  /** Active Git branch name. */
  readonly branch?: string;
  /** Commit SHA of HEAD. */
  readonly commit?: string;
  /** Git remote URL. */
  readonly remote?: string;
}

/**
 * Operating system and runtime environment metadata.
 */
export interface ThreadEnvironmentMeta {
  /** Host operating system platform (e.g. 'linux', 'darwin', 'win32'). */
  readonly platform: string;
  /** Host CPU architecture (e.g. 'x64', 'arm64'). */
  readonly arch: string;
  /** Engine and runtime version string. */
  readonly runtimeVersion: string;
}

/**
 * Cumulative token consumption for the entire thread session.
 */
export interface ThreadTokenUsage {
  /** Total input/prompt tokens processed. */
  readonly inputTokens: number;
  /** Total output/completion tokens generated. */
  readonly outputTokens: number;
  /** Total tokens consumed. */
  readonly totalTokens: number;
  /** Optional reasoning/thinking tokens consumed. */
  readonly reasoningTokens?: number;
  /** Tokens read from prompt cache. */
  readonly cacheReadTokens?: number;
  /** Tokens written to prompt cache. */
  readonly cacheWriteTokens?: number;
}

/**
 * Active model configuration for the thread.
 */
export interface ThreadModelConfig {
  /** The first-slash model string (e.g. 'anthropic/claude-3-7-sonnet', 'openai/gpt-4o'). */
  readonly modelId: string;
  /** Provider name extracted before the first slash. */
  readonly provider: string;
  /** Optional reasoning effort setting ('low' | 'medium' | 'high'). */
  readonly reasoningEffort?: 'low' | 'medium' | 'high';
}

/**
 * The root manifest document stored at ~/.greg/threads/<id>/thread.json.
 */
export interface ThreadDocument {
  /** Schema version for forward migrations. */
  readonly version: 1;
  /** Unique thread identifier (e.g. 'th_01j9a8b7c6d5e4f3'). */
  readonly threadId: string;
  /** Human-readable title or summary of the thread. */
  readonly title: string;
  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;
  /** ISO 8601 last update timestamp. */
  readonly updatedAt: string;
  /** Absolute working directory path on the host. */
  readonly workingDirectory: string;
  /** Active model configuration. */
  readonly model: ThreadModelConfig;
  /** Cumulative token usage across all turns in this thread. */
  readonly usage: ThreadTokenUsage;
  /** Optional Git repository state. */
  readonly git?: ThreadGitMeta;
  /** Host environment metadata. */
  readonly environment: ThreadEnvironmentMeta;
  /** Custom product-specific metadata tags. */
  readonly customMetadata?: Record<string, unknown>;
}
