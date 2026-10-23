/**
 * @fileoverview Universal interface contract for tools operating inside Hernex.
 * @packageDocumentation
 */

import type { z } from "zod";
import type { ToolExecutionContext } from "./ToolExecutionContext.js";

/**
 * Universal interface contract for tools operating inside Hernex.
 *
 * @typeParam TInput - The Zod schema type defining and validating input parameters.
 * @typeParam TOutput - The return type produced upon successful tool execution.
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
