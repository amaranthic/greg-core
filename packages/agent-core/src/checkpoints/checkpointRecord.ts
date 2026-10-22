/**
 * @fileoverview Checkpoint record and file modification status schemas.
 * @packageDocumentation
 */

/**
 * Three-way file modification status relative to a checkpoint:
 * - `'+'` indicates file was newly created.
 * - `'~'` indicates file content was modified.
 * - `'-'` indicates file was deleted.
 */
export type FileChangeStatus = '+' | '~' | '-';

/**
 * Record of a single file touched during a checkpoint.
 */
export interface CheckpointFileRecord {
  /** Working-directory-relative POSIX path (e.g. 'src/utils/helpers.ts'). */
  readonly path: string;
  /** SHA-256 hash of file before modification; null if the file was newly created. */
  readonly beforeHash: string | null;
  /** SHA-256 hash of file after modification; null if the file was deleted. */
  readonly afterHash: string | null;
  /** POSIX file permission mode (e.g. 0o644, 0o755). */
  readonly mode?: number | null;
  /** Three-way file change status. */
  readonly status: FileChangeStatus;
}

/**
 * A discrete checkpoint snapshot record anchored to a tool call or turn step.
 */
export interface CheckpointRecord {
  /** Unique checkpoint identifier (e.g. 'chk_01j9a8b7c6d5'). */
  readonly checkpointId: string;
  /** Monotonic sequence counter for checkpoints in this thread. */
  readonly sequence: number;
  /** Turn index when this checkpoint was created. */
  readonly turnIndex: number;
  /** Associated tool call ID that triggered the file mutations. */
  readonly toolCallId?: string;
  /** Name of the mutating tool (e.g. 'editFile', 'writeFile', 'runCommand'). */
  readonly toolName: string;
  /** Human-readable description or label for the checkpoint. */
  readonly label: string;
  /** ISO 8601 creation timestamp. */
  readonly createdAt: string;
  /** List of all files tracked in this checkpoint. */
  readonly files: readonly CheckpointFileRecord[];
}
