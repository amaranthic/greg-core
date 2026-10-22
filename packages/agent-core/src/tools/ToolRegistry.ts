/**
 * @file ToolRegistry.ts
 * @description Centralized registry managing built-in and external tools in `@amaranthic/greg-agent-core`.
 * Handles registration, lookups, concurrency serialization, and native AI SDK v7 tool bridging.
 */

import { randomUUID } from "node:crypto";
import { type Tool, tool } from "@amaranthic/greg-sdk";
import type { AgentTool } from "./AgentTool.js";
import { BashTool } from "./BashTool/index.js";
import { EditFileTool } from "./EditFileTool/index.js";
import { GlobTool } from "./GlobTool/index.js";
import { GrepTool } from "./GrepTool/index.js";
import { ReadFileTool } from "./ReadFileTool/index.js";
import type { ToolExecutionContext } from "./ToolExecutionContext.js";
import { ToolExecutionQueue } from "./ToolExecutionQueue.js";
import { WriteFileTool } from "./WriteFileTool/index.js";

/**
 * Configuration options when instantiating a `ToolRegistry`.
 */
export interface ToolRegistryOptions {
  /**
   * Whether to automatically register the 6 standard built-in tools
   * (readFile, writeFile, editFile, bash, glob, grep). Defaults to true.
   */
  readonly includeDefaults?: boolean;
}

/**
 * Context configuration options provided when adapting registry tools
 * for AI SDK v7 execution.
 */
export interface SdkToolAdapterOptions {
  /**
   * The thread session identifier.
   */
  readonly threadId: string;

  /**
   * The active workspace working directory.
   */
  readonly workingDirectory: string;

  /**
   * Shared abort signal for thread cancellation.
   */
  readonly abortSignal?: AbortSignal;

  /**
   * Optional callback to receive streaming execution progress chunks.
   *
   * @param chunk - Output delta chunk emitted by a tool.
   * @param toolName - Name of the tool emitting the chunk.
   */
  readonly onProgress?: (chunk: string, toolName: string) => void;
}

/**
 * Central tool registry managing discovery, validation, and AI SDK adaptation.
 *
 * @example
 * ```typescript
 * const registry = new ToolRegistry();
 * registry.register(new CustomDockerTool());
 *
 * const sdkTools = registry.toSdkTools({
 *   threadId: "thr_123",
 *   workingDirectory: process.cwd(),
 * });
 * ```
 */
export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool>();
  private readonly executionQueue = new ToolExecutionQueue();

  /**
   * Constructs a new ToolRegistry instance, optionally pre-loading built-in tools.
   *
   * @param options - Optional registry configuration options.
   */
  public constructor(options?: ToolRegistryOptions) {
    const includeDefaults = options?.includeDefaults ?? true;
    if (includeDefaults) {
      this.registerDefaultTools();
    }
  }

  /**
   * Registers a tool instance into the registry. If a tool with the same name exists,
   * it is replaced.
   *
   * @param agentTool - The AgentTool instance to register.
   */
  public register(agentTool: AgentTool): void {
    this.tools.set(agentTool.name, agentTool);
  }

  /**
   * Unregisters a tool by name.
   *
   * @param name - The unique name of the tool to remove.
   * @returns True if a tool was found and removed, false otherwise.
   */
  public unregister(name: string): boolean {
    return this.tools.delete(name);
  }

  /**
   * Resolves a registered tool by its name.
   *
   * @param name - The unique name of the tool to look up.
   * @returns The AgentTool instance, or undefined if not registered.
   */
  public resolve(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Checks whether a tool with the given name is currently registered.
   *
   * @param name - The tool name to check.
   * @returns True if registered, false otherwise.
   */
  public has(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Returns a snapshot array of all currently registered tools.
   *
   * @returns Readonly array of AgentTool instances.
   */
  public list(): readonly AgentTool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Determines if a registered tool is marked as mutating.
   *
   * @param name - Name of the tool to inspect.
   * @returns True if the tool is mutating, false if read-only or unknown.
   */
  public isMutating(name: string): boolean {
    const agentTool = this.tools.get(name);
    return agentTool ? agentTool.isMutating : false;
  }

  /**
   * Determines if a registered tool is marked as concurrency-safe.
   *
   * @param name - Name of the tool to inspect.
   * @returns True if concurrency-safe, false if non-concurrency-safe or unknown.
   */
  public isConcurrencySafe(name: string): boolean {
    const agentTool = this.tools.get(name);
    return agentTool ? agentTool.isConcurrencySafe : false;
  }

  /**
   * Converts all registered tools into native Vercel AI SDK v7 `Tool` definitions
   * compatible with `streamText({ tools })` and `generateText({ tools })`.
   *
   * Automatically wires concurrency queuing for non-concurrency-safe tools,
   * races against abort signals, and structures errors for LLM self-correction.
   *
   * @param options - Context options including threadId and workingDirectory.
   * @returns A map of tool names to AI SDK v7 `Tool` objects.
   */
  public toSdkTools(
    options: SdkToolAdapterOptions,
  ): Record<string, Tool> {
    const sdkTools: Record<string, Tool> = {};

    for (const agentTool of this.tools.values()) {
      sdkTools[agentTool.name] = tool({
        description: agentTool.description,
        inputSchema: agentTool.inputSchema as any,
        execute: async (
          rawArgs: unknown,
          execOptions?: { abortSignal?: AbortSignal; toolCallId?: string },
        ) => {
          const effectiveSignal = execOptions?.abortSignal ?? options.abortSignal;
          const toolCallId = execOptions?.toolCallId ?? randomUUID();

          const executionContext: ToolExecutionContext = {
            threadId: options.threadId,
            toolCallId,
            workingDirectory: options.workingDirectory,
            abortSignal: effectiveSignal,
            emitProgress: options.onProgress
              ? (chunk: string) => {
                  options.onProgress?.(chunk, agentTool.name);
                }
              : undefined,
          };

          const runTool = async (): Promise<unknown> => {
            try {
              // Parse through the tool's input schema
              const parsedParameters = agentTool.inputSchema.parse(rawArgs);
              return await agentTool.execute(parsedParameters, executionContext);
            } catch (error) {
              const errorMessage =
                error instanceof Error ? error.message : String(error);
              return {
                isError: true,
                error: errorMessage,
              };
            }
          };

          if (agentTool.isConcurrencySafe) {
            return await runTool();
          }

          return await this.executionQueue.run(runTool, effectiveSignal);
        },
      });
    }

    return sdkTools;
  }

  /**
   * Populates the registry with the default suite of 6 core agent tools.
   */
  private registerDefaultTools(): void {
    this.register(new ReadFileTool());
    this.register(new WriteFileTool());
    this.register(new EditFileTool());
    this.register(new BashTool());
    this.register(new GlobTool());
    this.register(new GrepTool());
  }
}
