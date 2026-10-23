/**
 * @fileoverview High-coverage unit tests for the AgentEngine microkernel and turn loop contracts.
 */

import { describe, expect, it } from 'bun:test';
import { z } from 'zod';
import type { ModelMessage } from '../src/index.js';
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
    expect(engine.currentTurn).toBe(1);
    expect(engine.reasoning).toBe('high');
    expect(engine.messages.length).toBe(2);

    const freshEngine = new AgentEngine(createBaseConfig());
    expect(freshEngine.currentTurn).toBe(0);

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

    // Synchronously acquire first turn without iterating
    const turn1 = engine.runTurn('First turn');
    expect(turn1).toBeDefined();

    expect(() => {
      // Calling runTurn should immediately throw synchronously because turn 1 reserved the turn
      engine.runTurn('Concurrent request');
    }).toThrow('already running an active turn');
  });

  it('correctly initializes turnCounter based on historical user messages', () => {
    const history: ModelMessage[] = [
      { role: 'user', content: 'Turn 1 prompt' },
      { role: 'assistant', content: 'Turn 1 answer' },
      { role: 'user', content: 'Turn 2 prompt' },
      { role: 'assistant', content: 'Turn 2 answer' },
    ];
    const engine = new AgentEngine(createBaseConfig(), history);
    expect(engine.currentTurn).toBe(2);
  });

  it('converts registered tools to schema definitions without execute handlers for engine control', () => {
    const registry = new ToolRegistry({ includeDefaults: false });
    registry.register(new MockEchoTool());
    registry.register(new MockMutateTool());

    const definitions = registry.toSdkToolDefinitions();
    expect(Object.keys(definitions)).toEqual(['mockEcho', 'mockMutate']);

    // Definitions should have description and parameters schema, but no execute handler
    expect(definitions.mockEcho?.description).toBe('Echoes input back.');
    expect(definitions.mockEcho?.execute).toBeUndefined();
    expect(definitions.mockMutate?.description).toBe('Mutates a mock file.');
    expect(definitions.mockMutate?.execute).toBeUndefined();
  });

  it('enforces persistence and checkpoint dependency invariants', () => {
    // Ephemeral by default: checkpoint forced to false
    const engine1 = new AgentEngine(createBaseConfig({ checkpoint: true }));
    expect(engine1.isPersisted).toBe(false);
    expect(engine1.isCheckpointEnabled).toBe(false);
    expect(engine1.threadStore).toBeUndefined();
    expect(engine1.checkpointStore).toBeUndefined();

    // Persisted engine with checkpoints enabled
    const engine2 = new AgentEngine(createBaseConfig({ persist: true, checkpoint: true }));
    expect(engine2.isPersisted).toBe(true);
    expect(engine2.isCheckpointEnabled).toBe(true);
    expect(engine2.threadStore).toBeDefined();
    expect(engine2.checkpointStore).toBeDefined();
  });

  it('preserves hook lifecycle dispatch interfaces', () => {
    const callLog: string[] = [];

    const hooks: AgentHooks = {
      onPreTurn: (context) => {
        callLog.push(`preTurn:${context.turnIndex}`);
        return { injectedInstructions: 'Be concise.' };
      },
      onAuthorizeTool: (context) => {
        callLog.push(`authorize:${context.toolName}`);
        return { decision: 'allow' };
      },
      onShouldStop: (context) => {
        callLog.push(`shouldStop:${context.finishReason}`);
        return { shouldStop: true };
      },
      onPostTurn: (context) => {
        callLog.push(`postTurn:${context.finishReason}`);
      },
      onError: (context) => {
        callLog.push(`error:${context.origin}`);
      },
    };

    const engine = new AgentEngine(createBaseConfig({ hooks }));
    expect(engine).toBeDefined();

    // Verify hooks are callable according to their contracts
    hooks.onPreTurn!({ turnIndex: 1, userPrompt: 'Hello' });
    hooks.onAuthorizeTool!({
      toolName: 'mockMutate',
      parameters: { filePath: 'foo.ts', data: 'test' },
      workingDirectory: '/tmp',
    });
    hooks.onShouldStop!({
      turnIndex: 1,
      finishReason: 'completed',
    });
    hooks.onPostTurn!({
      turnIndex: 1,
      finishReason: 'completed',
      totalUsage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 },
    });
    hooks.onError!({
      error: new Error('test failure'),
      origin: 'engine',
      turnIndex: 1,
      isFatal: false,
    });

    expect(callLog).toEqual([
      'preTurn:1',
      'authorize:mockMutate',
      'shouldStop:completed',
      'postTurn:completed',
      'error:engine',
    ]);
  });

  it('rejects provider override when matching per-turn credentials are missing', async () => {
    const engine = new AgentEngine(
      createBaseConfig({
        model: 'anthropic/claude-3-7-sonnet',
        apiKey: 'anthropic-key',
        baseUrl: 'https://api.anthropic.com/v1',
      }),
    );

    const turnEvents = engine.runTurn({
      userPrompt: 'Test provider mismatch',
      model: 'google/gemini-2.5-flash-lite',
      // Missing per-turn apiKey and baseUrl for google
    });

    const events: any[] = [];
    for await (const event of turnEvents) {
      events.push(event);
    }

    const errorEvent = events.find((e) => e.type === 'error');
    expect(errorEvent).toBeDefined();
    expect(errorEvent.error.message).toContain('Falling back across different providers is forbidden');

    const finishEvent = events.find((e) => e.type === 'turnFinished');
    expect(finishEvent).toBeDefined();
    expect(finishEvent.finishReason).toBe('error');
  });

  it('honors pre-turn hook veto without appending user messages or starting model steps', async () => {
    const engine = new AgentEngine(
      createBaseConfig({
        hooks: {
          onPreTurn: () => ({
            veto: true,
            vetoReason: 'User rate limit exceeded',
          }),
        },
      }),
    );

    const events: any[] = [];
    for await (const event of engine.runTurn('Forbidden prompt')) {
      events.push(event);
    }

    expect(events.map((e) => e.type)).toEqual(['turnStarted', 'turnFinished']);
    const finishEvent = events.find((e) => e.type === 'turnFinished');
    expect(finishEvent.finishReason).toBe('vetoed');
    // Ensure message history was NOT touched
    expect(engine.messages.length).toBe(0);
  });

  it('exposes direct convenience methods for checkpoints, metadata, and transcripts', async () => {
    const threadId = `th_convenience_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const engine = new AgentEngine(
      createBaseConfig({
        threadId,
        persist: true,
        checkpoint: true,
      }),
    );

    // Checkpoints list returns empty array for new thread
    const checkpoints = await engine.listCheckpoints();
    expect(checkpoints.length).toBe(0);

    // Transcript returns empty array for new thread
    const transcript = await engine.getTranscript();
    expect(transcript.length).toBe(0);

    // Manual checkpoint creation directly via engine
    const createdCheckpoint = await engine.createCheckpoint({
      label: 'Manual snapshot alpha',
      files: ['src/index.ts'],
    });
    expect(createdCheckpoint.id).toBeDefined();
    expect(createdCheckpoint.files.length).toBe(1);

    const updatedCheckpoints = await engine.listCheckpoints();
    expect(updatedCheckpoints.length).toBe(1);
    expect(updatedCheckpoints[0]?.id).toBe(createdCheckpoint.id);
  });
});
