/**
 * @fileoverview Checkpoint restoration planning and rollback result schemas.
 * @packageDocumentation
 */

/**
 * Action planned for a single file during checkpoint restoration.
 */
export interface RestoreFileAction {
  /** Relative file path. */
  readonly path: string;
  /** Action to take on disk. */
  readonly action: 'restore' | 'delete';
  /** The target SHA-256 hash to restore to disk; null if the file should be deleted. */
  readonly targetHash: string | null;
  /** The current SHA-256 hash of the file on disk before restoration. */
  readonly currentHash: string | null;
  /** Whether the file was modified externally outside the agent (conflict). */
  readonly isConflict: boolean;
}

/**
 * Result of computing or executing a checkpoint rollback.
 */
export interface RestoreResult {
  /** The target checkpoint identifier that was restored. */
  readonly checkpointId: string;
  /** Target sequence number restored. */
  readonly targetSequence: number;
  /** All planned or executed file restoration actions. */
  readonly plannedActions: readonly RestoreFileAction[];
  /** Any conflicting files detected where disk state differed from expectation. */
  readonly conflicts: readonly RestoreFileAction[];
  /** Whether the operation was a dry-run check or written to disk. */
  readonly dryRun: boolean;
}
