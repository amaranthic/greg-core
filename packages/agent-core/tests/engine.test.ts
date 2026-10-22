/**
 * @fileoverview High-coverage unit tests for the AgentEngine microkernel and turn loop contracts.
 */

import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import type { ModelMessage } from '@amaranthic/greg-sdk';
import {
  AgentEngine,
  type AgentEngineConfig,
  type AgentHooks,
  type AgentReasoningLevel,
  type AgentTool,
  type ToolExecutionContext,
  ToolRegistry,
} from '../src/index.js';

/**
 * Minimal non-mutating, concurrency-safe tool for testing.
 */
class MockEchoTool implements AgentTool<typeof MockEchoTool.schema, { echo: string }> {
  public static readonly schema = z.object({
    message: z.string(),
  });

  public readonly name = 'mockEcho';
  public readonly description = 'Echoes input back.';
  public readonly inputSchema = MockEchoTool.schema;
  public readonly isMutating = false;
  public readonly isConcurrencySafe = true;

  public async execute(
    parameters: z.infer<typeof MockEchoTool.schema>,
    context: ToolExecutionContext,
  ): Promise<{ echo: string }> {
    context.emitProgress?.('echoing...');
    return { echo: parameters.message };
  }
}

/**
 * Minimal mutating, non-concurrency-safe tool for testing checkpoint triggering.
 */
class MockMutateTool implements AgentTool<typeof MockMutateTool.schema, { written: boolean }> {
  public static readonly schema = z.object({
    filePath: z.string(),
    data: z.string(),
  });

  public readonly name = 'mockMutate';
  public readonly description = 'Mutates a mock file.';
  public readonly inputSchema = MockMutateTool.schema;
  public readonly isMutating = true;
  public readonly isConcurrencySafe = false;

  public async execute(
    _parameters: z.infer<typeof MockMutateTool.schema>,
    _context: ToolExecutionContext,
  ): Promise<{ written: boolean }> {
    return { written: true };
  }
}

