/**
 * @fileoverview Built-in tool for writing files to the workspace.
 * Handles automatic parent directory creation and atomic writes to avoid partial writes.
 * @packageDocumentation
 */

import { existsSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { z } from "zod";
import type { AgentTool } from "./AgentTool.js";
import type { ToolExecutionContext } from "./ToolExecutionContext.js";
import { resolvePathWithinWorkspace } from "./internal/pathGuard.js";
import { writeFileDescription } from "./prompts.js";

/**
 * Input parameter schema for WriteFileTool.
 */
export const writeFileInputSchema = z.object({
  filePath: z
    .string()
    .describe("The relative or absolute file path to create or overwrite."),
  content: z
    .string()
    .describe("The complete text content to write into the file."),
});

/**
 * Result structure produced by WriteFileTool.
 */
export interface WriteFileOutput {
  readonly filePath: string;
  readonly bytesWritten: number;
  readonly linesWritten: number;
  readonly status: "created" | "overwritten";
}

/**
 * Built-in tool for creating or overwriting files.
 */
export class WriteFileTool
  implements AgentTool<typeof writeFileInputSchema, WriteFileOutput>
{
  public static readonly toolName = "writeFile";

  public readonly name = WriteFileTool.toolName;
  public readonly description = writeFileDescription;
  public readonly inputSchema = writeFileInputSchema;
  public readonly isMutating = true;
  public readonly isConcurrencySafe = false;

  /**
   * Executes the file writing operation atomically.
   *
   * @param parameters - Validated parameters containing filePath and content.
   * @param context - The execution context with workingDirectory.
   * @returns A promise resolving to the structured write result.
   */
  public async execute(
    parameters: z.infer<typeof writeFileInputSchema>,
    context: ToolExecutionContext,
  ): Promise<WriteFileOutput> {
    const fullPath = resolvePathWithinWorkspace(
      parameters.filePath,
      context.workingDirectory,
    );
    const parentDir = dirname(fullPath);

    if (!existsSync(parentDir)) {
      await mkdir(parentDir, { recursive: true });
    }

    const fileExisted = existsSync(fullPath);
    const buffer = Buffer.from(parameters.content, "utf-8");

    // Atomic write pattern: write to temporary sibling file, then rename
    const tempPath = `${fullPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    await writeFile(tempPath, buffer);
    await rename(tempPath, fullPath);

    const lineCount = parameters.content.split("\n").length;

    return {
      filePath: parameters.filePath,
      bytesWritten: buffer.length,
      linesWritten: lineCount,
      status: fileExisted ? "overwritten" : "created",
    };
  }
}
