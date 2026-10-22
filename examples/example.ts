/**
 * @fileoverview Interactive agent terminal session demonstrating dynamic model switching,
 * reasoning effort configuration, and read-only tool execution with AgentEngine.
 *
 * Commands:
 *   .model 1              - Switches to Model 1: Google Gemini Flash Lite (gemini-flash-lite-latest)
 *   .model 2              - Switches to Model 2: OpenRouter Free tier (openrouter/openrouter/free)
 *   .model <provider/id>  - Switches to any arbitrary model (e.g. .model anthropic/claude-3-7-sonnet)
 *   .effort <level>       - Sets reasoning level (none, minimal, low, medium, high, xhigh, max, provider-default)
 *   .status               - Displays current model, reasoning effort, and active tools
 *   .help                 - Displays help instructions
 *   .exit / .quit         - Terminates the session
 *
 * Usage:
 *   bun run examples/example.ts
 */

import { stdin as input, stdout as output } from 'node:process';
import * as readline from 'node:readline/promises';
import {
  AgentEngine,
  type AgentReasoningLevel,
  GlobTool,
  GrepTool,
  ReadFileTool,
  ToolRegistry,
} from '@amaranthic/greg-agent-core';

/**
 * Valid reasoning levels supported by AI SDK v7.
 */
const VALID_REASONING_LEVELS: readonly AgentReasoningLevel[] = [
  'provider-default',
  'none',
  'minimal',
  'low',
  'medium',
  'high',
  'xhigh',
  'max',
] as const;

/**
 * Preset Model Definitions for quick switching via `.model 1` and `.model 2`.
 */
interface ModelPreset {
  readonly id: string;
  readonly displayName: string;
  readonly modelString: string;
  readonly envVar: string;
  readonly baseUrl: string;
  readonly getApiKey: () => string;
}

const MODEL_PRESETS: Record<'1' | '2', ModelPreset> = {
  '1': {
    id: '1',
    displayName: 'gemini-flash-lite-latest',
    modelString: 'google/gemini-flash-lite-latest',
    envVar: 'GEMINI_API_KEY',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    getApiKey: () => process.env.GEMINI_API_KEY ?? '',
  },
  '2': {
    id: '2',
    displayName: 'openrouter/openrouter/free',
    modelString: 'openrouter/openrouter/free',
    envVar: 'OPENROUTER_API_KEY',
    baseUrl: 'https://openrouter.ai/api/v1',
    getApiKey: () => process.env.OPENROUTER_API_KEY ?? '',
  },
};

/**
 * Resolves credentials for any given model string.
 *
 * @param model - Model string (e.g. 'google/gemini-2.5-flash-lite', 'openrouter/openrouter/free').
 * @returns Object with apiKey and baseUrl.
 */
function resolveCredentialsForModel(model: string): { apiKey: string; baseUrl: string; envVarName?: string } {
  if (model === MODEL_PRESETS['1'].modelString) {
    return {
      apiKey: MODEL_PRESETS['1'].getApiKey(),
      baseUrl: MODEL_PRESETS['1'].baseUrl,
      envVarName: MODEL_PRESETS['1'].envVar,
    };
  }

  if (model === MODEL_PRESETS['2'].modelString) {
    return {
      apiKey: MODEL_PRESETS['2'].getApiKey(),
      baseUrl: MODEL_PRESETS['2'].baseUrl,
      envVarName: MODEL_PRESETS['2'].envVar,
    };
  }

  const provider = model.split('/')[0]?.toLowerCase();

  switch (provider) {
    case 'google':
      return {
        apiKey:
          process.env.GEMINI_API_KEY ??
          process.env.GOOGLE_API_KEY ??
          process.env.TEXTC_API_KEY ??
          '',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        envVarName: 'GEMINI_API_KEY',
      };
    case 'openrouter':
      return {
        apiKey: process.env.OPENROUTER_API_KEY ?? '',
        baseUrl: 'https://openrouter.ai/api/v1',
        envVarName: 'OPENROUTER_API_KEY',
      };
    case 'anthropic':
      return {
        apiKey: process.env.ANTHROPIC_API_KEY ?? '',
        baseUrl: 'https://api.anthropic.com/v1',
        envVarName: 'ANTHROPIC_API_KEY',
      };
    case 'openai':
      return {
        apiKey: process.env.OPENAI_API_KEY ?? '',
        baseUrl: 'https://api.openai.com/v1',
        envVarName: 'OPENAI_API_KEY',
      };
    default:
      return {
        apiKey: process.env.API_KEY ?? '',
        baseUrl: process.env.BASE_URL ?? 'https://api.openai.com/v1',
        envVarName: 'API_KEY',
      };
  }
}

/**
 * Runs the interactive agent terminal loop.
 */
