/**
 * @fileoverview File-based exclusive locking for multi-process coordination.
 * @packageDocumentation
 */

import { existsSync } from "node:fs";
import { mkdir, open, readFile, unlink } from "node:fs/promises";
import path from "node:path";

export interface LockPayload {
  readonly pid: number;
  readonly token: string;
  readonly createdAt: number;
}

/**
 * Executes an operation holding an exclusive lock file.
 *
 * @param lockPath - Path to the lock file.
 * @param operation - Async function to run under the lock.
 * @param timeoutMs - Max time to wait for lock acquisition (defaults to 10000ms).
 * @returns Result of the operation.
 */
export async function withFileLock<T>(
  lockPath: string,
  operation: () => Promise<T>,
  timeoutMs = 10000,
): Promise<T> {
  const absoluteLock = path.resolve(lockPath);
  const parentDir = path.dirname(absoluteLock);
  if (!existsSync(parentDir)) {
    await mkdir(parentDir, { recursive: true });
  }
  const token = Math.random().toString(36).slice(2, 10);
  const payload: LockPayload = {
    pid: process.pid,
    token,
    createdAt: Date.now(),
  };

  const startTime = Date.now();
  let acquired = false;

  while (!acquired) {
    try {
      const handle = await open(absoluteLock, "wx");
      try {
        await handle.writeFile(JSON.stringify(payload), "utf-8");
      } finally {
        await handle.close();
      }
      acquired = true;
    } catch {
      if (Date.now() - startTime > timeoutMs) {
        throw new Error(
          `Failed to acquire lock at "${lockPath}" within ${timeoutMs}ms.`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  }

  try {
    return await operation();
  } finally {
    try {
      if (existsSync(absoluteLock)) {
        const content = await readFile(absoluteLock, "utf-8");
        const parsed = JSON.parse(content) as LockPayload;
        if (parsed.token === token) {
          await unlink(absoluteLock);
        }
      }
    } catch {
      // Ignored
    }
  }
}
