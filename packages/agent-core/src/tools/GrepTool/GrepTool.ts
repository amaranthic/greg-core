/**
 * @file GrepTool.ts
 * @description Built-in tool for fast regex and substring content search in `@amaranthic/greg-agent-core`.
 * Traverses targeted files, matches regex patterns line-by-line, ignores binary and vendor files,
 * and caps output to avoid blowing LLM context windows.
 */

import { existsSync } from "node:fs";
import { glob, readFile, stat } from "node:fs/promises";
import { isAbsolute, relative, resolve } from "node:path";
import { z } from "@amaranthic/greg-sdk";
import type { AgentTool } from "../AgentTool.js";
import type { ToolExecutionContext } from "../ToolExecutionContext.js";
import { GREP_DESCRIPTION } from "./prompt.js";

/**
 * Default maximum number of matching lines returned.
 */
const DEFAULT_GREP_LIMIT = 250;

/**
 * Common binary file extensions to skip during content searching.
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
  ".lock",
]);

/**
 * Directory segments excluded from searching.
 */
const EXCLUDED_DIRECTORY_SEGMENTS = [
  "node_modules",
  ".git",
  ".turbo",
  ".next",
  "dist",
  "build",
  ".cache",
];

/**
 * Input parameter schema for GrepTool.
 */
export const grepInputSchema = z.object({
  pattern: z
    .string()
    .describe("The regular expression or text pattern to search for."),
  path: z
    .string()
    .optional()
    .describe(
      "File or directory to search within. Defaults to workspace root directory.",
    ),
  glob: z
    .string()
    .optional()
    .describe(
      "Optional glob pattern to filter search files (e.g. '*.ts', '*.json').",
    ),
  caseInsensitive: z
    .boolean()
    .optional()
    .describe("Whether to perform case-insensitive matching. Defaults to false."),
  headLimit: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Maximum number of match entries to return. Defaults to 250.",
    ),
});

/**
 * Structure of a single grep line match.
 */
export interface GrepMatch {
  readonly filePath: string;
  readonly lineNumber: number;
  readonly line: string;
}

/**
 * Result structure produced by GrepTool.
 */
export interface GrepOutput {
  readonly pattern: string;
  readonly searchPath: string;
  readonly matches: readonly GrepMatch[];
  readonly totalMatches: number;
  readonly durationMs: number;
  readonly isTruncated: boolean;
}

/**
 * Resolves a search path relative to the workspace directory.
 *
 * @param targetPath - Optional file or directory path from parameters.
 * @param rootDir - The workspace root directory.
 * @returns An absolute path.
 */
function resolvePath(targetPath: string | undefined, rootDir: string): string {
  if (!targetPath) {
    return rootDir;
  }
  if (isAbsolute(targetPath)) {
    return resolve(targetPath);
  }
  return resolve(rootDir, targetPath);
}

/**
 * Built-in tool for regex searching across workspace files.
 */
export class GrepTool implements AgentTool<typeof grepInputSchema, GrepOutput> {
  public static readonly toolName = "grep";

  public readonly name = GrepTool.toolName;
  public readonly description = GREP_DESCRIPTION;
  public readonly inputSchema = grepInputSchema;
  public readonly isMutating = false;
  public readonly isConcurrencySafe = true;

  /**
   * Executes the grep content search.
   *
   * @param parameters - Validated parameters containing pattern, path, glob, etc.
   * @param context - The execution context with workingDirectory.
   * @returns A promise resolving to the structured grep output.
   */
  public async execute(
    parameters: z.infer<typeof grepInputSchema>,
    context: ToolExecutionContext,
  ): Promise<GrepOutput> {
    const startTime = Date.now();
    const targetPath = resolvePath(parameters.path, context.workingDirectory);

    if (!existsSync(targetPath)) {
      throw new Error(`Target path not found: ${parameters.path ?? targetPath}`);
    }

    const targetStats = await stat(targetPath);
    const flags = parameters.caseInsensitive ? "i" : "";
    let regex: RegExp;
    try {
      regex = new RegExp(parameters.pattern, flags);
    } catch {
      // Escape special characters if pattern is not valid regex
      const escaped = parameters.pattern.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      regex = new RegExp(escaped, flags);
    }

    const matches: GrepMatch[] = [];
    let isTruncated = false;
    const limit = parameters.headLimit ?? DEFAULT_GREP_LIMIT;

    if (targetStats.isFile()) {
      await this.searchFile(
        targetPath,
        context.workingDirectory,
        regex,
        matches,
        limit,
      );
    } else {
      const filePattern = parameters.glob ?? "**/*";
      const globIterator = glob(filePattern, { cwd: targetPath });

      for await (const entry of globIterator) {
        if (context.abortSignal?.aborted) {
          throw new Error(
            `Grep search aborted: ${context.abortSignal.reason ?? "Aborted by signal"}`,
          );
        }

        const normalized = entry.replace(/\\/g, "/");
        const isExcluded = EXCLUDED_DIRECTORY_SEGMENTS.some((segment) =>
          normalized.split("/").includes(segment),
        );

        if (isExcluded) {
          continue;
        }

        const fullFilePath = resolve(targetPath, entry);
        const fileStat = await stat(fullFilePath).catch(() => null);
        if (!fileStat || !fileStat.isFile()) {
          continue;
        }

        const reachedLimit = await this.searchFile(
          fullFilePath,
          context.workingDirectory,
          regex,
          matches,
          limit,
        );

        if (reachedLimit) {
          isTruncated = true;
          break;
        }
      }
    }

    const durationMs = Date.now() - startTime;

    return {
      pattern: parameters.pattern,
      searchPath: parameters.path ?? ".",
      matches,
      totalMatches: matches.length,
      durationMs,
      isTruncated,
    };
  }

  /**
   * Helper that searches a single file for regex line matches.
   *
   * @param fullFilePath - Absolute path of file to read.
   * @param rootDir - Workspace root for relative path derivation.
   * @param regex - Compiled regex pattern to test against each line.
   * @param matches - Output array to push matching items into.
   * @param limit - Maximum match count.
   * @returns True if limit is reached, false otherwise.
   */
  private async searchFile(
    fullFilePath: string,
    rootDir: string,
    regex: RegExp,
    matches: GrepMatch[],
    limit: number,
  ): Promise<boolean> {
    const lower = fullFilePath.toLowerCase();
    for (const ext of BINARY_EXTENSIONS) {
      if (lower.endsWith(ext)) {
        return false;
      }
    }

    let buffer: Buffer;
    try {
      buffer = await readFile(fullFilePath);
    } catch {
      return false;
    }

    // Skip binary files containing null bytes
    if (buffer.includes(0)) {
      return false;
    }

    const relPath = relative(rootDir, fullFilePath).replace(/\\/g, "/");
    const content = buffer.toString("utf-8");
    const lines = content.split("\n");

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      if (regex.test(line)) {
        matches.push({
          filePath: relPath || fullFilePath,
          lineNumber: i + 1,
          line: line.trimEnd(),
        });

        if (matches.length >= limit) {
          return true;
        }
      }
    }

    return false;
  }
}
