# @amaranthic/greg-agent-core

[![npm version](https://img.shields.io/npm/v/@amaranthic/greg-agent-core.svg?style=flat-square&color=black)](https://www.npmjs.com/package/@amaranthic/greg-agent-core)
[![license](https://img.shields.io/npm/l/@amaranthic/greg-agent-core.svg?style=flat-square&color=blue)](LICENSE)
[![bun](https://img.shields.io/badge/tested%20with-bun-fbf0df.svg?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)
[![node](https://img.shields.io/badge/node-%3E%3D22.0.0-339933.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

> **The unopinionated agent microkernel powering Greg CLI, Greg ACP, and custom coding harnesses.**

`@amaranthic/greg-agent-core` is the central execution microkernel of the Greg agent ecosystem. Built directly on top of [`@amaranthic/greg-sdk`](https://www.npmjs.com/package/@amaranthic/greg-sdk) and [Vercel AI SDK v7](https://ai-sdk.dev), it coordinates autonomous multi-step turn loops, fine-grained event streams, mutating file checkpoints, and lifecycle hooks while leaving all policy, UI, and storage decisions to downstream products.

---

## ⚡ What is Greg Agent Core?

Most agent frameworks bundle opinionated UI elements, hardcoded permission prompts, and rigid disk storage mechanisms directly into their core loops. 

`greg-agent-core` takes a strict **microkernel** approach:
- **No policy decisions**: It does not enforce when to ask users for permissions, how to display diffs, or where to persist databases.
- **Dual Control Bus**:
  - **Outward Events (`AgentEvent`)**: Fine-grained streaming deltas (`tokenDelta`, `thoughtDelta`), proposed tool calls (`toolCallProposed`), step boundaries (`stepStarted`, `stepFinished`), and checkpoints (`checkpointCreated`).
  - **Inward Hooks (`AgentHooks`)**: Downstream applications control authorization (`onAuthorizeTool`), goal completion checks (`onShouldStop`), storage persistence (`onThreadUpdate`), and error diagnostics (`onError`).
- **Autonomous Multi-Step Turn Loop**: Executes autonomous LLM tool-calling loops with turn bounds, queue serialization, and token usage accounting.

```typescript
import { AgentEngine, ToolRegistry } from "@amaranthic/greg-agent-core";

const engine = new AgentEngine({
  threadId: "th_dev_001",
  workingDirectory: process.cwd(),
  model: "anthropic/claude-3-7-sonnet",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseUrl: "https://api.anthropic.com/v1",
  tools: new ToolRegistry(), // Includes 6 built-in tools by default
  reasoning: "high",         // AI SDK v7 portable reasoning effort
});

for await (const event of engine.runTurn("Search for all auth handlers and summarize them")) {
  switch (event.type) {
    case "tokenDelta":
      process.stdout.write(event.text);
      break;
    case "thoughtDelta":
      process.stdout.write(`[Thinking] ${event.text}`);
      break;
    case "toolCallProposed":
      console.log(`\n⚙ Proposing tool: ${event.toolName}`);
      break;
    case "toolExecutionFinished":
      console.log(`\n✓ Finished ${event.toolName} in ${event.durationMs}ms`);
      break;
  }
}
```

---

## 🏛️ Microkernel Architecture & Design Principles

### 1. Dual Control Bus Architecture

The engine communicates with consumer products through two decoupled channels:

```
┌────────────────────────────────────────────────────────┐
│                   Consumer Product                     │
│         (Greg CLI / Greg ACP / Greg Actions)           │
└───────────────┬────────────────────────▲───────────────┘
  Inward Hooks: │                        │ Outward Events:
  onAuthorizeTool                        │ tokenDelta, thoughtDelta
  onShouldStop  │                        │ toolCallProposed, toolExecutionDelta
  onThreadUpdate                         │ checkpointCreated, turnFinished
  onPreTurn     ▼                        │
┌────────────────────────────────────────────────────────┐
│                   AgentEngine Core                     │
│               (Autonomous Turn Loop)                   │
└────────────────────────────────────────────────────────┘
```

1. **Outward Events**: The engine is an `AsyncGenerator<AgentEvent, void, void>`. Consumer applications iterate through the stream to update terminal interfaces, web clients, or event streams.
2. **Inward Hooks**: Defined in `AgentHooks`, hooks allow the product to intercept decisions (e.g. prompt the user for permission, inject custom instructions, or reject tool calls).

---

### 2. Strict Tool Concurrency & Mutation Invariants

Every tool in `greg-agent-core` implements the `AgentTool` contract with two mandatory boolean properties:

```typescript
export interface AgentTool<TInput extends z.ZodTypeAny = z.ZodTypeAny, TOutput = unknown> {
  readonly name: string;
  readonly description: string;
  readonly inputSchema: TInput;
  readonly isMutating: boolean;         // MANDATORY: Triggers checkpoints before mutation
  readonly isConcurrencySafe: boolean;  // MANDATORY: Serialized via ToolExecutionQueue if false
  execute(parameters: z.infer<TInput>, context: ToolExecutionContext): Promise<TOutput>;
}
```

- **`isMutating`**:
  - `false` (e.g. `readFile`, `glob`, `grep`): Safe to run without capturing disk state.
  - `true` (e.g. `writeFile`, `editFile`, `bash`): Triggers a content-addressed checkpoint snapshot (`checkpointCreated` event and `onCheckpointCreated` hook) **before** the tool is executed.
- **`isConcurrencySafe`**:
  - `true`: Concurrency-safe tools run in parallel when called concurrently.
  - `false`: Automatically serialized through `ToolExecutionQueue`, preventing race conditions on disk or environment state.

---

### 3. Content-Addressed Delta Checkpointing

Checkpoints avoid naive full-disk copies. Instead, they capture **content-addressed delta records**:
- Stored as raw bytes in `checkpoints/blobs/<sha256>`. If multiple files share content, only one blob is stored.
- Three-way status tracking per file:
  - `'+'` (Created)
  - `'~'` (Modified)
  - `'-'` (Deleted)
- **Safe Conflict Detection**: Before rollbacks, the restoration engine verifies current disk hashes against `afterHash`. If external manual edits are detected, `isConflict: true` is flagged to prevent silent clobbering.

---

### 4. Portable AI SDK v7 Reasoning Support

`greg-agent-core` natively supports the top-level AI SDK v7 `reasoning` parameter across all providers (OpenAI, Anthropic, Google Gemini, DeepSeek, OpenRouter):

```typescript
export type AgentReasoningLevel =
  | 'provider-default'
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'
  | 'max';
```

Reasoning can be set at the engine level (`config.reasoning`) and dynamically overridden per turn (`options.reasoning`).

---

## 🔄 Engine Turn Order (The Strict 10-Step Lifecycle)

Every turn executed by `engine.runTurn()` follows a strictly enforced lifecycle:

1. **`turnStarted` Event**: Emitted with `turnIndex` and the initial `userPrompt`.
2. **`hooks.onPreTurn()`**: The product can inspect the turn, mutate the user prompt, or inject dynamic system instructions.
3. **Model Invocation (`streamText`)**: Called via `@amaranthic/greg-sdk` with active tools converted via `toolRegistry.toSdkToolDefinitions()`.
4. **Chunk Streaming**:
   - Text chunks emit `tokenDelta`.
   - Reasoning chunks emit `thoughtDelta`.
   - Tool calls proposed by the LLM emit `toolCallProposed`.
5. **Tool Authorization (`hooks.onAuthorizeTool()`)**:
   - If denied: Emits `toolExecutionFinished` with `isError: true` and denial reason.
   - If user resolution requested (`askUser`): Emits `toolPermissionRequested` and awaits `resolve()`.
6. **Mutating Checkpoint Capture**:
   - If `tool.isMutating === true`: Emits `checkpointCreated` and calls `hooks.onCheckpointCreated()`.
7. **Tool Execution**:
   - Emits `toolExecutionStarted`.
   - If non-concurrency-safe, queues through `ToolExecutionQueue`.
   - Progress callbacks stream `toolExecutionDelta`.
   - Emits `toolExecutionFinished` with wall-clock execution `durationMs`.
   - Optional output formatting via `hooks.onFormatToolOutput()`.
8. **Message History Synchronization**:
   - Assistant message and native AI SDK `tool-result` parts (`{ type: 'json' | 'text', value }`) are appended to conversation history.
9. **Goal Completion Evaluation (`hooks.onShouldStop()`)**:
   - If the LLM produces no tool calls or proposes stopping, `onShouldStop()` is evaluated.
   - If `shouldStop === false`, the product injects a reminder prompt, and the step loop continues autonomously.
10. **Turn Completion**:
    - Emits `stepFinished` with token usage metrics.
    - Calls `hooks.onThreadUpdate()` to persist messages.
    - Emits `turnFinished` and calls `hooks.onPostTurn()`.

---

## 🛠️ Built-in Tool Suite

`greg-agent-core` includes 6 built-in tools following the Claude Code and Ant tool design patterns:

| Tool Name | Class | Mutating? | Concurrency Safe? | Description |
|:---|:---|:---:|:---:|:---|
| **`readFile`** | `ReadFileTool` | ❌ No | ✅ Yes | Reads file content with offset and line pagination. |
| **`glob`** | `GlobTool` | ❌ No | ✅ Yes | Fast file matching via micromatch patterns. |
| **`grep`** | `GrepTool` | ❌ No | ✅ Yes | Regex and text search across files with line numbers. |
| **`writeFile`** | `WriteFileTool` | ✅ Yes | ❌ No | Writes or overwrites entire files atomically. |
| **`editFile`** | `EditFileTool` | ✅ Yes | ❌ No | Surgical search-and-replace editing with uniqueness checks. |
| **`bash`** | `BashTool` | ✅ Yes | ❌ No | Executes host shell commands with timeout and streaming progress. |

To create a read-only engine (e.g. for inspection or auditing), pass `includeDefaults: false` to `ToolRegistry` and register only the read-only tools:

```typescript
import { ToolRegistry, ReadFileTool, GlobTool, GrepTool } from "@amaranthic/greg-agent-core";

const readOnlyTools = new ToolRegistry({ includeDefaults: false });
readOnlyTools.register(new ReadFileTool());
readOnlyTools.register(new GlobTool());
readOnlyTools.register(new GrepTool());
```

---

## 📦 Installation

```bash
npm install @amaranthic/greg-agent-core @amaranthic/greg-sdk
# or
bun add @amaranthic/greg-agent-core @amaranthic/greg-sdk
```

> **Runtime Requirements:** Node.js &ge; 22.0.0 or Bun &ge; 1.0. ESM only (`"type": "module"`).

---

## 🚀 Usage Guide

### 1. Basic Turn Execution with Streaming

```typescript
import { AgentEngine, ToolRegistry } from "@amaranthic/greg-agent-core";

const engine = new AgentEngine({
  threadId: "th_main",
  workingDirectory: process.cwd(),
  model: "google/gemini-2.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY!,
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  tools: new ToolRegistry(),
});

for await (const event of engine.runTurn("List files in tests/ and check package.json")) {
  if (event.type === "tokenDelta") {
    process.stdout.write(event.text);
  }
}
```

---

### 2. Custom Permission Hooks (`onAuthorizeTool`)

Intercept tool calls before execution to prompt users or enforce security policies:

```typescript
const engine = new AgentEngine({
  threadId: "th_sandboxed",
  workingDirectory: process.cwd(),
  model: "anthropic/claude-3-7-sonnet",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseUrl: "https://api.anthropic.com/v1",
  tools: new ToolRegistry(),
  hooks: {
    onAuthorizeTool: async ({ toolName, parameters, isMutating }) => {
      // Allow read-only tools automatically
      if (!isMutating) {
        return { decision: "allow" };
      }

      // Block dangerous commands
      if (toolName === "bash" && (parameters as any).command?.includes("rm -rf")) {
        return { decision: "deny", reason: "Destructive commands are forbidden." };
      }

      // Require user authorization for file modifications
      return { decision: "askUser" };
    },
  },
});
```

---

### 3. Goal Enforcement & Autonomous Reminders (`onShouldStop`)

Enforce completion criteria (e.g. running unit tests after changes before permitting the agent to conclude):

```typescript
const engine = new AgentEngine({
  threadId: "th_goal",
  workingDirectory: process.cwd(),
  model: "anthropic/claude-3-7-sonnet",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseUrl: "https://api.anthropic.com/v1",
  tools: new ToolRegistry(),
  hooks: {
    onShouldStop: async ({ finishReason, turnIndex }) => {
      const testsPass = await checkTests();

      if (!testsPass) {
        return {
          shouldStop: false,
          reminderPrompt: "The test suite is currently failing. Please fix the broken tests before concluding.",
        };
      }

      return { shouldStop: true };
    },
  },
});
```

---

### 4. Dynamic Model & Reasoning Effort Overrides

You can switch models or adjust reasoning depth on a per-turn basis:

```typescript
// Turn 1: Fast initial exploration
await engine.runTurn({
  userPrompt: "Locate all database connection files",
  model: "google/gemini-2.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY!,
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  reasoning: "low",
});

// Turn 2: Deep reasoning for complex refactoring
await engine.runTurn({
  userPrompt: "Refactor connection pooling logic to prevent socket leaks",
  model: "anthropic/claude-3-7-sonnet",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseUrl: "https://api.anthropic.com/v1",
  reasoning: "max",
});
```

---

## 🤖 Guide for AI Coding Agents & LLMs

If you are an autonomous coding agent (Cursor, Claude Code, Antigravity, Copilot, Windsurf) working on or integrating `@amaranthic/greg-agent-core`:

1. **Do Not Mutate `ModelMessage` Schemas**: Messages appended to `conversationMessages` must strictly conform to native AI SDK v7 schemas. Tool results must specify an `output` object with `{ type: 'json' | 'text', value }`.
2. **Always Implement Tool Invariants**: When adding custom tools, always define both `isMutating: boolean` and `isConcurrencySafe: boolean`.
3. **Keep `ToolExecutionContext` Universal**: Do not attach framework-specific or model-specific properties to `ToolExecutionContext`. It contains strictly universal runtime fields (`threadId`, `toolCallId`, `workingDirectory`, `abortSignal`, `emitProgress`).
4. **Use `toSdkToolDefinitions()` for Engine Execution**: Use `toolRegistry.toSdkToolDefinitions()` when supplying tools to `streamText()` in custom turn loops to pass pure schemas and prevent the AI SDK from bypassing authorization and checkpoint hooks.

---

## 📂 Storage Directory Structure

When threads and checkpoints are persisted to disk by downstream products (e.g. Greg CLI), they follow this standard structure:

```text
~/.greg/threads/<threadId>/
├── thread.json                         # ThreadDocument (metadata, model config, token usage)
├── transcript.jsonl                    # TranscriptEntry append-only session event log
└── checkpoints/
    ├── manifest.json                   # CheckpointManifest (chronological snapshots)
    └── blobs/                          # Content-addressed SHA-256 raw file blobs
        ├── <sha256-hash-1>
        ├── <sha256-hash-2>
        └── <sha256-hash-3>
```

---

## 🧪 Verification & Testing

The monorepo enforces type-safety and high-coverage test suites:

```bash
# Typecheck across the entire monorepo
bun run typecheck

# Run test suites (46 tests across Monorepo)
bun test

# Build distribution packages
bun run build
```

---

## 📄 License

MIT &copy; [Amaranthic](https://github.com/amaranthic)
