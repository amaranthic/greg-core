/**
 * @fileoverview Checkpoint creation and restoration event definitions.
 * @packageDocumentation
 */

/**
 * Event emitted when a workspace checkpoint is captured.
 */
export interface CheckpointCreatedEvent {
  /** Discriminant event type. */
  readonly type: 'checkpointCreated';
  /** Unique checkpoint identifier. */
  readonly checkpointId: string;
  /** Monotonic sequence number within the thread. */
  readonly sequence: number;
  /** Descriptive label for the snapshot. */
  readonly label: string;
  /** Relative paths of all files captured in this checkpoint. */
  readonly filesTouched: readonly string[];
}

/**
 * Event emitted when workspace files have been restored to a previous checkpoint.
 */
export interface CheckpointRestoredEvent {
  /** Discriminant event type. */
  readonly type: 'checkpointRestored';
  /** Checkpoint identifier that was restored. */
  readonly checkpointId: string;
  /** Sequence number of the restored checkpoint. */
  readonly sequence: number;
  /** Relative paths of all files that were rolled back or removed. */
  readonly restoredFiles: readonly string[];
}
