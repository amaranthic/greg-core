# @amaranthic/hernex

[![npm version](https://img.shields.io/npm/v/@amaranthic/hernex.svg?style=flat-square&color=blue)](https://www.npmjs.com/package/@amaranthic/hernex)
[![license](https://img.shields.io/npm/l/@amaranthic/hernex.svg?style=flat-square&color=blue)](LICENSE)
[![bun](https://img.shields.io/badge/tested%20with-bun-fbf0df.svg?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)
[![node](https://img.shields.io/badge/node-%3E%3D22.0.0-339933.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

> **The unified AI agent runtime, microkernel engine, and tool execution harness built on Vercel AI SDK.**

`@amaranthic/hernex` is a single, self-contained ESM package that combines dynamic single-string model resolution, mandatory per-request credential isolation, autonomous multi-step turn orchestration, durable thread persistence, and content-addressed delta checkpointing.

---

## 📑 Table of Contents

- [Architectural Highlights](#-architectural-highlights)
- [Installation](#-installation)
- [Quick Start](#-quick-start)
  - [1. Single-Turn Text Generation](#1-single-turn-text-generation)
  - [2. Streaming Text Generation](#2-streaming-text-generation)
  - [3. Structured Object Generation](#3-structured-object-generation)
  - [4. Autonomous Multi-Step Turn Loop (`AgentEngine`)](#4-autonomous-multi-step-turn-loop-agentengine)
  - [5. Resuming Sessions from Disk](#5-resuming-sessions-from-disk)
- [Model Resolution & The First-Slash Rule](#-model-resolution--the-first-slash-rule)
  - [First-Slash Parsing Mechanics](#first-slash-parsing-mechanics)
  - [Built-In Provider Matrix (13 Providers)](#built-in-provider-matrix-13-providers)
  - [Mandatory Explicit Credentials](#mandatory-explicit-credentials)
  - [Custom Provider Registration](#custom-provider-registration)
- [Microkernel Agent Engine (`AgentEngine`)](#-microkernel-agent-engine-agentengine)
  - [The 10-Step Turn Lifecycle](#the-10-step-turn-lifecycle)
  - [Dual Control Bus](#dual-control-bus)
  - [Outward Streaming Event Catalog](#outward-streaming-event-catalog)
  - [Inward Interception Hooks](#inward-interception-hooks)
- [Standard Tool Harness](#-standard-tool-harness)
  - [Tool Contract & Declarations](#tool-contract--declarations)
  - [ReadFileTool](#readfiletool)
  - [WriteFileTool](#writefiletool)
  - [EditFileTool](#editfiletool)
  - [BashTool](#bashtool)
  - [GlobTool](#globtool)
  - [GrepTool](#greptool)
  - [Concurrency Queue (`ToolExecutionQueue`)](#concurrency-queue-toolexecutionqueue)
  - [Authoring Custom Tools](#authoring-custom-tools)
- [Durable State & Thread Persistence](#-durable-state--thread-persistence)
  - [Storage Precedence](#storage-precedence)
  - [Directory Layout](#directory-layout)
  - [ThreadStore Implementations](#threadstore-implementations)
  - [Advisory File Locking (`withFileLock`)](#advisory-file-locking-withfilelock)
- [Content-Addressed Delta Checkpointing](#-content-addressed-delta-checkpointing)
  - [Automatic Pre-Mutation Snapshots](#automatic-pre-mutation-snapshots)
  - [Conflict-Aware Restore Planning](#conflict-aware-restore-planning)
  - [Forced Restores](#forced-restores)
- [Security Boundaries & Threat Model](#-security-boundaries--threat-model)
  - [Workspace Path Containment](#workspace-path-containment)
  - [Bash Subprocess Sanitization](#bash-subprocess-sanitization)
  - [Host Isolation Scope](#host-isolation-scope)
- [Raw AI SDK Escape Hatch (`@amaranthic/hernex/ai`)](#-raw-ai-sdk-escape-hatch-amaranthichernexai)
- [Error Hierarchy](#-error-hierarchy)
- [Development & Verification](#-development--verification)
- [License](#-license)

---

## ⚡ Architectural Highlights

- **Dynamic First-Slash Model Routing**: Parse any `provider/model_id` string at runtime without manual SDK imports. All slashes after the first delimiter remain part of the model identifier (e.g., `openrouter/openai/gpt-4o`).
- **Explicit Credential Boundaries**: Zero reliance on hidden ambient `process.env` globals during model execution. Every request mandates explicit `apiKey` and `baseUrl` credentials.
- **Microkernel Autonomous Turn Loop**: `AgentEngine` drives autonomous multi-step reasoning and tool execution with configurable iteration limits, abort signal propagation, and reasoning effort controls.
- **Dual Control Bus**:
  - *Outward Event Bus*: Emits fine-grained streaming events (`tokenDelta`, `thoughtDelta`, `toolCallProposed`, `toolExecutionStarted`, `toolExecutionDelta`, `stepFinished`, `turnFinished`).
  - *Inward Interception Hooks*: Enforces human-in-the-loop policies via `onPreTurn`, `onAuthorizeTool`, `onShouldStop`, `onFormatToolInput`, `onFormatToolOutput`, and `onError`.
- **First-Class Tool Declarations**: Tools explicitly declare `isMutating` (triggering automatic delta checkpoints) and `isConcurrencySafe` (enabling parallel read operations while serializing state mutations).
- **Hardened Workspace Containment**: Every file operation verifies path containment against the configured workspace root, preventing path traversal attacks (`../`) and resolving symlink escapes.
- **Durable File & Memory Persistence**: Production-grade append-only `transcript.jsonl` and metadata state files with advisory file locking and crash-safe atomic writes.
- **Content-Addressed File Blobs**: SHA-256 deduplicated blob storage with dry-run conflict detection, ensuring uncommitted workspace edits are not silently overwritten on rollback.
- **Unrestricted AI SDK Access**: Access unadulterated native Vercel AI SDK functions and utilities directly via the `@amaranthic/hernex/ai` subpath export.

---

## 📦 Installation

```bash
# Using npm
npm install @amaranthic/hernex

# Using Bun
bun add @amaranthic/hernex

# Using pnpm
pnpm add @amaranthic/hernex

# Using Yarn
yarn add @amaranthic/hernex
```

### Runtime Requirements
- **Node.js**: `>= 22.0.0` (ESM native)
- **Bun**: `>= 1.0.0`
- **TypeScript**: `>= 5.0.0` (for type definitions)

---

## 🚀 Quick Start

### 1. Single-Turn Text Generation

```typescript
import { generateText } from "@amaranthic/hernex";

const result = await generateText({
  model: "openai/gpt-4o",
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
  prompt: "Explain the actor model in concurrent computing in two sentences.",
});

console.log(result.text);
console.log(`Tokens used: ${result.usage.totalTokens}`);
```

### 2. Streaming Text Generation

Stream tokens directly to terminal output or an HTTP response stream:

```typescript
import { streamText } from "@amaranthic/hernex";

const result = streamText({
  model: "anthropic/claude-3-5-sonnet-20241022",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseUrl: "https://api.anthropic.com/v1",
  prompt: "Write a quicksort implementation in TypeScript.",
});

for await (const chunk of result.textStream) {
  process.stdout.write(chunk);
}
```

### 3. Structured Object Generation

Generate schema-validated JSON outputs using re-exported `zod`:

```typescript
import { generateObject, z } from "@amaranthic/hernex";

const recipeSchema = z.object({
  title: z.string(),
  cookingMinutes: z.number().int().positive(),
  ingredients: z.array(z.string()),
  instructions: z.array(z.string()),
});

const result = await generateObject({
  model: "google/gemini-2.0-flash-exp",
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY!,
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  schema: recipeSchema,
  prompt: "Provide a quick recipe for traditional carbonara.",
});

console.log(result.object.title);
console.log(`Ready in: ${result.object.cookingMinutes} minutes`);
```

### 4. Autonomous Multi-Step Turn Loop (`AgentEngine`)

Deploy a fully autonomous agent that investigates files, runs commands, and solves problems:

```typescript
import { AgentEngine, ToolRegistry } from "@amaranthic/hernex";

// Initialize the tool registry with all 6 built-in tools
const tools = new ToolRegistry();

// Initialize the engine microkernel
const engine = new AgentEngine({
  threadId: "th_demo_001",
  workingDirectory: process.cwd(),
  model: "openai/gpt-4o",
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
  instructions: "You are an autonomous engineering assistant. Inspect the repository to answer questions.",
  tools,
  maxSteps: 15,
});

// Run an autonomous multi-step turn
const turnStream = engine.runTurn("Check package.json and summarize the build scripts.");

for await (const event of turnStream) {
  switch (event.type) {
    case "turnStarted":
      console.log(`\n[Turn Started: Turn #${event.turnIndex}]`);
      break;

    case "thoughtDelta":
      // Model reasoning tokens
      process.stdout.write(`\x1b[35m${event.delta}\x1b[0m`);
      break;

    case "tokenDelta":
      // Model assistant response tokens
      process.stdout.write(event.text);
      break;

    case "toolCallProposed":
      console.log(`\n🛠️  Tool Requested: ${event.toolName}(${JSON.stringify(event.input)})`);
      break;

    case "toolExecutionStarted":
      console.log(`⚙️  Running ${event.toolName}...`);
      break;

    case "toolExecutionFinished":
      console.log(`✅ Tool ${event.toolName} completed in ${event.durationMs}ms`);
      break;

    case "stepFinished":
      console.log(`\n--- Step ${event.stepIndex} finished (Usage: ${event.usage.totalTokens} tokens) ---`);
      break;

    case "turnFinished":
      console.log(`\n🏁 Turn Complete: reason=${event.finishReason}, totalSteps=${event.totalSteps}`);
      break;

    case "error":
      console.error(`❌ Error in step ${event.stepIndex}: ${event.error.message}`);
      break;
  }
}
```

### 5. Resuming Sessions from Disk

Resume an existing agent session from disk using `AgentEngine.fromThread()`:

```typescript
import {
  AgentEngine,
  FileThreadStore,
  FileCheckpointStore,
  ToolRegistry,
} from "@amaranthic/hernex";

const threadStore = new FileThreadStore();
const checkpointStore = new FileCheckpointStore();

// Load conversation history and state metadata from disk
const resumedEngine = await AgentEngine.fromThread("th_demo_001", {
  threadStore,
  checkpointStore,
  tools: new ToolRegistry(),
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
});

console.log(`Resumed thread with ${resumedEngine.getMessages().length} past messages.`);

// Execute next prompt seamlessly continuing the conversation
for await (const event of resumedEngine.runTurn("Now suggest optimizations for those scripts.")) {
  if (event.type === "tokenDelta") {
    process.stdout.write(event.text);
  }
}
```

---

## 🎯 Model Resolution & The First-Slash Rule

### First-Slash Parsing Mechanics

Hernex eliminates static provider configuration by dynamically parsing model identifier strings on the **first forward slash (`/`) only**:

$$\text{"provider/model\_id" } \longrightarrow \begin{cases} \mathbf{provider} & = \text{all characters before the first } / \\ \mathbf{modelId} & = \text{all characters after the first } / \end{cases}$$

All subsequent slashes are preserved as part of the `modelId`. This design allows seamless access to model routers and gateways that use nested path identifiers:

```typescript
import { parseModelString } from "@amaranthic/hernex";

parseModelString("openai/gpt-4o");
// => { provider: "openai", modelId: "gpt-4o" }

parseModelString("openrouter/meta-llama/llama-3.3-70b-instruct");
// => { provider: "openrouter", modelId: "meta-llama/llama-3.3-70b-instruct" }

parseModelString("compatible/local/org/my-model:latest");
// => { provider: "compatible", modelId: "local/org/my-model:latest" }
```

If a string lacks a slash, has an empty provider, or has an empty model ID, Hernex throws a strongly typed `InvalidModelStringError`.

### Built-In Provider Matrix (13 Providers)

Hernex includes 13 built-in provider adapters:

| Provider Identifier | Target Provider / Gateway | Default Base URL | Example Model String |
|---|---|---|---|
| `openai` | OpenAI Official API | `https://api.openai.com/v1` | `openai/gpt-4o` |
| `anthropic` | Anthropic Official API | `https://api.anthropic.com/v1` | `anthropic/claude-3-5-sonnet-20241022` |
| `google` | Google Gemini API | `https://generativelanguage.googleapis.com/v1beta` | `google/gemini-2.0-flash-exp` |
| `xai` | xAI Grok API | `https://api.x.ai/v1` | `xai/grok-2-latest` |
| `deepseek` | DeepSeek AI API | `https://api.deepseek.com/v1` | `deepseek/deepseek-chat` |
| `groq` | Groq High-Speed Cloud | `https://api.groq.com/openai/v1` | `groq/llama-3.3-70b-versatile` |
| `mistral` | Mistral AI API | `https://api.mistral.ai/v1` | `mistral/mistral-large-latest` |
| `cohere` | Cohere API | `https://api.cohere.com/v1` | `cohere/command-r-plus` |
| `togetherai` | Together AI Cloud | `https://api.together.xyz/v1` | `togetherai/meta-llama/Llama-3.3-70B-Instruct-Turbo` |
| `alibaba` | Alibaba DashScope API | `https://dashscope.aliyuncs.com/compatible-mode/v1` | `alibaba/qwen-plus` |
| `openrouter` | OpenRouter Gateway | `https://openrouter.ai/api/v1` | `openrouter/anthropic/claude-3.5-sonnet` |
| `compatible` | Generic OpenAI Compatible Servers | `http://localhost:11434/v1` | `compatible/llama3.2` |
| `vercelgateway` | Vercel AI Gateway | `https://ai-gateway.vercel.sh/v1` | `vercelgateway/openai/gpt-4o` |

> [!NOTE]
> For local models served through Ollama, vLLM, LM Studio, or LiteLLM, specify `compatible/<model_name>` and set `baseUrl` to your local endpoint (e.g., `http://127.0.0.1:11434/v1`).

### Mandatory Explicit Credentials

Hernex requires explicit credentials on every invocation. It does not automatically fall back to ambient environment variables during request execution, ensuring strict multitenancy and secret containment:

```typescript
// Throws MissingCredentialsError: Missing required credential 'apiKey' for provider 'openai'
await generateText({
  model: "openai/gpt-4o",
  apiKey: "",
  baseUrl: "https://api.openai.com/v1",
  prompt: "Hello",
});
```

To validate credentials ahead of execution:

```typescript
import { validateCredentials } from "@amaranthic/hernex";

validateCredentials({ apiKey: "sk-...", baseUrl: "https://api.openai.com/v1" }, "openai");
```

### Custom Provider Registration

Extend Hernex with bespoke model providers, on-prem inference gateways, or specialized mock engines:

```typescript
import {
  createProviderRegistry,
  generateText,
  type ProviderAdapter,
} from "@amaranthic/hernex";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// 1. Define custom adapter implementing ProviderAdapter
const onPremAdapter: ProviderAdapter = {
  providerId: "onprem",
  createModel(modelId, credentials) {
    const client = createOpenAICompatible({
      name: "onprem",
      apiKey: credentials.apiKey,
      baseURL: credentials.baseUrl,
    });
    return client(modelId);
  },
};

// 2. Create isolated registry and register adapter
const registry = createProviderRegistry();
registry.register(onPremAdapter);

// 3. Invoke with custom provider string
const response = await generateText({
  model: "onprem/deepseek-r1-70b",
  apiKey: "internal-cluster-token",
  baseUrl: "https://inference.internal.corp/v1",
  registry,
  prompt: "Analyze server health metrics.",
});
```

---

## 🧠 Microkernel Agent Engine (`AgentEngine`)

`AgentEngine` manages the full execution lifecycle of an autonomous agent: model interaction, streaming chunk dispatch, step loop iteration, tool authorization, checkpoint coordination, and transcript persistence.

```
                  ┌──────────────────────────────────────────┐
                  │           User Prompt Submitted          │
                  └────────────────────┬─────────────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │      emit turnStarted     │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │   hooks.onPreTurn(ctx)    │ ◀── Intercept / Augment
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │ Append user message to log│
                         └─────────────┬─────────────┘
                                       │
       ┌───────────────────────────────┴───────────────────────────────┐
       ▼                                                               │
┌─────────────┐                                                        │
│  STEP LOOP  │                                                        │
└──────┬──────┘                                                        │
       │                                                               │
       ▼                                                               │
┌───────────────────────────┐                                          │
│     emit stepStarted      │                                          │
└──────────────┬────────────┘                                          │
       │                                                               │
       ▼                                                               │
┌───────────────────────────┐                                          │
│ streamText() Model Call   │──▶ Emits: tokenDelta, thoughtDelta       │
└──────────────┬────────────┘                                          │
       │                                                               │
       ├─────────────────────────────────┐                             │
       │ (Model proposes tool calls)     │ (Model produces final text) │
       ▼                                 ▼                             │
┌───────────────────────────┐     ┌───────────────────────────┐        │
│ Tool Authorization & Exec │     │    hooks.onShouldStop()   │        │
│ 1. hooks.onAuthorizeTool  │     └─────────────┬─────────────┘        │
│ 2. Mutating? Checkpoint   │                   │                      │
│ 3. Execute tool (queue)   │                   ▼                      │
│ 4. Emit execution events  │         [Agent decides to stop]          │
└──────────────┬────────────┘                   │                      │
       │                                        ▼                      │
       ▼                                  ┌───────────┐                │
┌───────────────────────────┐             │   BREAK   │                │
│    emit stepFinished      │             └─────┬─────┘                │
└──────────────┬────────────┘                   │                      │
       │                                        │                      │
       └────────────────────────────────────────┘                      │
                                                                       │
                                       ┌───────────────────────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │     emit turnFinished     │
                         └─────────────┬─────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │   hooks.onPostTurn(ctx)   │
                         └───────────────────────────┘
```

### The 10-Step Turn Lifecycle

Each invocation of `engine.runTurn()` executes a deterministic 10-step sequence:

1. **Turn Initialization**: Emits `turnStarted` with turn index and user prompt.
2. **Pre-Turn Hook Interception**: Awaits `hooks.onPreTurn()` to allow prompt modification, contextual memory injection, or custom instructions.
3. **Transcript Recording**: Appends user message to durable conversation log.
4. **Step Initialization**: Verifies maximum step count (`maxSteps`) and checks abort signals; emits `stepStarted`.
5. **Streaming Model Execution**: Invokes `streamText()` with resolved model, conversation history, and adapted tool schemas.
6. **Token Dispatch**: Streams chunks as fine-grained events: `text-delta` -> `tokenDelta`, `reasoning-delta` -> `thoughtDelta`, and `tool-call` -> `toolCallProposed`.
7. **Tool Authorization**: For each proposed tool call, invokes `hooks.onAuthorizeTool()`. Denied tools immediately return an authorization error to the model without executing.
8. **Checkpointing & Tool Execution**:
   - If `tool.isMutating === true` and a `CheckpointStore` is attached, captures pre-mutation workspace delta and emits `checkpointCreated`.
   - Queues tool execution in `ToolExecutionQueue` (serializes mutating tools, runs concurrency-safe tools concurrently).
   - Emits `toolExecutionStarted`, tool stdout/stderr deltas via `toolExecutionDelta`, and `toolExecutionFinished`.
9. **Step Completion & Usage**: Records tool results to transcript, emits `stepFinished` with token usage metrics, and evaluates `hooks.onShouldStop()`.
10. **Turn Completion**: Emits `turnFinished` with finish reason (`complete`, `maxStepsExceeded`, `aborted`, or `error`), calls `hooks.onPostTurn()`, and finalizes thread state.

### Dual Control Bus

Hernex splits agent communication into two independent channels:
1. **Outward Event Bus (AsyncGenerator)**: Yields streaming `AgentEvent` objects to the caller for UI rendering, logging, and metrics.
2. **Inward Interception Bus (`AgentHooks`)**: Synchronously or asynchronously intercepts lifecycle points to approve tools, inject prompts, or enforce stopping conditions.

### Outward Streaming Event Catalog

| Event Type | Interface | Description | Key Payload Properties |
|---|---|---|---|
| `turnStarted` | `TurnStartedEvent` | Emitted when a new turn begins | `turnIndex`, `userPrompt`, `threadId` |
| `tokenDelta` | `TokenDeltaEvent` | Emitted when assistant text arrives | `text`, `stepIndex`, `turnIndex` |
| `thoughtDelta` | `ThoughtDeltaEvent` | Emitted when model reasoning arrives | `delta`, `stepIndex`, `turnIndex` |
| `toolCallProposed` | `ToolCallProposedEvent` | Emitted when model proposes a tool | `toolCallId`, `toolName`, `input` |
| `toolPermissionRequested` | `ToolPermissionRequestedEvent` | Emitted when awaiting authorization | `toolCallId`, `toolName`, `input` |
| `toolPermissionResolved` | `ToolPermissionResolvedEvent` | Emitted after authorization decision | `toolCallId`, `toolName`, `approved`, `reason` |
| `toolExecutionStarted` | `ToolExecutionStartedEvent` | Emitted when tool begins running | `toolCallId`, `toolName`, `input` |
| `toolExecutionDelta` | `ToolExecutionDeltaEvent` | Emitted during command stdout/stderr | `toolCallId`, `streamType`, `chunk` |
| `toolExecutionFinished` | `ToolExecutionFinishedEvent` | Emitted when tool finishes | `toolCallId`, `toolName`, `output`, `durationMs`, `isError` |
| `stepStarted` | `StepStartedEvent` | Emitted before model step begins | `stepIndex`, `turnIndex` |
| `stepFinished` | `StepFinishedEvent` | Emitted when model step completes | `stepIndex`, `turnIndex`, `usage` (`promptTokens`, `completionTokens`, `totalTokens`) |
| `checkpointCreated` | `CheckpointCreatedEvent` | Emitted before mutating tool runs | `checkpointId`, `fileCount`, `stepIndex` |
| `checkpointRestored` | `CheckpointRestoredEvent` | Emitted when workspace is rolled back | `checkpointId`, `restoredFiles`, `deletedFiles` |
| `turnFinished` | `TurnFinishedEvent` | Emitted when turn ends | `turnIndex`, `finishReason`, `totalSteps`, `usage` |
| `error` | `ErrorEvent` | Emitted on uncaught turn error | `error`, `stepIndex`, `turnIndex`, `fatal` |

### Inward Interception Hooks

Configure custom policies using `AgentHooks`:

```typescript
const engine = new AgentEngine({
  threadId: "th_prod_01",
  workingDirectory: process.cwd(),
  model: "openai/gpt-4o",
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
  tools: new ToolRegistry(),
  hooks: {
    // 1. Human-in-the-loop tool authorization
    onAuthorizeTool: async (context) => {
      if (context.toolName === "bash" && context.input.command.includes("rm -rf")) {
        return {
          approved: false,
          reason: "Destructive shell commands are prohibited by workspace policy.",
        };
      }
      return { approved: true };
    },

    // 2. Early loop termination criteria
    onShouldStop: async (context) => {
      if (context.stepIndex >= 10) {
        return { shouldStop: true, reason: "Step budget reached" };
      }
      return { shouldStop: false };
    },

    // 3. Pre-turn prompt augmentation
    onPreTurn: async (context) => {
      return {
        modifiedPrompt: `[Context: Branch main, Commit 4a12f]\n${context.userPrompt}`,
      };
    },

    // 4. Tool output redaction / sanitization
    onFormatToolOutput: async (context) => {
      if (typeof context.output === "string") {
        return context.output.replace(/sk-[a-zA-Z0-9]{32}/g, "[REDACTED_API_KEY]");
      }
      return context.output;
    },
  },
});
```

---

## 🛠️ Standard Tool Harness

Hernex ships with 6 production-grade, hardened agent tools implementing the `AgentTool` contract.

### Tool Contract & Declarations

Every tool implements `AgentTool<TSchema, TOutput>`:

```typescript
export interface AgentTool<TSchema extends z.ZodTypeAny, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: TSchema;
  readonly isMutating: boolean;          // Triggers delta checkpointing before execution
  readonly isConcurrencySafe: boolean;    // Allows parallel execution with other safe tools
  execute(input: z.infer<TSchema>, context: ToolExecutionContext): Promise<TOutput>;
}
```

### ReadFileTool
Safely reads text files with pagination, binary file guards, character caps, and memory overflow protections.

- **Name**: `readFile`
- **Mutating**: `false` | **Concurrency Safe**: `true`
- **Input Parameters**:
  - `filePath` (`string`): Workspace-relative or absolute path.
  - `offset` (`number`, optional): 1-based start line number (defaults to `1`).
  - `limit` (`number`, optional): Maximum lines to read (defaults to `2000`).
- **Guards & Limits**:
  - Automatically rejects binary file extensions (`.png`, `.zip`, `.pdf`, `.wasm`, `.pyc`, etc.) before disk reads.
  - Blocks blocking character device files (`/dev/zero`, `/dev/urandom`, `/dev/random`).
  - 20 MB file size safety ceiling.
  - Returns `isTruncated: true` if content exceeds 30,000 characters.

### WriteFileTool
Atomically writes or overwrites file contents in the workspace.

- **Name**: `writeFile`
- **Mutating**: `true` | **Concurrency Safe**: `false`
- **Input Parameters**:
  - `filePath` (`string`): Target file path.
  - `content` (`string`): Content to write.
- **Behaviors**:
  - Automatically creates missing parent directories recursively (`mkdir -p`).
  - Uses atomic file replacement (writes to `.tmp` file then renames) to prevent file corruption.

### EditFileTool
Performs surgical, in-place string replacements inside existing files.

- **Name**: `editFile`
- **Mutating**: `true` | **Concurrency Safe**: `false`
- **Input Parameters**:
  - `filePath` (`string`): File to modify.
  - `oldString` (`string`): Exact existing substring to locate and replace.
  - `newString` (`string`): Replacement text.
  - `replaceAll` (`boolean`, optional): When `false` (default), throws an error unless `oldString` occurs **exactly once** in the file. When `true`, replaces all occurrences.

### BashTool
Executes shell commands as managed child processes.

- **Name**: `bash`
- **Mutating**: `true` | **Concurrency Safe**: `false`
- **Input Parameters**:
  - `command` (`string`): Shell command line to execute.
  - `timeoutMs` (`number`, optional): Maximum duration before process termination (defaults to `60000` ms).
- **Behaviors**:
  - Strips ambient host secrets and API tokens from the child environment (`getSafeBashEnvironment()`).
  - Streams real-time stdout and stderr deltas via `toolExecutionDelta` events.
  - Decodes output cleanly across chunk boundaries using `StringDecoder`.
  - Terminates the process group cleanly on timeout or abort signal.

### GlobTool
Fast workspace file system matching.

- **Name**: `glob`
- **Mutating**: `false` | **Concurrency Safe**: `true`
- **Input Parameters**:
  - `pattern` (`string`): Glob pattern (e.g., `**/*.ts`, `src/**/*.json`).
  - `path` (`string`, optional): Subdirectory to search within (defaults to workspace root).
- **Behaviors**:
  - Automatically excludes `node_modules`, `.git`, `dist`, `.turbo`, and `.cache`.
  - Caps returned results at 250 matches to prevent prompt bloat.

### GrepTool
Fast regular expression search across workspace files.

- **Name**: `grep`
- **Mutating**: `false` | **Concurrency Safe**: `true`
- **Input Parameters**:
  - `pattern` (`string`): Regular expression pattern.
  - `path` (`string`, optional): Directory or file to search (defaults to workspace root).
  - `glob` (`string`, optional): File pattern filter (e.g., `*.ts`).
  - `caseInsensitive` (`boolean`, optional): Case-insensitive flag (defaults to `false`).
  - `headLimit` (`number`, optional): Maximum line matches (defaults to `250`).
- **Behaviors**:
  - Automatically skips binary files and excluded directories.
  - Returns line numbers, matched text, and relative paths.

### Concurrency Queue (`ToolExecutionQueue`)

The `ToolExecutionQueue` orchestrates tool execution using tool concurrency metadata:

```typescript
import { ToolExecutionQueue, ReadFileTool, WriteFileTool } from "@amaranthic/hernex";

const queue = new ToolExecutionQueue();

// Parallel Reads: These run simultaneously because isConcurrencySafe === true
const readPromise1 = queue.enqueue(new ReadFileTool(), { filePath: "a.ts" }, context);
const readPromise2 = queue.enqueue(new ReadFileTool(), { filePath: "b.ts" }, context);
await Promise.all([readPromise1, readPromise2]);

// Serialized Write: Waits for all active reads to drain before mutating the workspace
await queue.enqueue(new WriteFileTool(), { filePath: "a.ts", content: "// updated" }, context);
```

### Authoring Custom Tools

Create custom tools by implementing the `AgentTool` interface:

```typescript
import { type AgentTool, type ToolExecutionContext, z } from "@amaranthic/hernex";

const weatherInputSchema = z.object({
  city: z.string().describe("The name of the city to query"),
  units: z.enum(["celsius", "fahrenheit"]).default("celsius"),
});

export class WeatherTool implements AgentTool<typeof weatherInputSchema> {
  public readonly name = "getWeather";
  public readonly description = "Fetches current weather conditions for a given city.";
  public readonly inputSchema = weatherInputSchema;
  public readonly isMutating = false;
  public readonly isConcurrencySafe = true;

  public async execute(
    input: z.infer<typeof weatherInputSchema>,
    context: ToolExecutionContext,
  ) {
    // Context provides workingDirectory, threadId, abortSignal, and event queue
    return {
      city: input.city,
      temperature: 21,
      units: input.units,
      condition: "Sunny",
    };
  }
}

// Register with your registry
const tools = new ToolRegistry();
tools.register(new WeatherTool());
```

---

## 💾 Durable State & Thread Persistence

### Storage Precedence

Hernex resolves its root data directory using the following precedence:
1. Explicit option passed to store constructor: `{ homeDirectory: "/custom/path" }`
2. `HERNEX_HOME` environment variable
3. Default user home directory fallback: `~/.greg`

### Directory Layout

When using `FileThreadStore` and `FileCheckpointStore`, state is organized cleanly on disk:

```
~/.greg/ (or $HERNEX_HOME)
├── threads/
│   └── th_4a9b2c8e1f023d/
│       ├── thread.json                <-- Thread metadata, status, token metrics
│       ├── transcript.jsonl           <-- Authoritative append-only event stream
│       └── checkpoints/
│           └── manifest.json          <-- Checkpoint records and file snapshot indexes
└── blobs/
    └── sha256/
        ├── 8f4a3c2...                 <-- Content-addressed deduplicated file blob
        └── e3b0c44...
```

### ThreadStore Implementations

- **`MemoryThreadStore`**: Ephemeral, in-memory store for unit tests, isolated CI runs, or temporary agents.
- **`FileThreadStore`**: Durable store persisting metadata and an append-only JSON Lines `transcript.jsonl` log.

```typescript
import { FileThreadStore } from "@amaranthic/hernex";

const store = new FileThreadStore();

// Create thread
const thread = await store.createThread({
  workingDirectory: "/workspace/my-project",
  model: "openai/gpt-4o",
  title: "Refactor Authentication",
  tags: ["refactor", "security"],
});

// Append transcript entries atomically
await store.appendTranscript(thread.id, {
  type: "user",
  message: { role: "user", content: "Audit oauth flow" },
});

// Load full conversation history
const messages = await store.loadMessages(thread.id);
```

### Advisory File Locking (`withFileLock`)

All file-backed stores use advisory file locks with exponential backoff and stale-lock recovery to guarantee crash-safe, concurrent process access:

```typescript
import { withFileLock } from "@amaranthic/hernex";

await withFileLock("/path/to/data.json", async () => {
  // Critical section: safely read, transform, and write data.json
});
```

---

## 📸 Content-Addressed Delta Checkpointing

`FileCheckpointStore` tracks and reverts file system modifications made by agents without relying on external version control systems like git.

### Automatic Pre-Mutation Snapshots

When an `AgentEngine` is configured with a `checkpointStore`, any tool declaring `isMutating === true` triggers an automatic delta snapshot immediately before the tool executes:

```typescript
import { FileCheckpointStore, AgentEngine, ToolRegistry } from "@amaranthic/hernex";

const checkpointStore = new FileCheckpointStore();

const engine = new AgentEngine({
  threadId: "th_demo_01",
  workingDirectory: process.cwd(),
  model: "openai/gpt-4o",
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
  tools: new ToolRegistry(),
  checkpointStore, // Activates automatic pre-mutation delta snapshots
});
```

### Conflict-Aware Restore Planning

Before restoring a checkpoint, Hernex builds a `RestorePlan` and verifies workspace integrity:

1. Computes the SHA-256 hash of each affected file currently on disk.
2. Checks if any file was modified externally after the checkpoint was created.
3. If an unexpected external modification is detected, restore aborts and throws `HernexCheckpointConflictError`:

```typescript
import { FileCheckpointStore, HernexCheckpointConflictError } from "@amaranthic/hernex";

const store = new FileCheckpointStore();

try {
  // Attempt safe rollback
  const result = await store.restoreCheckpoint("th_demo_01", "cp_001", process.cwd());
  console.log(`Restored ${result.restoredFiles.length} files successfully.`);
} catch (error) {
  if (error instanceof HernexCheckpointConflictError) {
    console.error("Conflict detected: Workspace files were modified externally!");
    console.error("Conflicting paths:", error.conflicts);
  }
}
```

### Forced Restores

To overwrite external modifications and force a rollback to the exact checkpoint state:

```typescript
await store.restoreCheckpoint("th_demo_01", "cp_001", process.cwd(), { force: true });
```

---

## 🛡️ Security Boundaries & Threat Model

### Workspace Path Containment

All file system tools (`readFile`, `writeFile`, `editFile`, `glob`, `grep`) validate paths using `resolvePathWithinWorkspace`:

- **Path Traversal Protection**: Rejects paths containing directory traversal segments (e.g., `../../etc/passwd`).
- **Symlink Containment**: Resolves real filesystem paths using `realpath` to prevent symlinks from pointing outside the workspace boundary.
- **Root Jail**: Paths resolving outside the configured `workingDirectory` throw a containment error before any file descriptor is opened.

```typescript
import { resolvePathWithinWorkspace } from "@amaranthic/hernex";

// Returns canonical absolute path
const safePath = resolvePathWithinWorkspace("src/index.ts", "/workspace/repo");

// Throws Error: Path "/workspace/repo/../../etc/shadow" escapes workspace root "/workspace/repo"
resolvePathWithinWorkspace("../../etc/shadow", "/workspace/repo");
```

### Bash Subprocess Sanitization

The `bash` tool executes shell commands in a sanitized environment via `getSafeBashEnvironment()`:
- Strips ambient API keys, tokens, and authorization headers (`*KEY*`, `*TOKEN*`, `*SECRET*`, `*AUTH*`, `AWS_*`, `OPENAI_*`, `ANTHROPIC_*`, `GITHUB_*`).
- Preserves foundational system path variables (`PATH`, `HOME`, `SHELL`, `LANG`, `TERM`, `TMPDIR`).
- Injects `CI=1` and `NONINTERACTIVE=1` to discourage commands from blocking on interactive stdin prompts.

### Host Isolation Scope

> [!WARNING]
> While Hernex strips ambient secrets from subprocess environments and jails file operations within the workspace, `BashTool` commands run natively on the host system with the privileges of the active process. Downstream applications executing untrusted prompts should run Hernex inside a hardware-isolated environment (such as a Docker container, Firecracker microVM, or gVisor sandbox).

---

## 🔌 Raw AI SDK Escape Hatch (`@amaranthic/hernex/ai`)

Hernex re-exports 100% of the native Vercel AI SDK through the `@amaranthic/hernex/ai` subpath. Use this escape hatch when you need unadulterated access to lower-level primitives, custom streaming transformations, or direct provider clients:

```typescript
import {
  generateText,
  streamText,
  generateObject,
  streamObject,
  tool,
  smoothStream,
  type LanguageModel,
} from "@amaranthic/hernex/ai";

// Standard Vercel AI SDK usage without Hernex runtime wrappers
const result = await generateText({
  model: myCustomModel,
  prompt: "Direct AI SDK generation",
});
```

---

## 🚨 Error Hierarchy

Hernex exports structured error classes for programmatic handling:

```
Error
 ├── InvalidModelStringError          (Model string syntax errors, missing slashes)
 ├── MissingCredentialsError          (Missing apiKey or baseUrl)
 ├── UnsupportedProviderError         (Provider adapter not found in registry)
 ├── HernexStoreError                 (Thread or checkpoint storage failures)
 ├── HernexLockError                  (File lock timeout or acquisition failures)
 └── HernexCheckpointConflictError    (Checkpoint rollback collision with external edits)
```

### Handling Examples

```typescript
import {
  generateText,
  InvalidModelStringError,
  MissingCredentialsError,
  UnsupportedProviderError,
} from "@amaranthic/hernex";

try {
  await generateText({
    model: "unknown-provider/model",
    apiKey: "key",
    baseUrl: "https://api.example.com",
    prompt: "Hello",
  });
} catch (error) {
  if (error instanceof UnsupportedProviderError) {
    console.error(`Unsupported provider "${error.provider}". Available: ${error.availableProviders.join(", ")}`);
  } else if (error instanceof InvalidModelStringError) {
    console.error(`Malformed model string "${error.modelString}": ${error.reason}`);
  } else if (error instanceof MissingCredentialsError) {
    console.error(`Missing required credential: ${error.missingField}`);
  }
}
```

---

## 🧪 Development & Verification

Hernex uses `npm` strictly for package management and `bun` for testing, typechecking, and compilation.

```bash
# Install dependencies
npm install

# Typecheck source and test suites with zero errors
bun run typecheck

# Run test suites (8 suites covering all core modules)
bun test

# Build production ESM output to dist/
bun run build

# Verify package distribution contents
npm pack --dry-run

# Run smoke test example
bun run examples/example.ts --smoke
```

---

## 📄 License

[MIT](LICENSE) © [Amaranthic](https://github.com/amaranthic)
