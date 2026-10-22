/**
 * @fileoverview Autonomous turn loop async generator driving multi-step model and tool execution.
 * @packageDocumentation
 */

import { randomUUID } from 'node:crypto';
import { streamText, type GregStreamTextOptions, type ModelMessage } from '@amaranthic/greg-sdk';
import type { AgentEvent } from '../events/index.js';
import type { StepTokenUsage, TurnFinishReason } from '../events/stepEvents.js';
import type { ToolExecutionContext } from '../tools/ToolExecutionContext.js';
import type { AgentEngineConfig, RunTurnOptions } from './engineConfig.js';
import { AsyncEventQueue } from './eventQueue.js';

/**
 * Executes a single autonomous agent turn, yielding streaming events in a strict lifecycle sequence.
 *
 * Sequence:
 * 1. Emit `turnStarted` event.
 * 2. Invoke `hooks.onPreTurn()` and await product modifications.
 * 3. Append user message to thread conversation history.
 * 4. Autonomous step loop:
 *    a. Check maxSteps and abort signals.
 *    b. Emit `stepStarted` event.
 *    c. Call `streamText()` with model instructions, messages, and adapted tool definitions.
 *    d. Stream chunks: `text-delta` -> `tokenDelta`, `reasoning-delta` -> `thoughtDelta`, `tool-call` -> `toolCallProposed`.
 *    e. Append assistant response message to conversation history.
 *    f. If no tool calls were proposed:
 *       - Invoke `hooks.onShouldStop()`.
 *       - If shouldStop is false: append reminder prompt, emit `stepFinished`, call `hooks.onThreadUpdate()`, and continue.
 *       - If shouldStop is true: emit `stepFinished`, emit `turnFinished`, call `hooks.onThreadUpdate()`, and break.
 *    g. If tool calls were proposed:
 *       - For each tool call:
 *         i. Call `hooks.onAuthorizeTool()`. If denied, record denial and emit `toolExecutionFinished` with `isError: true`.
 *         ii. If allowed:
 *             - If mutating: emit `checkpointCreated`, call `hooks.onCheckpointCreated()`.
 *             - Emit `toolExecutionStarted`.
 *             - Execute tool (yielding `toolExecutionDelta` for progress chunks).
 *             - Emit `toolExecutionFinished`.
 *         iii. Call `hooks.onFormatToolOutput()` if configured.
 *       - Append tool results to conversation history.
 *       - Emit `stepFinished` with step token usage.
 *       - Call `hooks.onThreadUpdate()`.
 *       - Check `hooks.onShouldStop()`.
 * 5. Call `hooks.onPostTurn()`.
 *
 * @param config - The active engine configuration.
 * @param options - Per-turn options including user prompt and overrides.
 * @param conversationMessages - Mutable array of thread conversation messages.
 * @returns An async generator yielding `AgentEvent`s.
 */
/**
 * Extracts normalized provider identifier from a model string if formatted as "provider/model_id".
 */
function getModelProvider(model: string | unknown): string | undefined {
  if (typeof model === 'string') {
    const slashIndex = model.indexOf('/');
    if (slashIndex > 0) {
      return model.slice(0, slashIndex).trim().toLowerCase();
    }
  }
  return undefined;
}

/**
 * Combines multiple AbortSignal instances into a single signal.
 */
function combineAbortSignals(
  ...signals: Array<AbortSignal | undefined | null>
): AbortSignal | undefined {
  const activeSignals = signals.filter((s): s is AbortSignal => Boolean(s));
  if (activeSignals.length === 0) return undefined;
  if (activeSignals.length === 1) return activeSignals[0];
  if (typeof AbortSignal.any === 'function') {
    return AbortSignal.any(activeSignals);
  }
  const controller = new AbortController();
  for (const signal of activeSignals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason), {
      once: true,
    });
  }
  return controller.signal;
}

