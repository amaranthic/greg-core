/**
 * @fileoverview Stateful microkernel class orchestrating turns, tools, and lifecycle hooks.
 * @packageDocumentation
 */

import type { ModelMessage } from '@amaranthic/greg-sdk';
import type { AgentEvent } from '../events/index.js';
import type { AgentReasoningLevel } from '../thread/index.js';
import type { ToolRegistry } from '../tools/index.js';
import type { AgentEngineConfig, RunTurnOptions } from './engineConfig.js';
import { runTurn } from './runTurn.js';

/**
 * The core agent engine microkernel.
 *
 * Encapsulates thread state, conversational message history, tool registry access,
 * and autonomous multi-step turn execution.
 *
 * @example
 * ```typescript
 * const engine = new AgentEngine({
 *   threadId: 'th_development',
 *   workingDirectory: process.cwd(),
 *   model: 'anthropic/claude-3-7-sonnet',
 *   apiKey: process.env.ANTHROPIC_API_KEY!,
 *   baseUrl: 'https://api.anthropic.com/v1',
 *   tools: new ToolRegistry(),
 *   reasoning: 'high',
 * });
 *
 * for await (const event of engine.runTurn('Inspect package.json and summarize scripts')) {
 *   if (event.type === 'tokenDelta') {
 *     process.stdout.write(event.text);
 *   }
 * }
 * ```
 */
export class AgentEngine {
  private readonly config: AgentEngineConfig;
  private readonly conversationMessages: ModelMessage[];
  private turnCounter = 0;
  private isTurnRunning = false;

  /**
   * Instantiates a new AgentEngine.
   *
   * @param config - Static engine configuration options.
   * @param initialMessages - Optional previous conversation messages to seed or resume the session.
   */
  public constructor(
    config: AgentEngineConfig,
    initialMessages?: readonly ModelMessage[],
  ) {
    this.config = config;
    this.conversationMessages = initialMessages ? [...initialMessages] : [];
    this.turnCounter = this.conversationMessages.filter(
      (m) => m.role === 'user',
    ).length;
  }

  /**
   * Gets the thread session identifier.
   */
  public get threadId(): string {
    return this.config.threadId;
  }

  /**
   * Gets the active workspace root directory path.
   */
  public get workingDirectory(): string {
    return this.config.workingDirectory;
  }

  /**
   * Gets the tool registry bound to this engine instance.
   */
  public get tools(): ToolRegistry {
    return this.config.tools;
  }

  /**
   * Gets a readonly snapshot of the current conversational messages.
   */
  public get messages(): readonly ModelMessage[] {
    return [...this.conversationMessages];
  }

  /**
   * Gets the number of completed or executed turns in this session.
   */
  public get currentTurn(): number {
    return this.turnCounter;
  }

  /**
   * Gets the top-level reasoning level configured on the engine, if any.
   */
  public get reasoning(): AgentReasoningLevel | undefined {
    return this.config.reasoning;
  }

  /**
   * Appends an external message into the conversation history.
   *
   * @param message - The ModelMessage to append.
   */
  public addMessage(message: ModelMessage): void {
    if (this.isTurnRunning) {
      throw new Error(
        'Cannot add messages to conversation history while an active turn is running.',
      );
    }
    this.conversationMessages.push(message);
  }

  /**
   * Clears all conversational messages from the active thread history.
   */
  public clearMessages(): void {
    if (this.isTurnRunning) {
      throw new Error(
        'Cannot clear conversation messages while an active turn is running.',
      );
    }
    this.conversationMessages.length = 0;
  }

  /**
   * Executes a single autonomous agent turn.
   *
   * Supports passing a simple prompt string or a full `RunTurnOptions` object
   * for fine-grained per-turn overrides (e.g. reasoning, maxSteps, custom instructions).
   *
   * @param promptOrOptions - User prompt string or full turn execution options.
   * @returns An async generator yielding stream deltas, tool lifecycle, and turn events.
   * @throws Error if another turn is currently running on this engine instance.
   */
  public runTurn(
    promptOrOptions: string | RunTurnOptions,
  ): AsyncGenerator<AgentEvent, void, void> {
    if (this.isTurnRunning) {
      throw new Error(
        `AgentEngine for thread "${this.threadId}" is already running an active turn. Simultaneous turns on a single engine instance are not permitted.`,
      );
    }

    this.isTurnRunning = true;
    this.turnCounter++;

    const options: RunTurnOptions =
      typeof promptOrOptions === 'string'
        ? {
            userPrompt: promptOrOptions,
            turnIndex: this.turnCounter,
          }
        : {
            ...promptOrOptions,
            turnIndex: promptOrOptions.turnIndex ?? this.turnCounter,
          };

    return this.executeTurn(options);
  }

  /**
   * Internal generator driving turn execution and tracking concurrency state.
   */
  private async *executeTurn(
    options: RunTurnOptions,
  ): AsyncGenerator<AgentEvent, void, void> {
    try {
      yield* runTurn(this.config, options, this.conversationMessages);
    } finally {
      this.isTurnRunning = false;
    }
  }
}