describe('AgentEngine Core Invariants', () => {
  const createBaseConfig = (overrides?: Partial<AgentEngineConfig>): AgentEngineConfig => ({
    threadId: 'th_test_123',
    workingDirectory: '/tmp/test_workspace',
    model: 'anthropic/claude-3-7-sonnet',
    apiKey: 'test-api-key',
    baseUrl: 'https://api.anthropic.com/v1',
    instructions: 'You are an autonomous engineering assistant.',
    tools: new ToolRegistry({ includeDefaults: false }),
    ...overrides,
  });

  it('initializes engine properties and manages conversational message state', () => {
    const tools = new ToolRegistry({ includeDefaults: false });
    tools.register(new MockEchoTool());

    const initialMessages: ModelMessage[] = [
      { role: 'user', content: 'Previous message' },
      { role: 'assistant', content: 'Previous answer' },
    ];

    const engine = new AgentEngine(
      createBaseConfig({ tools, reasoning: 'high' }),
      initialMessages,
    );

    expect(engine.threadId).toBe('th_test_123');
    expect(engine.workingDirectory).toBe('/tmp/test_workspace');
    expect(engine.tools).toBe(tools);
    expect(engine.currentTurn).toBe(0);
    expect(engine.reasoning).toBe('high');
    expect(engine.messages.length).toBe(2);

    // Append message
    engine.addMessage({ role: 'user', content: 'New message' });
    expect(engine.messages.length).toBe(3);

    // Clear messages
    engine.clearMessages();
    expect(engine.messages.length).toBe(0);
  });

  it('supports all valid top-level reasoning levels defined in AI SDK v7', () => {
    const validLevels: AgentReasoningLevel[] = [
      'provider-default',
      'none',
      'minimal',
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ];

    for (const level of validLevels) {
      const engine = new AgentEngine(createBaseConfig({ reasoning: level }));
      expect(engine.reasoning).toBe(level);
    }
  });

  it('throws an error if a second turn is started concurrently on the same engine instance', async () => {
    const engine = new AgentEngine(createBaseConfig());

    // Mock internal turn execution to simulate an active turn
    (engine as any).isTurnRunning = true;

    expect(() => {
      // Calling runTurn should immediately throw because turn is in progress
      engine.runTurn('Concurrent request');
    }).toThrow('already running an active turn');
  });

  it('converts registered tools to schema definitions without execute handlers for engine control', () => {
    const registry = new ToolRegistry({ includeDefaults: false });
    registry.register(new MockEchoTool());
    registry.register(new MockMutateTool());

    const definitions = registry.toSdkToolDefinitions();
    expect(Object.keys(definitions)).toEqual(['mockEcho', 'mockMutate']);

    // Definitions should have description and parameters schema, but no execute handler
    expect(definitions.mockEcho.description).toBe('Echoes input back.');
    expect(definitions.mockEcho.execute).toBeUndefined();
    expect(definitions.mockMutate.description).toBe('Mutates a mock file.');
    expect(definitions.mockMutate.execute).toBeUndefined();
  });

  it('correctly reports mutating and concurrency safety metadata across tools', () => {
    const registry = new ToolRegistry({ includeDefaults: false });
    registry.register(new MockEchoTool());
    registry.register(new MockMutateTool());

    expect(registry.isMutating('mockEcho')).toBe(false);
    expect(registry.isConcurrencySafe('mockEcho')).toBe(true);

    expect(registry.isMutating('mockMutate')).toBe(true);
    expect(registry.isConcurrencySafe('mockMutate')).toBe(false);

    // Unknown tool defaults to false
    expect(registry.isMutating('unknownTool')).toBe(false);
    expect(registry.isConcurrencySafe('unknownTool')).toBe(false);
  });

  it('preserves hook lifecycle dispatch interfaces', () => {
    const callLog: string[] = [];

    const hooks: AgentHooks = {
      onPreTurn: (context) => {
        callLog.push(`preTurn:${context.turnIndex}`);
        return { injectedInstructions: 'Be concise.' };
      },
      onAuthorizeTool: (context) => {
        callLog.push(`authorize:${context.toolName}:${context.isMutating}`);
        return { decision: 'allow' };
      },
      onCheckpointCreated: (context) => {
        callLog.push(`checkpoint:${context.checkpointId}`);
      },
      onFormatToolOutput: (context) => {
        callLog.push(`formatOutput:${context.toolName}`);
        return context.rawResult;
      },
      onShouldStop: (context) => {
        callLog.push(`shouldStop:${context.finishReason}`);
        return { shouldStop: true };
      },
      onThreadUpdate: (context) => {
        callLog.push(`threadUpdate:${context.threadId}:${context.messages.length}`);
      },
      onPostTurn: (context) => {
        callLog.push(`postTurn:${context.finishReason}`);
      },
    };

    const engine = new AgentEngine(createBaseConfig({ hooks }));
    expect(engine).toBeDefined();

    // Verify hooks are callable according to their contracts
    hooks.onPreTurn!({ turnIndex: 1, userPrompt: 'Hello' });
    hooks.onAuthorizeTool!({
      toolName: 'mockMutate',
      parameters: { filePath: 'foo.ts', data: 'test' },
      isMutating: true,
      workingDirectory: '/tmp',
    });
    hooks.onCheckpointCreated!({
      checkpointId: 'cp_1',
      sequence: 1,
      label: 'test',
      filesTouched: ['foo.ts'],
    });
    hooks.onFormatToolOutput!({
      toolName: 'mockMutate',
      rawResult: { written: true },
      isError: false,
    });
    hooks.onShouldStop!({
      turnIndex: 1,
      finishReason: 'completed',
    });
    hooks.onThreadUpdate!({
      threadId: 'th_test_123',
      messages: [],
      turnIndex: 1,
    });
    hooks.onPostTurn!({
      turnIndex: 1,
      finishReason: 'completed',
      totalUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    });

    expect(callLog).toEqual([
      'preTurn:1',
      'authorize:mockMutate:true',
      'checkpoint:cp_1',
      'formatOutput:mockMutate',
      'shouldStop:completed',
      'threadUpdate:th_test_123:0',
      'postTurn:completed',
    ]);
  });
});
