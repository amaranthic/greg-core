/**
 * @fileoverview Checkpoint schemas, file records, manifests, and rollback contracts.
 * @packageDocumentation
 */

export type {
  FileChangeStatus,
  CheckpointFileRecord,
  CheckpointRecord,
} from './checkpointRecord.js';

export type {
  CheckpointManifest,
} from './checkpointManifest.js';

export type {
  RestoreFileAction,
  RestoreResult,
} from './restorePlan.js';
