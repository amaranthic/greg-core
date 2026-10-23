/**
 * @fileoverview Complete event definitions and discriminated union for the agent event stream.
 * @packageDocumentation
 */

import type { ThoughtDeltaEvent, TokenDeltaEvent } from './streamEvents.js';
import type {
  ToolCallProposedEvent,
  ToolExecutionDeltaEvent,
  ToolExecutionFinishedEvent,
  ToolExecutionStartedEvent,
} from './toolEvents.js';
import type {
  StepFinishedEvent,
  StepStartedEvent,
  TurnFinishedEvent,
  TurnStartedEvent,
} from './stepEvents.js';
import type {
  CheckpointCreatedEvent,
  CheckpointRestoredEvent,
} from './checkpointEvents.js';
import type { ErrorEvent, RetryScheduledEvent } from './errorEvents.js';

export type {
  TokenDeltaEvent,
  ThoughtDeltaEvent,
} from './streamEvents.js';

export type {
  ToolCallProposedEvent,
  ToolExecutionStartedEvent,
  ToolExecutionDeltaEvent,
  ToolExecutionFinishedEvent,
} from './toolEvents.js';

export type {
  StepTokenUsage,
  TurnFinishReason,
  TurnStartedEvent,
  StepStartedEvent,
  StepFinishedEvent,
  TurnFinishedEvent,
} from './stepEvents.js';

export type {
  CheckpointCreatedEvent,
  CheckpointRestoredEvent,
} from './checkpointEvents.js';

export type {
  ErrorOrigin,
  RetryScheduledEvent,
  ErrorEvent,
} from './errorEvents.js';

/**
 * Discriminated union of all events emitted by the AgentEngine turn stream.
 *
 * @example
 * ```typescript
 * for await (const event of thread.run('Refactor database client')) {
 *   switch (event.type) {
 *     case 'tokenDelta':
 *       process.stdout.write(event.text);
 *       break;
 *     case 'toolCallProposed':
 *       console.log(`Tool call: ${event.toolName}`);
 *       break;
 *     case 'checkpointCreated':
 *       console.log(`Saved checkpoint: ${event.checkpointId}`);
 *       break;
 *   }
 * }
 * ```
 */
export type AgentEvent =
  | TokenDeltaEvent
  | ThoughtDeltaEvent
  | ToolCallProposedEvent
  | ToolExecutionStartedEvent
  | ToolExecutionDeltaEvent
  | ToolExecutionFinishedEvent
  | TurnStartedEvent
  | StepStartedEvent
  | StepFinishedEvent
  | TurnFinishedEvent
  | CheckpointCreatedEvent
  | CheckpointRestoredEvent
  | RetryScheduledEvent
  | ErrorEvent;
