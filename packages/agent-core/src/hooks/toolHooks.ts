/**
 * @fileoverview Tool authorization and I/O formatting hook interface definitions.
 * @packageDocumentation
 */

/**
 * Context provided when authorizing a proposed tool call.
 */
export interface ToolAuthorizeContext {
  /** Name of the tool requesting execution. */
  readonly toolName: string;
  /** Parameters supplied by the model for the tool call. */
  readonly parameters: unknown;
  /** Whether the tool is marked as mutating files or environment. */
  readonly isMutating: boolean;
  /** Active working directory for the thread. */
  readonly workingDirectory: string;
}

/**
 * Authorization decision outcome returned by the product.
 */
export type PermissionDecision =
  | { readonly decision: 'allow' }
  | { readonly decision: 'deny'; readonly reason: string }
  | { readonly decision: 'askUser' };

/**
 * Hook invoked before tool execution to determine authorization.
 * Allows products to enforce allowlists, denylists, sandboxes, or user prompts.
 */
export type OnAuthorizeToolHook = (
  context: ToolAuthorizeContext,
) => Promise<PermissionDecision> | PermissionDecision;

/**
 * Context provided when formatting tool input parameters.
 */
export interface ToolInputFormatContext {
  /** Name of the tool being called. */
  readonly toolName: string;
  /** Raw parameters provided by the model. */
  readonly parameters: unknown;
}

/**
 * Hook invoked to format or sanitize tool input parameters before display or logging.
 */
export type OnFormatToolInputHook = (
  context: ToolInputFormatContext,
) => Promise<unknown> | unknown;

/**
 * Context provided when formatting tool output before adding to transcript.
 */
export interface ToolOutputFormatContext {
  /** Name of the tool that executed. */
  readonly toolName: string;
  /** Raw result returned by the tool execution. */
  readonly rawResult: unknown;
  /** Whether the tool execution resulted in an error. */
  readonly isError: boolean;
}

/**
 * Hook invoked to transform or truncate tool output data before adding to transcript.
 */
export type OnFormatToolOutputHook = (
  context: ToolOutputFormatContext,
) => Promise<unknown> | unknown;
