/**
 * @fileoverview Checkpoint creation and rollback hook interface definitions.
 * @packageDocumentation
 */

/**
 * Context provided after a checkpoint has been recorded.
 */
export interface CheckpointCreatedContext {
  /** Unique checkpoint identifier. */
  readonly checkpointId: string;
  /** Monotonic sequence counter. */
  readonly sequence: number;
  /** Human-readable label for the snapshot. */
  readonly label: string;
  /** Relative file paths captured in the checkpoint. */
  readonly filesTouched: readonly string[];
}

/**
 * Hook invoked when a new workspace checkpoint is captured.
 * Allows products to index restore points or notify the user interface.
 */
export type OnCheckpointCreatedHook = (
  context: CheckpointCreatedContext,
) => Promise<void> | void;

/**
 * Context provided after a thread has been rewound to a previous checkpoint.
 */
export interface PostRollbackContext {
  /** Checkpoint identifier that was restored. */
  readonly checkpointId: string;
  /** Sequence number of the restored checkpoint. */
  readonly sequence: number;
  /** Relative paths of all files that were modified or restored. */
  readonly restoredFiles: readonly string[];
}

/**
 * Hook invoked after files have been restored to a previous checkpoint.
 * Allows products to refresh UI file trees, invalidate caches, or display notifications.
 */
export type OnPostRollbackHook = (
  context: PostRollbackContext,
) => Promise<void> | void;
