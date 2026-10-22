/**
 * @file ReadFileTool.ts
 * @description Built-in tool for safely reading file contents in `@amaranthic/greg-agent-core`.
 * Incorporates binary rejection, device file protection, line-based pagination,
 * and output truncation limits.
 */

import { existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { z } from "@amaranthic/greg-sdk";
import type { AgentTool } from "../AgentTool.js";
import type { ToolExecutionContext } from "../ToolExecutionContext.js";
import { resolvePathWithinWorkspace } from "../internal/pathGuard.js";
import { READ_FILE_DESCRIPTION } from "./prompt.js";

/**
 * Maximum character count returned before truncating file output.
 */
const MAX_READ_OUTPUT_CHARACTERS = 30000;

/**
 * Maximum lines returned in a single unpaginated read.
 */
const MAX_READ_OUTPUT_LINES = 2000;

/**
 * Common binary file extensions rejected without disk I/O.
 */
const BINARY_EXTENSIONS = new Set([
  ".zip",
  ".tar",
  ".gz",
  ".7z",
  ".rar",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".ico",
  ".pdf",
  ".exe",
  ".dll",
  ".so",
  ".dylib",
  ".bin",
  ".wasm",
  ".pyc",
]);

/**
 * Device paths that would block or hang indefinitely.
 */
const BLOCKING_DEVICE_PREFIXES = ["/dev/zero", "/dev/urandom", "/dev/random"];

/**
 * Input parameter schema for ReadFileTool.
 */
export const readFileInputSchema = z.object({
  filePath: z
    .string()
    .describe("The relative or absolute file path to read from."),
  offset: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("1-based line number to begin reading from."),
  limit: z
    .number()
    .int()
    .min(1)
    .optional()
    .describe("Maximum number of lines to return."),
});

/**
 * Result structure produced by ReadFileTool.
 */
export interface ReadFileOutput {
  readonly filePath: string;
  readonly totalLines: number;
  readonly startLine: number;
  readonly linesReturned: number;
  readonly content: string;
  readonly isTruncated: boolean;
  readonly hint?: string | undefined;
}

/**
 * Built-in tool for inspecting file contents.
 */
export class ReadFileTool
  implements AgentTool<typeof readFileInputSchema, ReadFileOutput>
{
  public static readonly toolName = "readFile";

  public readonly name = ReadFileTool.toolName;
  public readonly description = READ_FILE_DESCRIPTION;
  public readonly inputSchema = readFileInputSchema;
  public readonly isMutating = false;
  public readonly isConcurrencySafe = true;

  /**
   * Executes the file reading operation with safety checks and pagination.
   *
   * @param parameters - Validated parameters containing filePath, offset, and limit.
   * @param context - The execution context with workingDirectory and fileReadState.
   * @returns A promise resolving to the structured file read output.
   */
  public async execute(
    parameters: z.infer<typeof readFileInputSchema>,
    context: ToolExecutionContext,
  ): Promise<ReadFileOutput> {
    const fullPath = resolvePathWithinWorkspace(
      parameters.filePath,
      context.workingDirectory,
    );

    for (const prefix of BLOCKING_DEVICE_PREFIXES) {
      if (fullPath.startsWith(prefix)) {
        throw new Error(
          `Cannot read device file '${parameters.filePath}': device causes infinite or blocking stream.`,
        );
      }
    }

    const lowerPath = fullPath.toLowerCase();
    for (const ext of BINARY_EXTENSIONS) {
      if (lowerPath.endsWith(ext)) {
        throw new Error(
          `Cannot read binary file '${parameters.filePath}' (${ext}). Use specialized binary or extraction tools.`,
        );
      }
    }

    if (!existsSync(fullPath)) {
      throw new Error(`File not found: ${parameters.filePath}`);
    }

    const fileStats = await stat(fullPath);
    if (!fileStats.isFile()) {
      throw new Error(
        `Path '${parameters.filePath}' is not a regular file. Directory, device, socket, or non-regular paths cannot be read as text.`,
      );
    }

    // Maximum file size cap before loading buffer into memory (20MB)
    const MAX_FILE_BYTES = 20 * 1024 * 1024;
    if (fileStats.size > MAX_FILE_BYTES) {
      throw new Error(
        `File '${parameters.filePath}' is too large to read into memory (${(fileStats.size / (1024 * 1024)).toFixed(1)}MB exceeds limit of 20MB).`,
      );
    }

    const buffer = await readFile(fullPath);

    // Null byte detection for binary files
    if (buffer.includes(0)) {
      throw new Error(
        `Cannot read binary file '${parameters.filePath}': file contains null bytes.`,
      );
    }

    const rawContent = buffer.toString("utf-8");
    const rawLines = rawContent
      .split("\n")
      .map((line) => (line.endsWith("\r") ? line.slice(0, -1) : line));

    if (rawContent.endsWith("\n") && rawLines.length > 0) {
      rawLines.pop();
    }

    const startLineIndex = parameters.offset ? parameters.offset - 1 : 0;
    const endLineIndex = parameters.limit
      ? startLineIndex + parameters.limit
      : rawLines.length;

    let selectedLines = rawLines.slice(startLineIndex, endLineIndex);
    let isTruncated = false;

    if (selectedLines.length > MAX_READ_OUTPUT_LINES) {
      selectedLines = selectedLines.slice(0, MAX_READ_OUTPUT_LINES);
      isTruncated = true;
    }

    let formattedContent = selectedLines
      .map((line, index) => `${startLineIndex + index + 1}: ${line}`)
      .join("\n");

    if (formattedContent.length > MAX_READ_OUTPUT_CHARACTERS) {
      formattedContent =
        formattedContent.slice(0, MAX_READ_OUTPUT_CHARACTERS) +
        "\n... [output truncated at 30,000 characters]";
      isTruncated = true;
    }

    return {
      filePath: parameters.filePath,
      totalLines: rawLines.length,
      startLine: startLineIndex + 1,
      linesReturned: selectedLines.length,
      content: formattedContent,
      isTruncated,
      hint: isTruncated
        ? "Use offset and limit parameters to inspect specific sections."
        : undefined,
    };
  }
}
