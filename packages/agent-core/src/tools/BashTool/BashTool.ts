/**
 * @file BashTool.ts
 * @description Built-in tool for executing shell commands in `@amaranthic/greg-agent-core`.
 * Handles subprocess execution, streaming chunk progress, timeouts, and process cancellation.
 */

import { spawn } from "node:child_process";
import { StringDecoder } from "node:string_decoder";
import { z } from "@amaranthic/greg-sdk";
import type { AgentTool } from "../AgentTool.js";
import type { ToolExecutionContext } from "../ToolExecutionContext.js";
import { getSafeBashEnvironment } from "../internal/pathGuard.js";
import { BASH_DESCRIPTION } from "./prompt.js";

/**
 * Maximum character length captured from stdout/stderr before truncating.
 */
const MAX_BASH_OUTPUT_CHARACTERS = 50000;

/**
 * Default command timeout in milliseconds (60 seconds).
 */
const DEFAULT_BASH_TIMEOUT_MS = 60000;

/**
 * Input parameter schema for BashTool.
 */
export const bashInputSchema = z.object({
  command: z
    .string()
    .describe("The shell command string to execute in the workspace directory."),
  timeoutMs: z
    .number()
    .int()
    .positive()
    .optional()
    .describe(
      "Maximum execution time in milliseconds before terminating the command (defaults to 60000).",
    ),
});

/**
 * Result structure produced by BashTool.
 */
export interface BashOutput {
  readonly command: string;
  readonly stdout: string;
  readonly stderr: string;
  readonly exitCode: number;
  readonly durationMs: number;
  readonly isTruncated: boolean;
}

/**
 * Built-in tool for executing shell commands.
 */
export class BashTool implements AgentTool<typeof bashInputSchema, BashOutput> {
  public static readonly toolName = "bash";

  public readonly name = BashTool.toolName;
  public readonly description = BASH_DESCRIPTION;
  public readonly inputSchema = bashInputSchema;
  public readonly isMutating = true;
  public readonly isConcurrencySafe = false;

  /**
   * Executes a shell command within the workspace directory.
   *
   * @param parameters - Validated parameters containing command and optional timeoutMs.
   * @param context - The execution context with workingDirectory, abortSignal, and emitProgress.
   * @returns A promise resolving to the command execution output.
   */
  public async execute(
    parameters: z.infer<typeof bashInputSchema>,
    context: ToolExecutionContext,
  ): Promise<BashOutput> {
    if (context.abortSignal?.aborted) {
      throw new Error(
        `Command aborted before execution: ${context.abortSignal.reason ?? "Aborted by signal"}`,
      );
    }

    const startTime = Date.now();
    const timeoutMs = parameters.timeoutMs ?? DEFAULT_BASH_TIMEOUT_MS;

    return new Promise<BashOutput>((resolve, reject) => {
      let isSettled = false;
      let stdoutBuffer = "";
      let stderrBuffer = "";
      let isTruncated = false;

      const stdoutDecoder = new StringDecoder("utf-8");
      const stderrDecoder = new StringDecoder("utf-8");

      const child = spawn(parameters.command, {
        shell: true,
        cwd: context.workingDirectory,
        env: getSafeBashEnvironment(),
      });

      const killProcess = (): void => {
        try {
          child.kill("SIGTERM");
          // Escalate to SIGKILL after 2 seconds if still running
          setTimeout(() => {
            if (!child.killed) {
              child.kill("SIGKILL");
            }
          }, 2000).unref();
        } catch {
          // Process may have already exited
        }
      };

      const timer = setTimeout(() => {
        if (!isSettled) {
          isSettled = true;
          killProcess();
          reject(
            new Error(
              `Command timed out after ${timeoutMs}ms: '${parameters.command}'`,
            ),
          );
        }
      }, timeoutMs);

      const handleAbort = (): void => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          killProcess();
          reject(
            new Error(
              `Command aborted: ${context.abortSignal?.reason ?? "Aborted by signal"}`,
            ),
          );
        }
      };

      if (context.abortSignal) {
        context.abortSignal.addEventListener("abort", handleAbort, {
          once: true,
        });
      }

      child.stdout.on("data", (chunk: Buffer) => {
        const text = stdoutDecoder.write(chunk);
        context.emitProgress?.(text);

        if (stdoutBuffer.length + text.length > MAX_BASH_OUTPUT_CHARACTERS) {
          const remaining = MAX_BASH_OUTPUT_CHARACTERS - stdoutBuffer.length;
          if (remaining > 0) {
            stdoutBuffer += text.slice(0, remaining);
          }
          isTruncated = true;
        } else {
          stdoutBuffer += text;
        }
      });

      child.stderr.on("data", (chunk: Buffer) => {
        const text = stderrDecoder.write(chunk);
        context.emitProgress?.(text);

        if (stderrBuffer.length + text.length > MAX_BASH_OUTPUT_CHARACTERS) {
          const remaining = MAX_BASH_OUTPUT_CHARACTERS - stderrBuffer.length;
          if (remaining > 0) {
            stderrBuffer += text.slice(0, remaining);
          }
          isTruncated = true;
        } else {
          stderrBuffer += text;
        }
      });

      child.on("error", (error: Error) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          if (context.abortSignal) {
            context.abortSignal.removeEventListener("abort", handleAbort);
          }
          reject(error);
        }
      });

      child.on("close", (code: number | null) => {
        if (!isSettled) {
          isSettled = true;
          clearTimeout(timer);
          if (context.abortSignal) {
            context.abortSignal.removeEventListener("abort", handleAbort);
          }

          const durationMs = Date.now() - startTime;
          const exitCode = code ?? (child.killed ? 130 : 0);

          stdoutBuffer += stdoutDecoder.end();
          stderrBuffer += stderrDecoder.end();

          if (isTruncated) {
            stdoutBuffer += "\n... [output truncated at 50,000 characters]";
          }

          resolve({
            command: parameters.command,
            stdout: stdoutBuffer,
            stderr: stderrBuffer,
            exitCode,
            durationMs,
            isTruncated,
          });
        }
      });
    });
  }
}
