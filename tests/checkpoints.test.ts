/**
 * @fileoverview Test suite for FileCheckpointStore, content-addressed blobs, and restore operations.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { FileCheckpointStore } from "../src/index.js";

describe("FileCheckpointStore", () => {
  let testHome: string;
  let workspaceDir: string;
  let store: FileCheckpointStore;

  beforeEach(() => {
    const runId = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    testHome = path.join(tmpdir(), `hernex_cp_test_home_${runId}`);
    workspaceDir = path.join(tmpdir(), `hernex_cp_test_ws_${runId}`);
    mkdirSync(testHome, { recursive: true });
    mkdirSync(workspaceDir, { recursive: true });

    store = new FileCheckpointStore({ homeDirectory: testHome });
  });

  afterEach(() => {
    try {
      rmSync(testHome, { recursive: true, force: true });
      rmSync(workspaceDir, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  it("stores and retrieves raw blobs using SHA-256 content addressing", async () => {
    const data = Buffer.from("console.log('hello world');");
    const hash = await store.storeBlob(data);

    expect(hash).toBe(createHash("sha256").update(data).digest("hex"));

    const retrieved = await store.readBlob(hash);
    expect(retrieved).toEqual(data);
  });

  it("creates, retrieves, and lists checkpoint records", async () => {
    const threadId = "th_checkpoint_test";

    const cp1 = await store.createCheckpoint(threadId, {
      id: "cp_step_1",
      threadId,
      turnIndex: 1,
      toolName: "writeFile",
      timestamp: Date.now(),
      coverage: "complete",
      files: [
        {
          relativePath: "src/main.ts",
          afterHash: "hash123",
          status: "+",
        },
      ],
    });

    expect(cp1.sequence).toBe(1);
    expect(cp1.id).toBe("cp_step_1");

    const fetched = await store.getCheckpoint(threadId, "cp_step_1");
    expect(fetched).toBeDefined();
    expect(fetched?.id).toBe("cp_step_1");

    const list = await store.listCheckpoints(threadId);
    expect(list.length).toBe(1);
    expect(list[0]?.id).toBe("cp_step_1");
  });

  it("plans and executes file restore with conflict detection", async () => {
    const threadId = "th_restore_test";
    const filePath = "config.json";
    const absolutePath = path.join(workspaceDir, filePath);

    // Initial file state
    const originalContent = Buffer.from('{"version": 1}');
    writeFileSync(absolutePath, originalContent);
    const beforeHash = await store.storeBlob(originalContent);

    // Mutation by tool
    const toolContent = Buffer.from('{"version": 2, "mutated": true}');
    writeFileSync(absolutePath, toolContent);
    const afterHash = await store.storeBlob(toolContent);

    const checkpoint = await store.createCheckpoint(threadId, {
      id: "cp_modify_config",
      threadId,
      turnIndex: 1,
      toolName: "editFile",
      timestamp: Date.now(),
      coverage: "complete",
      files: [
        {
          relativePath: filePath,
          beforeHash,
          afterHash,
          status: "~",
        },
      ],
    });

    // Plan restore without external conflicts
    const plan = await store.planRestore(threadId, checkpoint.id, workspaceDir);
    expect(plan.hasConflicts).toBe(false);
    expect(plan.actions.length).toBe(1);
    expect(plan.actions[0]?.action).toBe("modify");

    // Perform restore
    const result = await store.restoreCheckpoint(threadId, checkpoint.id, workspaceDir);
    expect(result.success).toBe(true);
    expect(result.filesRestored).toBe(1);
    expect(readFileSync(absolutePath, "utf-8")).toBe('{"version": 1}');
  });

  it("detects conflict when file was modified externally after tool step", async () => {
    const threadId = "th_conflict_test";
    const filePath = "server.ts";
    const absolutePath = path.join(workspaceDir, filePath);

    const originalContent = Buffer.from("export const port = 3000;");
    const beforeHash = await store.storeBlob(originalContent);

    const toolContent = Buffer.from("export const port = 8080;");
    const afterHash = await store.storeBlob(toolContent);

    // Write tool content
    writeFileSync(absolutePath, toolContent);

    const checkpoint = await store.createCheckpoint(threadId, {
      id: "cp_change_port",
      threadId,
      turnIndex: 1,
      toolName: "editFile",
      timestamp: Date.now(),
      coverage: "complete",
      files: [
        {
          relativePath: filePath,
          beforeHash,
          afterHash,
          status: "~",
        },
      ],
    });

    // Simulate external edit: user changed port to 9090
    writeFileSync(absolutePath, "export const port = 9090;");

    const plan = await store.planRestore(threadId, checkpoint.id, workspaceDir);
    expect(plan.hasConflicts).toBe(true);
    expect(plan.actions[0]?.isConflict).toBe(true);

    // Attempting restore without force should throw
    await expect(
      store.restoreCheckpoint(threadId, checkpoint.id, workspaceDir),
    ).rejects.toThrow("Restore conflicts detected");

    // Force restore overrides conflict
    const forcedResult = await store.restoreCheckpoint(
      threadId,
      checkpoint.id,
      workspaceDir,
      { force: true },
    );
    expect(forcedResult.success).toBe(true);
    expect(readFileSync(absolutePath, "utf-8")).toBe("export const port = 3000;");
  });
});
