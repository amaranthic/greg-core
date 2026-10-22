/**
 * @fileoverview Tool invocation, permission, and execution event definitions.
 * @packageDocumentation
 */

/**
 * Event emitted when the model proposes a tool invocation with parsed arguments.
 */
export interface ToolCallProposedEvent {
  /** Discriminant event type. */
  readonly type: 'toolCallProposed';
  /** Unique identifier for the proposed tool call. */
  readonly callId: string;
  /** Name of the tool to be executed. */
  readonly toolName: string;
  /** Parsed arguments supplied by the model. */
  readonly parameters: unknown;
}

/**
 * Event emitted when a tool invocation requires permission authorization from the product or user.
 */
export interface ToolPermissionRequestedEvent {
  /** Discriminant event type. */
  readonly type: 'toolPermissionRequested';
  /** Unique identifier for the tool call under authorization. */
  readonly callId: string;
  /** Name of the tool requiring authorization. */
  readonly toolName: string;
  /** Parameters passed to the tool. */
  readonly parameters: unknown;
  /** Whether the tool potentially mutates files or host environment state. */
  readonly isMutating: boolean;
  /** Callback to resolve authorization from the product. */
  readonly resolve: (decision: 'allow' | 'deny' | 'allowAlways') => void;
}

/**
 * Event emitted after a tool permission check has been resolved.
 */
export interface ToolPermissionResolvedEvent {
  /** Discriminant event type. */
  readonly type: 'toolPermissionResolved';
  /** Unique identifier for the tool call. */
  readonly callId: string;
  /** Name of the tool. */
  readonly toolName: string;
  /** Outcome of the permission authorization check. */
  readonly decision: 'allow' | 'deny' | 'allowAlways';
}

/**
 * Event emitted immediately before a tool starts executing on the host.
 */
export interface ToolExecutionStartedEvent {
  /** Discriminant event type. */
  readonly type: 'toolExecutionStarted';
  /** Unique identifier for the tool call. */
  readonly callId: string;
  /** Name of the tool being executed. */
  readonly toolName: string;
  /** Millisecond epoch timestamp when execution started. */
  readonly timestamp: number;
}

/**
 * Event emitted for streaming incremental progress output during tool execution.
 */
export interface ToolExecutionDeltaEvent {
  /** Discriminant event type. */
  readonly type: 'toolExecutionDelta';
  /** Unique identifier for the tool call. */
  readonly callId: string;
  /** Name of the tool producing output. */
  readonly toolName: string;
  /** Incremental output chunk (e.g. stdout or status delta). */
  readonly chunk: string;
}

/**
 * Event emitted when a tool finishes execution, yielding data or failure details.
 */
export interface ToolExecutionFinishedEvent {
  /** Discriminant event type. */
  readonly type: 'toolExecutionFinished';
  /** Unique identifier for the tool call. */
  readonly callId: string;
  /** Name of the tool that executed. */
  readonly toolName: string;
  /** Execution output or structured return payload. */
  readonly result: unknown;
  /** Whether the tool finished in an error state. */
  readonly isError: boolean;
  /** Total wall-clock execution duration in milliseconds. */
  readonly durationMs: number;
}
