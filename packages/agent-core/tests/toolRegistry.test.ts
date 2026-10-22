/**
 * @file toolRegistry.test.ts
 * @description Comprehensive unit test suite for ToolRegistry, ToolExecutionQueue,
 * and built-in tools (readFile, writeFile, editFile, bash, glob, grep).
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { z } from "@amaranthic/greg-sdk";
import { AsyncEventQueue } from "../src/engine/eventQueue.js";
import {
  type AgentTool,
  BashTool,
  EditFileTool,
  GlobTool,
  GrepTool,
  ReadFileTool,
  ToolExecutionQueue,
  ToolRegistry,
  WriteFileTool,
  raceWithSignal,
} from "../src/tools/index.js";

describe("ToolExecutionQueue", () => {
  it("serializes asynchronous tasks strictly in order", async () => {
    const queue = new ToolExecutionQueue();
    const order: number[] = [];

    const task1 = queue.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      order.push(1);
      return "one";
    });

    const task2 = queue.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 10));
      order.push(2);
      return "two";
    });

    const [res1, res2] = await Promise.all([task1, task2]);

    expect(res1).toBe("one");
    expect(res2).toBe("two");
    expect(order).toEqual([1, 2]);
  });

  it("rejects immediately if abort signal is already triggered", async () => {
    const queue = new ToolExecutionQueue();
    const controller = new AbortController();
    controller.abort("User cancelled");

    await expect(
      queue.run(async () => "result", controller.signal),
    ).rejects.toThrow("Tool execution aborted");
  });

  it("handles raceWithSignal when aborted in-flight", async () => {
    const controller = new AbortController();
    const slowTask = new Promise<string>((resolve) =>
      setTimeout(() => resolve("done"), 100),
    );

    setTimeout(() => {
      controller.abort("Timeout");
    }, 10);

    await expect(raceWithSignal(slowTask, controller.signal)).rejects.toThrow(
      "Tool execution aborted",
    );
  });

  it("prevents next queued task from running until aborted task settles", async () => {
    const queue = new ToolExecutionQueue();
    const controller = new AbortController();
    let underlyingTaskSettled = false;
    let nextTaskRanBeforeSettle = false;

    const task1 = queue.run(async () => {
      await new Promise((resolve) => setTimeout(resolve, 30));
      underlyingTaskSettled = true;
      return "task1";
    }, controller.signal);

    // Abort task 1 almost immediately
    setTimeout(() => controller.abort(), 5);

    await expect(task1).rejects.toThrow("Tool execution aborted");

    // Task 2 should only run after task 1 has completely settled
    await queue.run(async () => {
      if (!underlyingTaskSettled) {
        nextTaskRanBeforeSettle = true;
      }
      return "task2";
    });

    expect(nextTaskRanBeforeSettle).toBe(false);
    expect(underlyingTaskSettled).toBe(true);
  });
});

describe("ToolRegistry", () => {
  it("registers all 6 default tools when includeDefaults is true", () => {
    const registry = new ToolRegistry();
    const list = registry.list();

    expect(list.length).toBe(6);
    expect(registry.has("readFile")).toBe(true);
    expect(registry.has("writeFile")).toBe(true);
    expect(registry.has("editFile")).toBe(true);
    expect(registry.has("bash")).toBe(true);
    expect(registry.has("glob")).toBe(true);
    expect(registry.has("grep")).toBe(true);

    expect(registry.isMutating("readFile")).toBe(false);
    expect(registry.isMutating("writeFile")).toBe(true);
    expect(registry.isMutating("editFile")).toBe(true);
    expect(registry.isMutating("bash")).toBe(true);
    expect(registry.isMutating("glob")).toBe(false);
    expect(registry.isMutating("grep")).toBe(false);

    expect(registry.isConcurrencySafe("readFile")).toBe(true);
    expect(registry.isConcurrencySafe("writeFile")).toBe(false);
    expect(registry.isConcurrencySafe("editFile")).toBe(false);
    expect(registry.isConcurrencySafe("bash")).toBe(false);
    expect(registry.isConcurrencySafe("glob")).toBe(true);
    expect(registry.isConcurrencySafe("grep")).toBe(true);
  });

  it("starts empty when includeDefaults is false", () => {
    const registry = new ToolRegistry({ includeDefaults: false });
    expect(registry.list().length).toBe(0);
    expect(registry.has("readFile")).toBe(false);
  });

  it("allows registering, overriding, and unregistering custom tools", () => {
    const registry = new ToolRegistry({ includeDefaults: false });

    const pingSchema = z.object({ msg: z.string() });
    const pingTool: AgentTool<typeof pingSchema, { pong: string }> = {
      name: "ping",
      description: "Ping pong test tool",
      inputSchema: pingSchema,
      isMutating: false,
      isConcurrencySafe: true,
      execute: async (params) => ({ pong: params.msg }),
    };

    registry.register(pingTool);
    expect(registry.has("ping")).toBe(true);
    expect(registry.resolve("ping")).toBe(pingTool);
    expect(registry.isMutating("ping")).toBe(false);
    expect(registry.isConcurrencySafe("ping")).toBe(true);

    const removed = registry.unregister("ping");
    expect(removed).toBe(true);
    expect(registry.has("ping")).toBe(false);
    expect(registry.unregister("ping")).toBe(false);
  });

  it("rejects duplicate tool registration unless allowOverride is explicitly true", () => {
    const registry = new ToolRegistry({ includeDefaults: false });
    const dummyTool: AgentTool = {
      name: "customTool",
      description: "Custom test tool",
      inputSchema: z.object({}),
      isMutating: false,
      isConcurrencySafe: true,
      execute: async () => ({ ok: true }),
    };

    registry.register(dummyTool);
    expect(() => registry.register(dummyTool)).toThrow("already registered");

    // Allows overriding when explicitly configured
    expect(() =>
      registry.register(dummyTool, { allowOverride: true }),
    ).not.toThrow();
  });

  it("streams progress chunks via AsyncEventQueue without timer polling", async () => {
    const queue = new AsyncEventQueue<string>();
    const received: string[] = [];

    const consumer = (async () => {
      for await (const chunk of queue) {
        received.push(chunk);
      }
    })();

    queue.push("delta1");
    queue.push("delta2");
    queue.push("delta3");
    queue.close();

    await consumer;
    expect(received).toEqual(["delta1", "delta2", "delta3"]);
  });

  it("converts registered tools to native AI SDK v7 tool definitions via toSdkTools", async () => {
    const registry = new ToolRegistry({ includeDefaults: false });

    const echoSchema = z.object({ text: z.string() });
    const echoTool: AgentTool<typeof echoSchema, { text: string }> = {
      name: "echo",
      description: "Echoes input text",
      inputSchema: echoSchema,
      isMutating: false,
      isConcurrencySafe: true,
      execute: async (params, ctx) => {
        ctx.emitProgress?.("working...");
        return { text: params.text };
      },
    };

    registry.register(echoTool);

    let progressReceived = "";
    const sdkTools = registry.toSdkTools({
      threadId: "test-thread",
      workingDirectory: process.cwd(),
      onProgress: (chunk) => {
        progressReceived += chunk;
      },
    });

    expect(sdkTools.echo).toBeDefined();
    const sdkTool = sdkTools.echo!;

    expect(sdkTool.description).toBe("Echoes input text");

    if (sdkTool.execute) {
      const result = await sdkTool.execute(
        { text: "hello world" },
        { toolCallId: "call_1", messages: [] },
      );
      expect(result).toEqual({ text: "hello world" });
      expect(progressReceived).toBe("working...");
    } else {
      throw new Error("sdkTool.execute is undefined");
    }
  });

  it("gracefully catches schema validation errors in adapted SDK tools", async () => {
    const registry = new ToolRegistry({ includeDefaults: false });

    const strictSchema = z.object({ age: z.number() });
    const strictTool: AgentTool<typeof strictSchema, string> = {
      name: "strict",
      description: "Strict age validator",
      inputSchema: strictSchema,
      isMutating: false,
      isConcurrencySafe: true,
      execute: async (params) => `Age: ${params.age}`,
    };

    registry.register(strictTool);
    const sdkTools = registry.toSdkTools({
      threadId: "test-thread",
      workingDirectory: process.cwd(),
    });

    const result = (await sdkTools.strict!.execute!(
      { age: "not-a-number" },
      { toolCallId: "call_2", messages: [] },
    )) as { isError: boolean; error: string };

    expect(result.isError).toBe(true);
    expect(result.error.toLowerCase()).toContain("expected number");
  });
});

describe("Built-in File & Shell Tools", () => {
  let testWorkspace: string;

  beforeEach(() => {
    testWorkspace = join(tmpdir(), `greg-agent-test-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    mkdirSync(testWorkspace, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testWorkspace, { recursive: true, force: true });
    } catch {
      // Ignored
    }
  });

  it("executes WriteFileTool and ReadFileTool with offset and line pagination", async () => {
    const writeTool = new WriteFileTool();
    const readTool = new ReadFileTool();

    const writeContext = {
      threadId: "t1",
      toolCallId: "c1",
      workingDirectory: testWorkspace,
    };

    // 1. Write file
    const content = ["line 1", "line 2", "line 3", "line 4", "line 5"].join("\n");
    const writeResult = await writeTool.execute(
      { filePath: "sub/test.txt", content },
      writeContext,
    );

    expect(writeResult.status).toBe("created");
    expect(writeResult.linesWritten).toBe(5);

    // 2. Read full file
    const readResult = await readTool.execute(
      { filePath: "sub/test.txt" },
      writeContext,
    );

    expect(readResult.totalLines).toBe(5);
    expect(readResult.linesReturned).toBe(5);
    expect(readResult.content).toContain("1: line 1");
    expect(readResult.content).toContain("5: line 5");

    // 3. Read slice with offset and limit
    const slicedResult = await readTool.execute(
      { filePath: "sub/test.txt", offset: 2, limit: 2 },
      writeContext,
    );

    expect(slicedResult.totalLines).toBe(5);
    expect(slicedResult.startLine).toBe(2);
    expect(slicedResult.linesReturned).toBe(2);
    expect(slicedResult.content).toBe("2: line 2\n3: line 3");
  });

  it("executes EditFileTool for surgical replacements", async () => {
    const writeTool = new WriteFileTool();
    const editTool = new EditFileTool();

    const context = {
      threadId: "t1",
      toolCallId: "c1",
      workingDirectory: testWorkspace,
    };

    await writeTool.execute(
      {
        filePath: "app.ts",
        content: "const a = 1;\nconst b = 2;\nconst c = 1;\n",
      },
      context,
    );

    // Fails on identical strings
    await expect(
      editTool.execute(
        { filePath: "app.ts", oldString: "const a", newString: "const a" },
        context,
      ),
    ).rejects.toThrow("identical");

    // Fails on duplicate without replaceAll
    await expect(
      editTool.execute(
        { filePath: "app.ts", oldString: "= 1;", newString: "= 10;" },
        context,
      ),
    ).rejects.toThrow("Found 2 matches");

    // Succeeds with replaceAll = true
    const editResult = await editTool.execute(
      {
        filePath: "app.ts",
        oldString: "= 1;",
        newString: "= 10;",
        replaceAll: true,
      },
      context,
    );

    expect(editResult.replacementsApplied).toBe(2);

    // Read back
    const readTool = new ReadFileTool();
    const readRes = await readTool.execute({ filePath: "app.ts" }, context);
    expect(readRes.content).toContain("const a = 10;");
    expect(readRes.content).toContain("const c = 10;");
  });

  it("executes BashTool capturing command output and exit codes", async () => {
    const bashTool = new BashTool();
    let emittedProgress = "";

    const context = {
      threadId: "t1",
      toolCallId: "c1",
      workingDirectory: testWorkspace,
      emitProgress: (chunk: string) => {
        emittedProgress += chunk;
      },
    };

    const result = await bashTool.execute(
      { command: "echo 'hello from bash'" },
      context,
    );

    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe("hello from bash");
    expect(emittedProgress).toContain("hello from bash");
  });

  it("executes GlobTool and GrepTool across files", async () => {
    // Setup directory structure
    writeFileSync(join(testWorkspace, "fileA.ts"), "export const ALPHA = 42;\n");
    writeFileSync(join(testWorkspace, "fileB.ts"), "export const BETA = 99;\n");
    mkdirSync(join(testWorkspace, "node_modules"), { recursive: true });
    writeFileSync(join(testWorkspace, "node_modules", "ignored.ts"), "export const ALPHA = 1;\n");

    const globTool = new GlobTool();
    const grepTool = new GrepTool();

    const context = {
      threadId: "t1",
      toolCallId: "c1",
      workingDirectory: testWorkspace,
    };

    // Glob search
    const globRes = await globTool.execute({ pattern: "**/*.ts" }, context);
    expect(globRes.matches).toContain("fileA.ts");
    expect(globRes.matches).toContain("fileB.ts");
    // Verifies node_modules is ignored
    expect(globRes.matches.some((m) => m.includes("node_modules"))).toBe(false);

    // Grep search
    const grepRes = await grepTool.execute({ pattern: "ALPHA" }, context);
    expect(grepRes.totalMatches).toBe(1);
    expect(grepRes.matches[0]?.filePath).toBe("fileA.ts");
    expect(grepRes.matches[0]?.lineNumber).toBe(1);
    expect(grepRes.matches[0]?.line).toContain("export const ALPHA = 42;");
  });
});
