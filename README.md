# @amaranthic/hernex

[![license](https://img.shields.io/npm/l/@amaranthic/hernex.svg?style=flat-square&color=blue)](LICENSE)
[![bun](https://img.shields.io/badge/tested%20with-bun-fbf0df.svg?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)
[![node](https://img.shields.io/badge/node-%3E%3D22.0.0-339933.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

> **The unified AI agent runtime, microkernel engine, and tool execution harness built on Vercel AI SDK.**

`@amaranthic/hernex` combines dynamic single-string model resolution, mandatory per-request credentials, autonomous multi-step turn orchestration, durable thread persistence, and content-addressed delta checkpointing into a single ESM package.

---

## ⚡ What is Hernex?

Hernex provides the foundational execution microkernel and runtime for building autonomous AI agents and harnesses:
- **First-Slash Model Routing**: Parse `provider/model_id` strings dynamically without importing individual provider SDKs.
- **Mandatory Explicit Credentials**: Eliminate ambient `process.env` singletons with per-request `apiKey` and `baseUrl`.
- **Autonomous Turn Loop (`AgentEngine`)**: Multi-step agent execution with dual outward streaming events (`tokenDelta`, `thoughtDelta`, `toolCallProposed`, `stepFinished`, `turnFinished`) and inward interception hooks (`onPreTurn`, `onAuthorizeTool`, `onShouldStop`).
- **First-Class Tool Contracts**: Tools declare `isMutating` (triggers checkpoints) and `isConcurrencySafe` (serialized via `ToolExecutionQueue` when false).
- **Workspace Security**: Path containment guard prevents directory traversal (`..`) and symlink escapes; shell execution strips host secrets.
- **Durable State**: Native `ThreadStore` (append-only `transcript.jsonl`) and `CheckpointStore` (SHA-256 content-addressed file blobs with restore conflict detection).
- **Raw AI SDK Escape Hatch**: Full native Vercel AI SDK capabilities available via `@amaranthic/hernex/ai`.

---

## 📦 Installation

```bash
npm install @amaranthic/hernex
```

*(Or using Bun / pnpm / yarn)*

---

## 🚀 Quick Start

### 1. Simple Text Generation

```typescript
import { generateText } from "@amaranthic/hernex";

const result = await generateText({
  model: "openai/gpt-4o",
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
  prompt: "Explain quantum computing in one sentence.",
});

console.log(result.text);
```

### 2. Autonomous Multi-Step Agent Turn

```typescript
import { AgentEngine, ToolRegistry } from "@amaranthic/hernex";

const tools = new ToolRegistry(); // Bundles readFile, writeFile, editFile, bash, glob, grep

const engine = new AgentEngine({
  threadId: "th_demo_01",
  workingDirectory: process.cwd(),
  model: "openai/gpt-4o",
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
  instructions: "You are an autonomous coding assistant.",
  tools,
});

for await (const event of engine.runTurn("Inspect package.json and summarize our dependencies")) {
  if (event.type === "tokenDelta") {
    process.stdout.write(event.text);
  } else if (event.type === "toolCallProposed") {
    console.log(`\n[Tool Proposed: ${event.toolName}]`);
  } else if (event.type === "turnFinished") {
    console.log(`\n[Turn Complete: ${event.finishReason}]`);
  }
}
```

---

## 🎯 Model Resolution & The First-Slash Rule

Hernex resolves model strings by splitting strictly on the **first `/` only**:
- Segment before `/` = `provider` identifier.
- Everything after `/` = `modelId` (preserving all subsequent slashes).

| Model String | Provider | Model ID |
|---|---|---|
| `openai/gpt-4o` | `openai` | `gpt-4o` |
| `anthropic/claude-3-5-sonnet` | `anthropic` | `claude-3-5-sonnet` |
| `google/gemini-2.5-flash` | `google` | `gemini-2.5-flash` |
| `openrouter/openrouter/free` | `openrouter` | `openrouter/free` |
| `compatible/org/custom-model` | `compatible` | `org/custom-model` |

### Bundled Provider Adapters
Hernex includes 13 built-in provider adapters:
`openai`, `anthropic`, `google`, `xai`, `deepseek`, `groq`, `mistral`, `cohere`, `togetherai`, `alibaba`, `openrouter`, `compatible`, and `vercelgateway`.

### Custom Provider Registration
```typescript
import { createProviderRegistry, generateText } from "@amaranthic/hernex";

const registry = createProviderRegistry();
registry.register({
  providerId: "my-custom-provider",
  createModel: (modelId, credentials) => {
    // Return an instantiated LanguageModel
  },
});

await generateText({
  model: "my-custom-provider/my-model",
  apiKey: "secret",
  baseUrl: "https://my-endpoint.example",
  registry,
  prompt: "Hello custom provider",
});
```

---

## 🛠️ Built-in Tools & Concurrency

Hernex provides 6 standard filesystem and shell tools:
1. `readFile`: Safely reads file contents with 1-based line pagination, binary rejection, and character limits.
2. `writeFile`: Atomically writes files to workspace with automatic parent directory creation.
3. `editFile`: Surgical in-place text replacement with uniqueness enforcement and literal string matching.
4. `bash`: Subprocess execution with sanitized environment, streaming deltas, and process termination.
5. `glob`: Fast workspace pattern matching, excluding `.git` and `node_modules`.
6. `grep`: Fast line-by-line regex search with match bounds and binary filtering.

### Concurrency Guarantees
- Read-only tools (`readFile`, `glob`, `grep`) declare `isConcurrencySafe: true` and execute concurrently.
- Mutating tools (`writeFile`, `editFile`, `bash`) declare `isConcurrencySafe: false` and are serialized through `ToolExecutionQueue`.

---

## 🛡️ Security Boundaries

- **Workspace Path Containment**: Every file tool validates target paths with `resolvePathWithinWorkspace`, rejecting `..` traversal and symlink escapes outside the workspace root.
- **Environment Sanitization**: `bash` executes with a sanitized environment that strips ambient host API keys, access tokens, and credential secrets.
- **Note**: `bash` execution runs natively on the host machine in the configured working directory; downstream products desiring full isolation should run Hernex inside a container or VM.

---

## 💾 Threads & Checkpointing

### Storage Precedence
Hernex stores state in:
1. Explicit `homeDirectory` option
2. `HERNEX_HOME` environment variable
3. Default `~/.greg` fallback

### Thread Persistence
- `MemoryThreadStore`: In-memory store for ephemeral and testing workloads.
- `FileThreadStore`: Durable persistence storing `thread.json` summary and append-only `transcript.jsonl`.

```typescript
import { FileThreadStore, AgentEngine, ToolRegistry } from "@amaranthic/hernex";

const threadStore = new FileThreadStore();
const thread = await threadStore.createThread({
  workingDirectory: process.cwd(),
  model: "openai/gpt-4o",
});

// Resume session from disk
const engine = await AgentEngine.fromThread(thread.id, {
  threadStore,
  tools: new ToolRegistry(),
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
});
```

### Content-Addressed Delta Checkpointing
`FileCheckpointStore` takes before/after file snapshots with SHA-256 content-addressed blobs.
When restoring, Hernex detects conflicts if files were modified externally and requires `{ force: true }` to overwrite unexpected changes.

---

## 🔌 Raw AI SDK Escape Hatch

To access unadulterated Vercel AI SDK functions without Hernex credential enforcement or routing:

```typescript
import { generateText, tool } from "@amaranthic/hernex/ai";
```

---

## 🧪 Development & Testing

```bash
# Typecheck source and tests
bun run typecheck

# Run test suites (8 comprehensive suites in tests/)
bun test

# Build distribution files
bun run build
```

---

## 📄 License

[MIT](LICENSE) © [Amaranthic](https://github.com/amaranthic)
