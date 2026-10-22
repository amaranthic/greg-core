/**
 * @fileoverview Checkpoint, delta snapshot, and rollback type definitions.
 * @packageDocumentation
 */

export interface CheckpointFileRecord {
  readonly relativePath: string;
  readonly beforeHash?: string;
  readonly afterHash?: string;
  readonly status: "+" | "~" | "-";
}

export interface CheckpointRecord {
  readonly id: string;
  readonly sequence: number;
  readonly threadId: string;
  readonly turnIndex: number;
  readonly toolName: string;
  readonly timestamp: number;
  readonly files: readonly CheckpointFileRecord[];
  readonly coverage: "complete" | "partial";
}

export interface RestoreFileAction {
  readonly relativePath: string;
  readonly action: "create" | "modify" | "delete";
  readonly isConflict: boolean;
}

export interface RestorePlan {
  readonly checkpointId: string;
  readonly actions: readonly RestoreFileAction[];
  readonly hasConflicts: boolean;
}

export interface RestoreResult {
  readonly success: boolean;
  readonly filesRestored: number;
  readonly conflictsIgnored: number;
}

export interface CheckpointStore {
  createCheckpoint(
    threadId: string,
    checkpoint: Omit<CheckpointRecord, "sequence">,
  ): Promise<CheckpointRecord>;
  getCheckpoint(
    threadId: string,
    checkpointId: string,
  ): Promise<CheckpointRecord | undefined>;
  listCheckpoints(threadId: string): Promise<readonly CheckpointRecord[]>;
  planRestore(
    threadId: string,
    checkpointId: string,
    workingDirectory: string,
  ): Promise<RestorePlan>;
  restoreCheckpoint(
    threadId: string,
    checkpointId: string,
    workingDirectory: string,
    options?: { readonly force?: boolean },
  ): Promise<RestoreResult>;
}
