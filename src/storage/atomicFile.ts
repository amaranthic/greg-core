/**
 * @fileoverview Atomic file write operations with temporary sibling staging.
 * @packageDocumentation
 */

import { existsSync } from "node:fs";
import { mkdir, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";

export interface AtomicWriteOptions {
  /** File mode permission bits. */
  readonly mode?: number;
}

/**
 * Writes data to a file atomically by writing to an exclusive sibling temp file
 * and then renaming it over the destination.
 *
 * @param filePath - The destination file path.
 * @param content - Data string or Uint8Array buffer to write.
 * @param options - Optional file mode options.
 * @returns Total bytes written.
 */
export async function atomicWriteFile(
  filePath: string,
  content: string | Uint8Array,
  options?: AtomicWriteOptions,
): Promise<number> {
  const absolutePath = path.resolve(filePath);
  const parentDir = path.dirname(absolutePath);

  if (!existsSync(parentDir)) {
    await mkdir(parentDir, { recursive: true });
  }

  const tempPath = `${absolutePath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
  const buffer =
    typeof content === "string" ? Buffer.from(content, "utf-8") : content;

  try {
    await writeFile(tempPath, buffer, {
      mode: options?.mode,
      flag: "wx",
    });
    await rename(tempPath, absolutePath);
    return buffer.length;
  } catch (error) {
    try {
      if (existsSync(tempPath)) {
        await unlink(tempPath);
      }
    } catch {
      // Ignore cleanup error
    }
    throw error;
  }
}
