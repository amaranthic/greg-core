# @amaranthic/greg-sdk

[![npm version](https://img.shields.io/npm/v/@amaranthic/greg-sdk.svg?style=flat-square&color=black)](https://www.npmjs.com/package/@amaranthic/greg-sdk)
[![license](https://img.shields.io/npm/l/@amaranthic/greg-sdk.svg?style=flat-square&color=blue)](LICENSE)
[![bun](https://img.shields.io/badge/tested%20with-bun-fbf0df.svg?style=flat-square&logo=bun&logoColor=black)](https://bun.sh)
[![node](https://img.shields.io/badge/node-%3E%3D22.0.0-339933.svg?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/types-TypeScript-3178C6.svg?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org)

> **The unified agent runtime powering Greg harnesses, built on Vercel AI SDK.**

Greg SDK is the foundational runtime layer powering the Greg agent ecosystem—including **Greg Code**, **Greg Actions**, **Greg ACP**, and custom coding harnesses. Built directly on top of [Vercel AI SDK v7](https://ai-sdk.dev), it provides single-string model resolution, mandatory per-request credentials, and zero-compromise SDK capability preservation.

---

## ⚡ What is Greg SDK?

Greg SDK acts as a dynamic **agent runtime** between your application and model providers. Instead of importing separate provider packages and configuring environment singletons, you supply a single model identifier string (`provider/model_id`) alongside explicit credentials (`apiKey` and `baseUrl`) on every request.

```typescript
import { generateText } from "@amaranthic/greg-sdk";

const result = await generateText({
  model: "openai/gpt-4o",
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
  prompt: "What is quantum computing?",
});

console.log(result.text);
```

---

## 🎯 Scope & Capabilities

### ✅ What Greg SDK Supports
- **Text Generation**: `generateText` with full token usage, step results, and response messages.
- **Real-Time Streaming**: `streamText` with live text deltas (`textStream`), full stream parts (`stream`), and stream response helpers (`toUIMessageStream`, `createTextStreamResponse`).
- **Structured Outputs**: `generateObject` and `streamObject` validating JSON output against Zod or standard schemas.
- **Multi-Step Tool Calling & Agents**: Native `tool()` support with `inputSchema`, multi-turn execution loops via `stopWhen: isStepCount(n)`, and conversation history preservation via `result.responseMessages`.
- **Custom Endpoints**: OpenAI-compatible routing via the `compatible/` prefix (e.g. vLLM, Ollama, LM Studio, proxies).
- **Provider-Specific Settings**: Direct passthrough of `providerOptions` (e.g. reasoning effort, safety settings, thinking budget, prompt caching).
- **100% AI SDK Parity**: All native exports (`ToolLoopAgent`, `tool`, `isStepCount`, error classes, prompts, middleware) are directly re-exported.

---

## 🚫 Deliberate Limitations & What is NOT Supported

> [!IMPORTANT]
> **No Image Generation (`generateImage`) Support**
> Greg SDK is strictly an **agent and language model runtime**. It does **not** support image generation models (such as DALL-E, Imagen, Stable Diffusion, or Midjourney) or the `generateImage` function.
>
> If your application requires image synthesis, use the native provider packages (e.g. `@ai-sdk/openai`, `@ai-sdk/google`) or dedicated media APIs directly.

- **❌ No Video or Audio Generation (`generateSpeech`)**: Media generation APIs are outside the scope of Greg's agent runtime.
- **❌ No Ambient Environment Variable Singletons**: Greg SDK **never** falls back to `process.env.OPENAI_API_KEY` or similar globals. Every invocation requires explicit `apiKey` and `baseUrl`.
- **❌ No Silent AI Gateway Fallthrough**: Model strings never silently route to default Vercel AI Gateway endpoints.

---

## 📐 Core Architecture & Rules

### 1. The First-Slash Rule
Model strings are split on the **first `/` only**:
- Segment before the first slash: **`provider`**
- All segments after the first slash: **`modelId`** (preserved completely intact)

| Input String | Provider | Model ID | Notes |
|---|---|---|---|
| `openai/gpt-4o` | `openai` | `gpt-4o` | Standard model |
| `anthropic/claude-3-7-sonnet` | `anthropic` | `claude-3-7-sonnet` | Standard model |
| `google/gemini-2.5-flash-lite` | `google` | `gemini-2.5-flash-lite` | Standard model |
| `openrouter/openrouter/free` | `openrouter` | `openrouter/free` | Multi-slash model ID preserved |
| `compatible/meta-llama/llama-3-8b` | `compatible` | `meta-llama/llama-3-8b` | Nested model ID preserved |
| `gpt-4o` | *None* | *None* | ❌ Throws `InvalidModelStringError` |

### 2. Mandatory `apiKey` and `baseUrl`
Every Greg call **requires** both `apiKey: string` and `baseUrl: string`. No provider is exempt.
- Eliminates hidden reliance on ambient `process.env` singletons.
- Guarantees multi-tenant isolation and prevents credential leakage across concurrent requests.
- Greg automatically adapts its public `baseUrl` to provider-expected internal spellings (e.g. `baseURL`).

### 3. Stateless Multi-Tenant Concurrency
Provider instances are constructed dynamically in local function call frames. There is zero global state or shared cache:
- User A with Key A and User B with Key B can invoke Greg concurrently with zero risk of cross-tenant credential contamination.

---

## 🤖 Guide for AI Coding Agents & LLMs

If you are an autonomous coding agent (Cursor, Claude Code, Antigravity, Copilot, Windsurf) generating code with `@amaranthic/greg-sdk`, adhere to these operational rules:

1. **Always Supply `apiKey` and `baseUrl`**: Never omit either field when invoking `generateText`, `streamText`, `generateObject`, or `streamObject`.
2. **Do Not Attempt Image Generation**: Never call `generateImage` through Greg SDK. Use native SDKs for image generation tasks.
3. **Use Vercel AI SDK v7 Tool Definitions**:
   - Use `inputSchema: z.object(...)` instead of legacy v6 `parameters`.
   - Use `stopWhen: isStepCount(n)` instead of legacy `maxSteps`.
4. **Preserve Conversation History**:
   - In multi-turn chat agents, always append `result.responseMessages` to your messages array so tool call invocations and results remain in context.
5. **Stream Tool Calls Correctly**:
   - Iterate `result.stream` to handle `tool-call`, `tool-result`, and `text-delta`.
   - Iterate `result.textStream` only when purely streaming assistant text deltas.

---

## 📦 Installation

```bash
npm install @amaranthic/greg-sdk
# or
bun add @amaranthic/greg-sdk
```

> **Runtime Requirements:** Node.js &ge; 22.0.0 or Bun &ge; 1.0. ESM only (`"type": "module"`).

---

## 🚀 Usage Guide

### 1. Text Generation (`generateText`)

```typescript
import { generateText } from "@amaranthic/greg-sdk";

const result = await generateText({
  model: "google/gemini-2.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY!,
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  instructions: "You are an expert systems programmer.",
  prompt: "Explain memory safety in Rust.",
});

console.log(result.text);
console.log(`Tokens used: ${result.usage.totalTokens}`);
```

---

### 2. Live Token Streaming (`streamText`)

```typescript
import { streamText } from "@amaranthic/greg-sdk";

const result = streamText({
  model: "anthropic/claude-3-7-sonnet-20250219",
  apiKey: process.env.ANTHROPIC_API_KEY!,
  baseUrl: "https://api.anthropic.com/v1",
  prompt: "Write a short poem about distributed systems.",
});

for await (const delta of result.textStream) {
  process.stdout.write(delta);
}
```

---

### 3. Structured Output (`generateObject`)

```typescript
import { generateObject } from "@amaranthic/greg-sdk";
import { z } from "zod";

const result = await generateObject({
  model: "openai/gpt-4o",
  apiKey: process.env.OPENAI_API_KEY!,
  baseUrl: "https://api.openai.com/v1",
  schema: z.object({
    sentiment: z.enum(["positive", "neutral", "negative"]),
    confidence: z.number().min(0).max(1),
    summary: z.string(),
  }),
  prompt: "Analyze user feedback: 'The tool is lightning fast but lacks dark mode.'",
});

console.log(result.object.sentiment); // "positive"
console.log(result.object.confidence); // 0.95
```

---

### 4. Multi-Step Tool Calling & Agents

In AI SDK v7, tools are declared using `inputSchema` (instead of `parameters`) and multi-turn loops are enabled using `stopWhen: isStepCount(n)`:

```typescript
import { streamText, tool, isStepCount } from "@amaranthic/greg-sdk";
import { z } from "zod";

const getTimeTool = tool({
  description: "Returns the current system timestamp.",
  inputSchema: z.object({}),
  execute: async () => ({ isoTime: new Date().toISOString() }),
});

const result = streamText({
  model: "groq/llama-3.3-70b-versatile",
  apiKey: process.env.GROQ_API_KEY!,
  baseUrl: "https://api.groq.com/openai/v1",
  tools: {
    getTime: getTimeTool,
  },
  stopWhen: isStepCount(5), // Automatically loops until tool results are synthesized
  prompt: "What time is it right now?",
});

for await (const part of result.stream) {
  if (part.type === "text-delta") {
    process.stdout.write(part.text);
  } else if (part.type === "tool-call") {
    console.log(`\n[Invoking tool: ${part.toolName}]`);
  }
}

// Preserve all messages (including tool calls & results) across conversation turns:
const updatedHistory = await result.responseMessages;
```

---

### 5. Custom OpenAI-Compatible Endpoints (`compatible/`)

To route requests to any self-hosted vLLM, Ollama, LM Studio, or third-party proxy endpoint:

```typescript
import { generateText } from "@amaranthic/greg-sdk";

const result = await generateText({
  model: "compatible/meta-llama/Llama-3-8b-Instruct",
  apiKey: "custom-token-or-dummy",
  baseUrl: "http://localhost:8000/v1",
  prompt: "Hello from local inference!",
});

console.log(result.text);
```

---

### 6. Provider-Specific Options (`providerOptions`)

Provider-specific settings are forwarded directly to the native SDK:

```typescript
import { generateText } from "@amaranthic/greg-sdk";

const result = await generateText({
  model: "google/gemini-2.5-flash-lite",
  apiKey: process.env.GEMINI_API_KEY!,
  baseUrl: "https://generativelanguage.googleapis.com/v1beta",
  prompt: "Solve this mathematical puzzle.",
  providerOptions: {
    google: {
      thinkingConfig: { thinkingBudget: 2048 },
      safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_LOW_AND_ABOVE" }
      ],
    },
    openai: {
      reasoningEffort: "medium",
    },
    anthropic: {
      cacheControl: { type: "ephemeral" },
    },
  },
});
```

---

## 🌐 Supported Built-in Providers

Greg pre-bundles the following 12 provider adapters:

| Provider Key | Native Package | Default Base URL | Model Examples |
|---|---|---|---|
| `openai` | `@ai-sdk/openai` | `https://api.openai.com/v1` (Responses API) | `openai/gpt-4o`, `openai/o3-mini` |
| `anthropic` | `@ai-sdk/anthropic` | `https://api.anthropic.com/v1` | `anthropic/claude-3-7-sonnet` |
| `google` | `@ai-sdk/google` | `https://generativelanguage.googleapis.com/v1beta` | `google/gemini-2.5-flash-lite` |
| `xai` | `@ai-sdk/xai` | `https://api.x.ai/v1` (Responses API) | `xai/grok-2-1212` |
| `deepseek` | `@ai-sdk/deepseek` | `https://api.deepseek.com` | `deepseek/deepseek-chat`, `deepseek/deepseek-reasoner` |
| `groq` | `@ai-sdk/groq` | `https://api.groq.com/openai/v1` | `groq/llama-3.3-70b-versatile` |
| `mistral` | `@ai-sdk/mistral` | `https://api.mistral.ai/v1` | `mistral/mistral-large-latest` |
| `cohere` | `@ai-sdk/cohere` | `https://api.cohere.com/v2` | `cohere/command-r-plus` |
| `togetherai` | `@ai-sdk/togetherai` | `https://api.together.xyz/v1` | `togetherai/meta-llama/Llama-3-70b-chat-hf` |
| `alibaba` | `@ai-sdk/alibaba` | `https://dashscope-intl.aliyuncs.com/compatible-mode/v1` | `alibaba/qwen-max`, `alibaba/qwen-plus` |
| `openrouter` | `@ai-sdk/openai-compatible` | `https://openrouter.ai/api/v1` | `openrouter/openrouter/free` |
| `compatible` | `@ai-sdk/openai-compatible` | Custom URL (required) | `compatible/org/model-name` |

---

## 🛡️ Error Handling

All Greg errors inherit from the native `AISDKError` with type guards:

```typescript
import {
  generateText,
  InvalidModelStringError,
  MissingCredentialsError,
  UnsupportedProviderError,
} from "@amaranthic/greg-sdk";

try {
  await generateText({
    model: "invalid-string",
    apiKey: "",
    baseUrl: "",
    prompt: "Hello",
  });
} catch (error) {
  if (InvalidModelStringError.isInstance(error)) {
    console.error(`Malformed model string: "${error.modelString}"`);
  } else if (MissingCredentialsError.isInstance(error)) {
    console.error(`Missing field: ${error.missingField} for provider: ${error.provider}`);
  } else if (UnsupportedProviderError.isInstance(error)) {
    console.error(`Unknown provider: ${error.provider}`);
    console.error(`Supported: ${error.supportedProviders.join(", ")}`);
  }
}
```

---

## 🛠️ Testing & Quality Standards

- **Strict Test Suite**: Exactly 6 high-coverage test suites in `tests/` covering parsing, validation, mock servers, provider resolution, and execution pass-through.
- **Automated Parity Audit**: Continuously asserts that 100% of public exports from the pinned `ai` release are present.
- **Runner**: Tested natively with `bun test`.

```bash
bun test
```

---

## License

[MIT](LICENSE) © [Amaranthic](https://github.com/amaranthic)