async function main(): Promise<void> {
  // 1. Build a ToolRegistry with ONLY read-only tools
  const tools = new ToolRegistry({ includeDefaults: false });
  tools.register(new ReadFileTool());
  tools.register(new GlobTool());
  tools.register(new GrepTool());

  // 2. Initial session parameters (defaults to Preset 1)
  let activeModel = MODEL_PRESETS['1'].modelString;
  let activeReasoningEffort: AgentReasoningLevel = 'high';
  const workingDirectory = process.cwd();

  const initialCredentials = resolveCredentialsForModel(activeModel);

  // 3. Instantiate the core engine
  const engine = new AgentEngine({
    threadId: `th_example_${Date.now()}`,
    workingDirectory,
    model: activeModel,
    apiKey: initialCredentials.apiKey || 'placeholder-key',
    baseUrl: initialCredentials.baseUrl,
    instructions:
      'You are a read-only codebase exploration assistant. You have access to readFile, glob, and grep tools to search and inspect files without making any workspace mutations.',
    tools,
    reasoning: activeReasoningEffort,
  });

  const rl = readline.createInterface({ input, output });

  console.log('╔══════════════════════════════════════════════════════════════════╗');
  console.log('║               Greg Agent Core — Interactive Example              ║');
  console.log('╚══════════════════════════════════════════════════════════════════╝');
  console.log(`Working Directory: ${workingDirectory}`);
  console.log(`Active Model:      ${activeModel} (Preset 1: ${MODEL_PRESETS['1'].displayName})`);
  console.log(`Reasoning Effort:  ${activeReasoningEffort}`);
  console.log(`Active Tools:      ${tools.list().map((t) => t.name).join(', ')} (Read-only)`);
  console.log('\nQuick Model Switching:');
  console.log(`  .model 1          - ${MODEL_PRESETS['1'].displayName} (${MODEL_PRESETS['1'].modelString}) [Env: ${MODEL_PRESETS['1'].envVar}]`);
  console.log(`  .model 2          - ${MODEL_PRESETS['2'].displayName} (${MODEL_PRESETS['2'].modelString}) [Env: ${MODEL_PRESETS['2'].envVar}]`);
  console.log('  .model <id>       - Custom model string (e.g. .model anthropic/claude-3-7-sonnet)');
  console.log('\nOther Commands:');
  console.log('  .effort <level>   - Change reasoning effort (none, low, medium, high, max)');
  console.log('  .status           - Display current configuration');
  console.log('  .help             - Display this help message');
  console.log('  .exit / .quit     - Exit terminal session\n');

  try {
    while (true) {
      const line = await rl.question('\nagent> ');
      const trimmed = line.trim();

      if (!trimmed) {
        continue;
      }

      // Check for exit
      if (
        trimmed === '.exit' ||
        trimmed === '.quit' ||
        trimmed.toLowerCase() === 'exit' ||
        trimmed.toLowerCase() === 'quit'
      ) {
        console.log('Goodbye!');
        break;
      }

      // Handle .help command
      if (trimmed === '.help') {
        console.log('\nCommands:');
        console.log(`  .model 1          - Switch to ${MODEL_PRESETS['1'].displayName} (uses ${MODEL_PRESETS['1'].envVar})`);
        console.log(`  .model 2          - Switch to ${MODEL_PRESETS['2'].displayName} (uses ${MODEL_PRESETS['2'].envVar})`);
        console.log('  .model <id>       - Switch to custom model (e.g. .model anthropic/claude-3-7-sonnet)');
        console.log('  .effort <level>   - Change effort: ' + VALID_REASONING_LEVELS.join(', '));
        console.log('  .status           - Show current session settings');
        console.log('  .exit / .quit     - Exit REPL');
        continue;
      }

      // Handle .status command
      if (trimmed === '.status') {
        const creds = resolveCredentialsForModel(activeModel);
        const hasKey = Boolean(creds.apiKey && creds.apiKey.length > 0);
        console.log(`\nModel:            ${activeModel}`);
        console.log(`API Key Status:   ${hasKey ? '✓ Present' : `✗ Missing (${creds.envVarName ?? 'API Key'})`}`);
        console.log(`Reasoning Effort: ${activeReasoningEffort}`);
        console.log(`Current Turn:     ${engine.currentTurn}`);
        console.log(`Messages Count:   ${engine.messages.length}`);
        console.log(`Registered Tools: ${tools.list().map((t) => t.name).join(', ')}`);
        continue;
      }

      // Handle .model command
      if (trimmed.startsWith('.model')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length < 2 || !parts[1]) {
          console.log('Usage:\n  .model 1  -> gemini-flash-lite-latest (uses GEMINI_API_KEY)\n  .model 2  -> openrouter/openrouter/free (uses OPENROUTER_API_KEY)\n  .model <custom>');
          continue;
        }

        const choice = parts[1].trim();

        if (choice === '1' || choice === 'gemini-flash-lite-latest' || choice === 'google/gemini-flash-lite-latest') {
          activeModel = MODEL_PRESETS['1'].modelString;
          const creds = resolveCredentialsForModel(activeModel);
          const hasKey = Boolean(creds.apiKey);
          console.log(`✓ Active model set to [1]: gemini-flash-lite-latest (${activeModel})`);
          if (!hasKey) {
            console.warn(`  ⚠️ Warning: ${MODEL_PRESETS['1'].envVar} is not set in your environment.`);
          }
          continue;
        }

        if (choice === '2' || choice === 'openrouter/openrouter/free') {
          activeModel = MODEL_PRESETS['2'].modelString;
          const creds = resolveCredentialsForModel(activeModel);
          const hasKey = Boolean(creds.apiKey);
          console.log(`✓ Active model set to [2]: openrouter/openrouter/free`);
          if (!hasKey) {
            console.warn(`  ⚠️ Warning: ${MODEL_PRESETS['2'].envVar} is not set in your environment.`);
          }
          continue;
        }

        // Custom model string
        activeModel = choice;
        const creds = resolveCredentialsForModel(activeModel);
        console.log(`✓ Active model switched to: ${activeModel}`);
        if (!creds.apiKey) {
          console.warn(`  ⚠️ Warning: ${creds.envVarName ?? 'API key'} is not set in your environment.`);
        }
        continue;
      }

      // Handle .effort command
      if (trimmed.startsWith('.effort')) {
        const parts = trimmed.split(/\s+/);
        if (parts.length < 2 || !parts[1]) {
          console.log(
            'Usage: .effort <level>\nAllowed levels: ' + VALID_REASONING_LEVELS.join(', '),
          );
          continue;
        }

        const candidate = parts[1].toLowerCase() as AgentReasoningLevel;
        if (!VALID_REASONING_LEVELS.includes(candidate)) {
          console.log(
            `Invalid effort level "${parts[1]}". Allowed: ${VALID_REASONING_LEVELS.join(', ')}`,
          );
          continue;
        }

        activeReasoningEffort = candidate;
        console.log(`✓ Reasoning effort set to: ${activeReasoningEffort}`);
        continue;
      }

      // Run turn with active model, reasoning effort, and credentials
      const credentials = resolveCredentialsForModel(activeModel);

      if (!credentials.apiKey) {
        console.error(
          `❌ Cannot run turn: Missing API key. Please set ${credentials.envVarName ?? 'API key'} in your environment.`,
        );
        continue;
      }

      console.log(`\n--- [Turn ${engine.currentTurn + 1} | Model: ${activeModel} | Effort: ${activeReasoningEffort}] ---`);

      let isThinking = false;

      try {
        const turnStream = engine.runTurn({
          userPrompt: trimmed,
          model: activeModel,
          apiKey: credentials.apiKey,
          baseUrl: credentials.baseUrl,
          reasoning: activeReasoningEffort,
        });

        for await (const event of turnStream) {
          switch (event.type) {
            case 'thoughtDelta': {
              if (!isThinking) {
                process.stdout.write('\n[Thinking] ');
                isThinking = true;
              }
              process.stdout.write(event.text);
              break;
            }
            case 'tokenDelta': {
              if (isThinking) {
                process.stdout.write('\n\n[Assistant] ');
                isThinking = false;
              }
              process.stdout.write(event.text);
              break;
            }
            case 'toolCallProposed': {
              if (isThinking) {
                process.stdout.write('\n');
                isThinking = false;
              }
              console.log(
                `\n⚙ [Tool Call Proposed] ${event.toolName}(${JSON.stringify(event.parameters)})`,
              );
              break;
            }
            case 'toolExecutionStarted': {
              console.log(`▶ [Tool Executing] ${event.toolName}...`);
              break;
            }
            case 'toolExecutionDelta': {
              process.stdout.write(event.chunk);
              break;
            }
            case 'toolExecutionFinished': {
              const status = event.isError ? '✗ Error' : '✓ Done';
              console.log(`\n⏹ [Tool Finished: ${event.toolName}] (${status} in ${event.durationMs}ms)`);
              break;
            }
            case 'turnFinished': {
              if (isThinking) {
                process.stdout.write('\n');
                isThinking = false;
              }
              console.log(`\n\n[Turn Finished: ${event.finishReason}] (Tokens: ${event.totalUsage.totalTokens} total | ${event.totalUsage.promptTokens} in | ${event.totalUsage.completionTokens} out)`);
              break;
            }
            case 'error': {
              console.error(`\n[Engine Error: ${event.origin}] ${event.error.message}`);
              break;
            }
            default:
              break;
          }
        }
      } catch (error) {
        console.error(`\nFailed to complete turn: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  } finally {
    rl.close();
  }
}

// Execute REPL
main().catch((error) => {
  console.error('Fatal example error:', error);
  process.exit(1);
});
