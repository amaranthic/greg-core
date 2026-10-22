/**
 * @fileoverview Filesystem-backed content-addressed CheckpointStore with delta snapshots and safe conflict detection.
 * @packageDocumentation
 */

import { createHash } from "node:crypto";
import { existsSync } from "node:fs";
import { readFile, unlink } from "node:fs/promises";
import path from "node:path";
import { atomicWriteFile } from "../storage/atomicFile.js";
import { resolveHomeDirectory } from "../storage/homeDirectory.js";
import { withFileLock } from "../storage/lock.js";
import type {
  CheckpointRecord,
  CheckpointStore,
  RestoreFileAction,
  RestorePlan,
  RestoreResult,
} from "./types.js";

export class FileCheckpointStore implements CheckpointStore {
  private readonly rootDir: string;

  public constructor(options?: { readonly homeDirectory?: string }) {
    this.rootDir = resolveHomeDirectory(options);
  }

  private getManifestPath(threadId: string): string {
    return path.join(this.rootDir, "threads", threadId, "checkpoints", "manifest.json");
  }

  private getBlobPath(sha256: string): string {
    return path.join(this.rootDir, "blobs", "sha256", sha256);
  }

  /**
   * Stores raw data in the content-addressed blob store.
   */
  public async storeBlob(data: Buffer | Uint8Array): Promise<string> {
    const hash = createHash("sha256").update(data).digest("hex");
    const blobPath = this.getBlobPath(hash);
    if (!existsSync(blobPath)) {
      await atomicWriteFile(blobPath, data);
    }
    return hash;
  }

  /**
   * Reads a raw blob from the content-addressed store.
   */
  public async readBlob(sha256: string): Promise<Buffer> {
    const blobPath = this.getBlobPath(sha256);
    if (!existsSync(blobPath)) {
      throw new Error(`Blob not found: "${sha256}"`);
    }
    return await readFile(blobPath);
  }

  public async listCheckpoints(
    threadId: string,
  ): Promise<readonly CheckpointRecord[]> {
    const manifestPath = this.getManifestPath(threadId);
    if (!existsSync(manifestPath)) {
      return [];
    }
    const raw = await readFile(manifestPath, "utf-8");
    return JSON.parse(raw) as CheckpointRecord[];
  }

  public async getCheckpoint(
    threadId: string,
    checkpointId: string,
  ): Promise<CheckpointRecord | undefined> {
    const list = await this.listCheckpoints(threadId);
    return list.find((cp) => cp.id === checkpointId);
  }

  public async createCheckpoint(
    threadId: string,
    checkpoint: Omit<CheckpointRecord, "sequence">,
  ): Promise<CheckpointRecord> {
    const manifestPath = this.getManifestPath(threadId);
    const lockPath = path.join(
      this.rootDir,
      "threads",
      threadId,
      "checkpoints",
      ".checkpoint.lock",
    );

    return await withFileLock(lockPath, async () => {
      const list = (await this.listCheckpoints(threadId)) as CheckpointRecord[];
      const sequence = list.length + 1;
      const fullRecord: CheckpointRecord = {
        ...checkpoint,
        sequence,
      };

      list.push(fullRecord);
      await atomicWriteFile(manifestPath, JSON.stringify(list, null, 2));
      return fullRecord;
    });
  }

  public async planRestore(
    threadId: string,
    checkpointId: string,
    workingDirectory: string,
  ): Promise<RestorePlan> {
    const cp = await this.getCheckpoint(threadId, checkpointId);
    if (!cp) {
      throw new Error(`Checkpoint not found: "${checkpointId}"`);
    }

    const actions: RestoreFileAction[] = [];
    let hasConflicts = false;

    for (const file of cp.files) {
      const targetPath = path.resolve(workingDirectory, file.relativePath);
      const targetExists = existsSync(targetPath);

      let currentHash: string | undefined;
      if (targetExists) {
        const buf = await readFile(targetPath);
        currentHash = createHash("sha256").update(buf).digest("hex");
      }

      // Conflict detection: if file was mutated by external editor since checkpoint
      const isConflict =
        Boolean(file.afterHash && currentHash && currentHash !== file.afterHash);

      if (isConflict) {
        hasConflicts = true;
      }

      let action: "create" | "modify" | "delete" = "modify";
      if (!file.beforeHash) {
        // Was created by the tool, so restore deletes it
        action = "delete";
      } else if (!targetExists) {
        // Was deleted or does not exist, so restore creates it
        action = "create";
      }

      actions.push({
        relativePath: file.relativePath,
        action,
        isConflict,
      });
    }

    return {
      checkpointId,
      actions,
      hasConflicts,
    };
  }

  public async restoreCheckpoint(
    threadId: string,
    checkpointId: string,
    workingDirectory: string,
    options?: { readonly force?: boolean },
  ): Promise<RestoreResult> {
    const plan = await this.planRestore(
      threadId,
      checkpointId,
      workingDirectory,
    );
    if (plan.hasConflicts && !options?.force) {
      throw new Error(
        `Restore conflicts detected in checkpoint "${checkpointId}". Pass { force: true } to overwrite uncommitted external changes.`,
      );
    }

    const cp = (await this.getCheckpoint(threadId, checkpointId))!;
    let filesRestored = 0;
    let conflictsIgnored = 0;

    for (const file of cp.files) {
      const targetPath = path.resolve(workingDirectory, file.relativePath);
      const actionItem = plan.actions.find(
        (a) => a.relativePath === file.relativePath,
      );

      if (actionItem?.isConflict) {
        conflictsIgnored++;
      }

      if (actionItem?.action === "delete") {
        if (existsSync(targetPath)) {
          await unlink(targetPath);
          filesRestored++;
        }
      } else if (file.beforeHash) {
        const blobContent = await this.readBlob(file.beforeHash);
        await atomicWriteFile(targetPath, blobContent);
        filesRestored++;
      }
    }

    return {
      success: true,
      filesRestored,
      conflictsIgnored,
    };
  }
}
