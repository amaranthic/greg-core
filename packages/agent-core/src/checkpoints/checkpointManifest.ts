/**
 * @fileoverview Root checkpoint manifest schema for storage at checkpoints/manifest.json.
 * @packageDocumentation
 */

import type { CheckpointRecord } from './checkpointRecord.js';

/**
 * Root checkpoint manifest tracking chronological snapshot history for a thread session.
 */
export interface CheckpointManifest {
  /** Manifest schema version for forward compatibility. */
  readonly version: 1;
  /** Identifier of the thread this manifest belongs to. */
  readonly threadId: string;
  /** Current highest checkpoint sequence number. */
  readonly currentSequence: number;
  /** Chronological array of all recorded snapshots. */
  readonly checkpoints: readonly CheckpointRecord[];
}