export async function* runTurn(
  config: AgentEngineConfig,
  options: RunTurnOptions,
  conversationMessages: ModelMessage[],
): AsyncGenerator<AgentEvent, void, void> {
  const turnIndex = options.turnIndex ?? 1;
  const userPrompt = options.userPrompt;
  const turnAbortController = new AbortController();
  const effectiveSignal = combineAbortSignals(
    options.abortSignal,
    config.abortSignal,
    turnAbortController.signal,
  );
  const maxSteps = options.maxSteps ?? config.maxSteps ?? 25;
  const reasoning = options.reasoning ?? config.reasoning;

  let totalPromptTokens = 0;
  let totalCompletionTokens = 0;
  let totalTokens = 0;
  let totalReasoningTokens = 0;

  const buildTotalUsage = (): StepTokenUsage => {
    const usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
      reasoningTokens?: number;
    } = {
      promptTokens: totalPromptTokens,
      completionTokens: totalCompletionTokens,
      totalTokens,
    };
    if (totalReasoningTokens > 0) {
      usage.reasoningTokens = totalReasoningTokens;
    }
    return usage;
  };

  let checkpointSequence = 1;
  let finishReason: TurnFinishReason = 'completed';
  const initialHistoryLength = conversationMessages.length;

  try {
    // Credential invariant check (B-04): ensure per-turn model cannot silently reuse another provider's credentials
    const configProvider = getModelProvider(config.model);
    const overrideProvider = getModelProvider(options.model);
    if (
      overrideProvider &&
      configProvider &&
      overrideProvider !== configProvider &&
      (!options.apiKey || !options.baseUrl)
    ) {
      throw new Error(
        `Per-turn model override changed provider from "${configProvider}" to "${overrideProvider}", but explicit per-turn credentials (apiKey and baseUrl) were not supplied. Falling back across different providers is forbidden.`,
      );
    }

    // 1. Emit 'turnStarted'
    yield {
      type: 'turnStarted',
      turnIndex,
      userMessage: userPrompt,
    };

    // 2. Call hooks.onPreTurn() -> await product decision
    let effectiveUserPrompt = userPrompt;
    let injectedInstructions = '';
    if (config.hooks?.onPreTurn) {
      const preTurnResult = await config.hooks.onPreTurn({
        turnIndex,
        userPrompt,
      });

      if (preTurnResult) {
        if (preTurnResult.veto) {
          finishReason = 'vetoed';
          yield {
            type: 'turnFinished',
            turnIndex,
            finishReason,
            totalUsage: buildTotalUsage(),
          };
          return;
        }
        if (preTurnResult.userPrompt) {
          effectiveUserPrompt = preTurnResult.userPrompt;
        }
        if (preTurnResult.injectedInstructions) {
          injectedInstructions = preTurnResult.injectedInstructions;
        }
      }
    }

    const combinedInstructions = [
      config.instructions,
      options.instructions,
      injectedInstructions,
    ]
      .filter((part): part is string => Boolean(part && part.trim().length > 0))
      .join('\n\n') || undefined;

    // 3. Append user message to conversation history
    conversationMessages.push({
      role: 'user',
      content: effectiveUserPrompt,
    });

    // 4. Autonomous step loop
    let stepIndex = 1;

    while (stepIndex <= maxSteps) {
      if (effectiveSignal?.aborted) {
        finishReason = 'interrupted';
        yield {
          type: 'turnFinished',
          turnIndex,
          finishReason,
          totalUsage: buildTotalUsage(),
        };
        return;
      }

      // Emit stepStarted
      yield {
        type: 'stepStarted',
        stepIndex,
        timestamp: Date.now(),
      };

      const sdkToolDefinitions = config.tools.toSdkToolDefinitions();
      const hasTools = Object.keys(sdkToolDefinitions).length > 0;

      // Construct streamText options without explicit undefined keys for exactOptionalPropertyTypes
      const streamOptions: GregStreamTextOptions = {
        model: options.model ?? config.model,
        apiKey: options.apiKey ?? config.apiKey,
        baseUrl: options.baseUrl ?? config.baseUrl,
        messages: conversationMessages,
        ...(combinedInstructions ? { instructions: combinedInstructions } : {}),
        ...(hasTools ? { tools: sdkToolDefinitions } : {}),
        ...(reasoning ? { reasoning } : {}),
        ...(effectiveSignal ? { abortSignal: effectiveSignal } : {}),
      };

      const streamResult = streamText(streamOptions);

      const proposedToolCalls: Array<{
        callId: string;
        toolName: string;
        parameters: unknown;
      }> = [];

      // Consume streaming chunks
      for await (const chunk of streamResult.stream) {
        if (chunk.type === 'text-delta') {
          yield {
            type: 'tokenDelta',
            text: (chunk as any).text ?? (chunk as any).textDelta ?? '',
            messageId: (chunk as any).id,
          };
        } else if (chunk.type === 'reasoning-delta') {
          yield {
            type: 'thoughtDelta',
            text: (chunk as any).text ?? (chunk as any).textDelta ?? '',
            messageId: (chunk as any).id,
          };
        } else if (chunk.type === 'tool-call') {
          const rawCall = chunk as any;
          const toolCall = {
            callId: rawCall.toolCallId ?? rawCall.id ?? randomUUID(),
            toolName: rawCall.toolName,
            parameters: rawCall.input ?? rawCall.args ?? {},
          };
          proposedToolCalls.push(toolCall);
          yield {
            type: 'toolCallProposed',
            callId: toolCall.callId,
            toolName: toolCall.toolName,
            parameters: toolCall.parameters,
          };
        }
      }

      // Collect assistant response messages and step token metrics
      const responseMessages = await streamResult.responseMessages;
      conversationMessages.push(...responseMessages);

      const rawUsage = await streamResult.usage;
      const stepUsage: StepTokenUsage = {
        promptTokens: rawUsage.inputTokens ?? 0,
        completionTokens: rawUsage.outputTokens ?? 0,
        totalTokens: rawUsage.totalTokens ?? 0,
        ...(typeof rawUsage.outputTokenDetails?.reasoningTokens === 'number'
          ? { reasoningTokens: rawUsage.outputTokenDetails.reasoningTokens }
          : {}),
      };

      totalPromptTokens += stepUsage.promptTokens;
      totalCompletionTokens += stepUsage.completionTokens;
      totalTokens += stepUsage.totalTokens;
      if (typeof stepUsage.reasoningTokens === 'number') {
        totalReasoningTokens += stepUsage.reasoningTokens;
      }

      // If no tool calls were proposed, evaluate completion
      if (proposedToolCalls.length === 0) {
        if (config.hooks?.onShouldStop) {
          const stopDecision = await config.hooks.onShouldStop({
            turnIndex,
            finishReason: 'completed',
            transcript: conversationMessages,
          });

          if (!stopDecision.shouldStop) {
            conversationMessages.push({
              role: 'user',
              content: stopDecision.reminderPrompt,
            });

            yield {
              type: 'stepFinished',
              stepIndex,
              usage: stepUsage,
            };

            if (config.hooks?.onThreadUpdate) {
              await config.hooks.onThreadUpdate({
                threadId: config.threadId,
                messages: conversationMessages,
                turnIndex,
                usage: buildTotalUsage(),
              });
            }

            stepIndex++;
            continue;
          }
        }

        finishReason = 'completed';
        yield {
          type: 'stepFinished',
          stepIndex,
          usage: stepUsage,
        };

        yield {
          type: 'turnFinished',
          turnIndex,
          finishReason,
          totalUsage: buildTotalUsage(),
        };

        if (config.hooks?.onThreadUpdate) {
          await config.hooks.onThreadUpdate({
            threadId: config.threadId,
            messages: conversationMessages,
            turnIndex,
            usage: buildTotalUsage(),
          });
        }

        return;
      }

      // Execute proposed tool calls
      const toolResults: Array<{
        toolCallId: string;
        toolName: string;
        result: unknown;
        isError: boolean;
      }> = [];

      for (const toolCall of proposedToolCalls) {
        const agentTool = config.tools.resolve(toolCall.toolName);
        if (!agentTool) {
          const denialResult = {
            isError: true,
            error: `Tool "${toolCall.toolName}" is not registered in ToolRegistry.`,
          };

          yield {
            type: 'toolExecutionFinished',
            callId: toolCall.callId,
            toolName: toolCall.toolName,
            result: denialResult,
            isError: true,
            durationMs: 0,
          };

          toolResults.push({
            toolCallId: toolCall.callId,
            toolName: toolCall.toolName,
            result: denialResult,
            isError: true,
          });
          continue;
        }

        // Validate tool input parameters before authorization hooks
        let parsedParameters: unknown;
        try {
          parsedParameters = agentTool.inputSchema.parse(toolCall.parameters);
        } catch (validationError) {
          const schemaErrorResult = {
            isError: true,
            error: `Schema validation error for tool "${toolCall.toolName}": ${validationError instanceof Error ? validationError.message : String(validationError)}`,
          };

          yield {
            type: 'toolExecutionFinished',
            callId: toolCall.callId,
            toolName: toolCall.toolName,
            result: schemaErrorResult,
            isError: true,
            durationMs: 0,
          };

          toolResults.push({
            toolCallId: toolCall.callId,
            toolName: toolCall.toolName,
            result: schemaErrorResult,
            isError: true,
          });
          continue;
        }

        const isMutating = agentTool.isMutating;
        let isAllowed = true;
        let denialReason = 'Tool execution was denied';

        if (config.hooks?.onAuthorizeTool) {
          try {
            const decision = await config.hooks.onAuthorizeTool({
              toolName: toolCall.toolName,
              parameters: parsedParameters,
              isMutating,
              workingDirectory: config.workingDirectory,
            });

            if (decision.decision === 'deny') {
              isAllowed = false;
              denialReason = decision.reason;
            } else if (decision.decision === 'askUser') {
              let resolver!: (decision: 'allow' | 'deny' | 'allowAlways') => void;
              const decisionPromise = new Promise<'allow' | 'deny' | 'allowAlways'>((resolve) => {
                resolver = resolve;
              });

              yield {
                type: 'toolPermissionRequested',
                callId: toolCall.callId,
                toolName: toolCall.toolName,
                parameters: parsedParameters,
                isMutating,
                resolve: resolver,
              };

              const userDecision = await Promise.race([
                decisionPromise,
                new Promise<'deny'>((resolve) => {
                  if (effectiveSignal) {
                    if (effectiveSignal.aborted) resolve('deny');
                    effectiveSignal.addEventListener('abort', () => resolve('deny'), {
                      once: true,
                    });
                  }
                }),
              ]);

              yield {
                type: 'toolPermissionResolved',
                callId: toolCall.callId,
                toolName: toolCall.toolName,
                decision: userDecision,
              };

              if (userDecision === 'deny') {
                isAllowed = false;
                denialReason = 'Tool execution was denied by user';
              }
            }
          } catch (authError) {
            isAllowed = false;
            denialReason = `Authorization check failed: ${authError instanceof Error ? authError.message : String(authError)}`;
          }
        } else if (isMutating) {
          // Mutating tools fail closed when no authorization hook is provided
          isAllowed = false;
          denialReason = `Mutating tool "${toolCall.toolName}" requires an explicit authorization policy.`;
        }

        if (!isAllowed) {
          const denialResult = {
            isError: true,
            error: denialReason,
          };

          yield {
            type: 'toolExecutionFinished',
            callId: toolCall.callId,
            toolName: toolCall.toolName,
            result: denialResult,
            isError: true,
            durationMs: 0,
          };

          toolResults.push({
            toolCallId: toolCall.callId,
            toolName: toolCall.toolName,
            result: denialResult,
            isError: true,
          });
          continue;
        }

        // Checkpoint before mutating tool execution
        if (isMutating && config.checkpoint?.enabled !== false) {
          const checkpointId = `cp_${Date.now()}_${randomUUID().slice(0, 8)}`;
          const filesTouched: string[] = [];
          const rawParams = parsedParameters as Record<string, unknown> | null;
          if (rawParams && typeof rawParams.filePath === 'string') {
            filesTouched.push(rawParams.filePath);
          } else if (rawParams && typeof rawParams.path === 'string') {
            filesTouched.push(rawParams.path);
          }

          yield {
            type: 'checkpointCreated',
            checkpointId,
            sequence: checkpointSequence,
            label: `Before mutating tool: ${toolCall.toolName}`,
            filesTouched,
          };

          if (config.hooks?.onCheckpointCreated) {
            await config.hooks.onCheckpointCreated({
              checkpointId,
              sequence: checkpointSequence,
              label: `Before mutating tool: ${toolCall.toolName}`,
              filesTouched,
            });
          }

          checkpointSequence++;
        }

        // Emit toolExecutionStarted
        const startTime = Date.now();
        yield {
          type: 'toolExecutionStarted',
          callId: toolCall.callId,
          toolName: toolCall.toolName,
          timestamp: startTime,
        };

        let executionResult: unknown;
        let isToolError = false;

        const progressQueue = new AsyncEventQueue<string>();

        const executePromise = (async () => {
          try {
            const executionContext: ToolExecutionContext = {
              threadId: config.threadId,
              toolCallId: toolCall.callId,
              workingDirectory: config.workingDirectory,
              abortSignal: effectiveSignal,
              emitProgress: (chunk: string) => {
                progressQueue.push(chunk);
              },
            };

            if (agentTool.isConcurrencySafe) {
              return await agentTool.execute(parsedParameters, executionContext);
            }

            return await config.tools.executionQueue.run(
              () => agentTool.execute(parsedParameters, executionContext),
              effectiveSignal,
            );
          } catch (error) {
            isToolError = true;
            return {
              isError: true,
              error: error instanceof Error ? error.message : String(error),
            };
          } finally {
            progressQueue.close();
          }
        })();

        for await (const chunk of progressQueue) {
          yield {
            type: 'toolExecutionDelta',
            callId: toolCall.callId,
            toolName: toolCall.toolName,
            chunk,
          };
        }

        executionResult = await executePromise;

        const durationMs = Date.now() - startTime;
        yield {
          type: 'toolExecutionFinished',
          callId: toolCall.callId,
          toolName: toolCall.toolName,
          result: executionResult,
          isError: isToolError,
          durationMs,
        };

        let formattedResult = executionResult;
        if (config.hooks?.onFormatToolOutput) {
          formattedResult = await config.hooks.onFormatToolOutput({
            toolName: toolCall.toolName,
            rawResult: executionResult,
            isError: isToolError,
          });
        }

        toolResults.push({
          toolCallId: toolCall.callId,
          toolName: toolCall.toolName,
          result: formattedResult,
          isError: isToolError,
        });
      }

      // Append tool results message
      conversationMessages.push({
        role: 'tool',
        content: toolResults.map((tr) => ({
          type: 'tool-result',
          toolCallId: tr.toolCallId,
          toolName: tr.toolName,
          output:
            typeof tr.result === 'string'
              ? { type: 'text', value: tr.result }
              : { type: 'json', value: (tr.result ?? {}) as any },
        })),
      });

      // Emit stepFinished
      yield {
        type: 'stepFinished',
        stepIndex,
        usage: stepUsage,
      };

      // Call onThreadUpdate with an immutable snapshot
      if (config.hooks?.onThreadUpdate) {
        await config.hooks.onThreadUpdate({
          threadId: config.threadId,
          messages: [...conversationMessages],
          turnIndex,
          usage: buildTotalUsage(),
        });
      }

      stepIndex++;
    }

    // Exceeded maxSteps
    finishReason = 'maxSteps';
    yield {
      type: 'turnFinished',
      turnIndex,
      finishReason,
      totalUsage: buildTotalUsage(),
    };
  } catch (error) {
    // Roll back in-progress conversation additions if unhandled exception occurs
    conversationMessages.length = initialHistoryLength;

    const errorInstance = error instanceof Error ? error : new Error(String(error));
    finishReason = 'error';

    yield {
      type: 'error',
      origin: 'engine',
      error: errorInstance,
      isFatal: true,
    };

    if (config.hooks?.onError) {
      await config.hooks.onError({
        error: errorInstance,
        origin: 'engine',
        turnIndex,
        isFatal: true,
      });
    }

    yield {
      type: 'turnFinished',
      turnIndex,
      finishReason,
      totalUsage: buildTotalUsage(),
    };
  } finally {
    if (config.hooks?.onPostTurn) {
      try {
        await config.hooks.onPostTurn({
          turnIndex,
          finishReason,
          totalUsage: buildTotalUsage(),
        });
      } catch (cleanupError) {
        // Collect cleanup error without masking primary turn outcome
      }
    }
  }
}
