/**
 * @fileoverview Test suite for MemoryThreadStore and FileThreadStore.
 */

import { afterEach, beforeEach, describe, expect, it } from "bun:test";
import { mkdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import {
  FileThreadStore,
  MemoryThreadStore,
  type ThreadStore,
} from "../src/index.js";

describe("ThreadStore implementations", () => {
  let testHome: string;

  beforeEach(() => {
    testHome = path.join(
      tmpdir(),
      `hernex_thread_test_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    );
    mkdirSync(testHome, { recursive: true });
  });

  afterEach(() => {
    try {
      rmSync(testHome, { recursive: true, force: true });
    } catch {
      // Ignore
    }
  });

  const runContractTests = (getStore: () => ThreadStore, name: string) => {
    describe(`${name} Contract`, () => {
      it("creates, retrieves, updates, and deletes threads", async () => {
        const store = getStore();

        const thread = await store.createThread({
          title: "Session Alpha",
          tags: ["test", "ai"],
          workingDirectory: "/workspace/alpha",
          model: "openai/gpt-4o",
        });

        expect(thread.id).toBeDefined();
        expect(thread.title).toBe("Session Alpha");
        expect(thread.workingDirectory).toBe("/workspace/alpha");
        expect(thread.status).toBe("idle");

        // getThread
        const fetched = await store.getThread(thread.id);
        expect(fetched).toBeDefined();
        expect(fetched?.id).toBe(thread.id);
        expect(fetched?.title).toBe("Session Alpha");

        // updateThreadMetadata
        const updated = await store.updateThreadMetadata(thread.id, {
          title: "Session Alpha Updated",
          status: "running",
          turnCount: 1,
        });
        expect(updated.title).toBe("Session Alpha Updated");
        expect(updated.status).toBe("running");
        expect(updated.turnCount).toBe(1);

        // listThreads
        const list = await store.listThreads({
          workingDirectory: "/workspace/alpha",
        });
        expect(list.length).toBe(1);
        expect(list[0]?.id).toBe(thread.id);

        // deleteThread
        const deleted = await store.deleteThread(thread.id);
        expect(deleted).toBe(true);

        const afterDelete = await store.getThread(thread.id);
        expect(afterDelete).toBeUndefined();
      });

      it("appends transcript entries and reconstructs model messages", async () => {
        const store = getStore();

        const thread = await store.createThread({
          workingDirectory: "/workspace/transcript",
        });

        await store.appendTranscript(thread.id, {
          type: "turnStarted",
          turnIndex: 1,
          userPrompt: "Hello assistant",
          timestamp: Date.now(),
        });

        await store.appendTranscript(thread.id, {
          type: "modelMessage",
          message: { role: "user", content: "Hello assistant" },
          timestamp: Date.now(),
        });

        await store.appendTranscript(thread.id, {
          type: "modelMessage",
          message: { role: "assistant", content: "Hello human! How can I help?" },
          timestamp: Date.now(),
        });

        const transcript = await store.loadTranscript(thread.id);
        expect(transcript.length).toBe(3);
        expect(transcript[0]?.sequence).toBe(1);
        expect(transcript[1]?.sequence).toBe(2);
        expect(transcript[2]?.sequence).toBe(3);

        const messages = await store.loadMessages(thread.id);
        expect(messages.length).toBe(2);
        expect(messages[0]?.role).toBe("user");
        expect(messages[1]?.role).toBe("assistant");
      });
    });
  };

  runContractTests(() => new MemoryThreadStore(), "MemoryThreadStore");
  runContractTests(
    () => new FileThreadStore({ homeDirectory: testHome }),
    "FileThreadStore",
  );

  it("FileThreadStore rejects traversal characters in thread IDs", async () => {
    const store = new FileThreadStore({ homeDirectory: testHome });
    await expect(store.getThread("../escaped_id")).rejects.toThrow("Invalid thread identifier");
    await expect(store.getThread("sub/dir/id")).rejects.toThrow("Invalid thread identifier");
  });
});
