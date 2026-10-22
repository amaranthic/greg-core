/**
 * @file AgentTool.ts
 * @description Core tool interface defining the first-class contract for all tools
 * in the `@amaranthic/greg-agent-core` microkernel.
 */

import type { z } from "@amaranthic/greg-sdk";
import type { ToolExecutionContext } from "./ToolExecutionContext.js";

/**
 * Universal interface contract for tools operating inside `@amaranthic/greg-agent-core`.
 *
 * @typeParam TInput - The Zod schema type defining and validating input parameters.
 * @typeParam TOutput - The return type produced upon successful tool execution.
 *
 * @example
 * ```typescript
 * import { z } from "@amaranthic/greg-sdk";
 * import type { AgentTool, ToolExecutionContext } from "@amaranthic/greg-agent-core";
 *
 * export class PingTool implements AgentTool<typeof PingTool.schema, { pong: boolean }> {
 *   public static readonly schema = z.object({
 *     message: z.string().describe("Message to echo back"),
 *   });
 *
 *   public readonly name = "ping";
 *   public readonly description = "Test tool responding with pong";
 *   public readonly inputSchema = PingTool.schema;
 *   public readonly isMutating = false;
 *   public readonly isConcurrencySafe = true;
 *
 *   public async execute(
 *     parameters: z.infer<typeof PingTool.schema>,
 *     context: ToolExecutionContext,
 *   ): Promise<{ pong: boolean }> {
 *     return { pong: true };
 *   }
 * }
 * ```
 */
export interface AgentTool<
  TInput extends z.ZodTypeAny = z.ZodTypeAny,
  TOutput = unknown,
> {
  /**
   * Unique name of the tool exposed to the language model (e.g. 'readFile', 'bash').
   * Must follow strict camelCase or PascalCase conventions.
   */
  readonly name: string;

  /**
   * Detailed instruction prompt and description provided directly to the model
   * to guide parameter formulation and tool selection.
   */
  readonly description: string;

  /**
   * Declarative Zod schema used for runtime parameter parsing, validation,
   * and automatic JSON Schema derivation for model function calling.
   */
  readonly inputSchema: TInput;

  /**
   * REQUIRED: Specifies whether this tool mutates persistent state (file modifications,
   * git commits, process creation, network side-effects).
   *
   * When `true`, the engine automatically initiates checkpointing and triggers
   * inward permission authorization hooks (`onAuthorizeTool`).
   */
  readonly isMutating: boolean;

  /**
   * REQUIRED: Specifies whether multiple concurrent executions of this tool can safely
   * run in parallel without race conditions or resource corruption.
   *
   * When `true`, parallel tool calls can proceed simultaneously.
   * When `false`, the engine routes the invocation through `ToolExecutionQueue` to guarantee
   * serial execution.
   */
  readonly isConcurrencySafe: boolean;

  /**
   * Executes the tool logic using validated parameters and the current execution context.
   *
   * @param parameters - The validated parameters inferred from the tool's input schema.
   * @param context - Execution context containing thread ID, working directory, and signals.
   * @returns A promise resolving to the tool output data.
   */
  execute(
    parameters: z.infer<TInput>,
    context: ToolExecutionContext,
  ): Promise<TOutput>;
}
