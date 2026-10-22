/**
 * @file EditFileTool.ts
 * @description Built-in tool for surgical file edits in `@amaranthic/greg-agent-core`.
 * Enforces exact string matching, uniqueness validation, and atomic replacement.
 */

import { existsSync } from "node:fs";
import { readFile, rename, writeFile } from "node:fs/promises";
import { isAbsolute, resolve } from "node:path";
import { z } from "@amaranthic/greg-sdk";
import type { AgentTool } from "../AgentTool.js";
import type { ToolExecutionContext } from "../ToolExecutionContext.js";
import { EDIT_FILE_DESCRIPTION } from "./prompt.js";

/**
 * Input parameter schema for EditFileTool.
 */
export const editFileInputSchema = z.object({
  filePath: z
    .string()
    .describe("The relative or absolute path of the file to edit."),
  oldString: z
    .string()
    .describe("The exact existing text within the file to replace."),
  newString: z
    .string()
    .describe("The replacement text to insert in place of oldString."),
  replaceAll: z
    .boolean()
    .optional()
    .describe(
      "Set to true to replace all occurrences. Defaults to false (replaces single unique match).",
    ),
});

/**
 * Result structure produced by EditFileTool.
 */
export interface EditFileOutput {
  readonly filePath: string;
  readonly replacementsApplied: number;
  readonly bytesWritten: number;
}

/**
 * Resolves a file path relative to the workspace directory.
 *
 * @param targetPath - The path specified in tool arguments.
 * @param rootDir - The workspace root directory.
 * @returns An absolute normalized file path.
 */
function resolvePath(targetPath: string, rootDir: string): string {
  if (isAbsolute(targetPath)) {
    return resolve(targetPath);
  }
  return resolve(rootDir, targetPath);
}

/**
 * Built-in tool for surgical in-place string replacements in files.
 */
export class EditFileTool
  implements AgentTool<typeof editFileInputSchema, EditFileOutput>
{
  public static readonly toolName = "editFile";

  public readonly name = EditFileTool.toolName;
  public readonly description = EDIT_FILE_DESCRIPTION;
  public readonly inputSchema = editFileInputSchema;
  public readonly isMutating = true;
  public readonly isConcurrencySafe = false;

  /**
   * Executes the in-place string replacement operation.
   *
   * @param parameters - Validated parameters containing filePath, oldString, newString, replaceAll.
   * @param context - The execution context with workingDirectory.
   * @returns A promise resolving to the structured edit result.
   */
  public async execute(
    parameters: z.infer<typeof editFileInputSchema>,
    context: ToolExecutionContext,
  ): Promise<EditFileOutput> {
    if (parameters.oldString === parameters.newString) {
      throw new Error(
        "No changes to make: oldString and newString are identical.",
      );
    }

    const fullPath = resolvePath(parameters.filePath, context.workingDirectory);

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${parameters.filePath}`);
    }

    const rawContent = await readFile(fullPath, "utf-8");

    if (!rawContent.includes(parameters.oldString)) {
      throw new Error(
        `String to replace not found in file '${parameters.filePath}'. ` +
          "Ensure whitespace, indentation, and newlines match the file exactly.",
      );
    }

    const occurrences = rawContent.split(parameters.oldString).length - 1;

    if (occurrences > 1 && !parameters.replaceAll) {
      throw new Error(
        `Found ${occurrences} matches of the string to replace, but replaceAll is false. ` +
          "To replace all occurrences, set replaceAll to true. " +
          "To replace only one occurrence, provide more surrounding context to uniquely identify the instance.",
      );
    }

    const updatedContent = parameters.replaceAll
      ? rawContent.replaceAll(parameters.oldString, parameters.newString)
      : rawContent.replace(parameters.oldString, parameters.newString);

    const buffer = Buffer.from(updatedContent, "utf-8");

    // Atomic write pattern: write to temporary sibling file, then rename
    const tempPath = `${fullPath}.tmp.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`;
    await writeFile(tempPath, buffer);
    await rename(tempPath, fullPath);

    return {
      filePath: parameters.filePath,
      replacementsApplied: parameters.replaceAll ? occurrences : 1,
      bytesWritten: buffer.length,
    };
  }
}
