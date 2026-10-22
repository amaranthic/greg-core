/**
 * @fileoverview Robust append-only JSONL parser and appender with torn-tail recovery.
 * @packageDocumentation
 */

import { existsSync } from "node:fs";
import { appendFile, mkdir, readFile, truncate } from "node:fs/promises";
import path from "node:path";

/**
 * Appends a record to a JSONL file with trailing newline.
 *
 * @param filePath - The target JSONL file.
 * @param record - Object to serialize and append.
 */
export async function appendJsonl<T>(filePath: string, record: T): Promise<void> {
  const absolutePath = path.resolve(filePath);
  const parentDir = path.dirname(absolutePath);
  if (!existsSync(parentDir)) {
    await mkdir(parentDir, { recursive: true });
  }

  const line = JSON.stringify(record) + "\n";
  await appendFile(absolutePath, line, "utf-8");
}

/**
 * Reads all records from a JSONL file, recovering from torn trailing lines if found.
 *
 * @param filePath - The JSONL file to read.
 * @returns Array of parsed records.
 */
export async function readJsonl<T>(filePath: string): Promise<T[]> {
  const absolutePath = path.resolve(filePath);
  if (!existsSync(absolutePath)) {
    return [];
  }

  const content = await readFile(absolutePath, "utf-8");
  if (!content.trim()) {
    return [];
  }

  const lines = content.split("\n");
  const records: T[] = [];

  for (let i = 0; i < lines.length; i++) {
    const rawLine = lines[i]!;
    if (rawLine.trim().length === 0) {
      continue;
    }

    try {
      records.push(JSON.parse(rawLine) as T);
    } catch (parseError) {
      // If it is the last line and not newline-terminated, it may be a torn write
      if (i === lines.length - 1 && !content.endsWith("\n")) {
        // Attempt recovery by truncating the torn line
        const validBytes = Buffer.byteLength(
          lines.slice(0, i).join("\n") + "\n",
          "utf-8",
        );
        try {
          await truncate(absolutePath, validBytes);
        } catch {
          // Ignored
        }
        break;
      }
      throw new Error(
        `Corrupt JSONL entry at line ${i + 1} in "${filePath}": ${(parseError as Error).message}`,
      );
    }
  }

  return records;
}
