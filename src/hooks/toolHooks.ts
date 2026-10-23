/**
 * @fileoverview Tool authorization hook interface definitions.
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
  /** Active working directory for the thread. */
  readonly workingDirectory: string;
}

/**
 * Authorization decision outcome returned by the product.
 */
export type PermissionDecision =
  | { readonly decision: 'allow' }
  | { readonly decision: 'deny'; readonly reason: string };

/**
 * Hook invoked before tool execution to determine authorization.
 * Allows products to enforce allowlists, denylists, sandboxes, or user prompts.
 * Fail-closed: If this hook is not provided, all tool calls are denied by default.
 */
export type OnAuthorizeToolHook = (
  context: ToolAuthorizeContext,
) => Promise<PermissionDecision> | PermissionDecision;
