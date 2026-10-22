/**
 * @fileoverview Filesystem-backed ThreadStore with durable thread.json and transcript.jsonl.
 * @packageDocumentation
 */

import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import type { ModelMessage } from "../model/types.js";
import { atomicWriteFile } from "../storage/atomicFile.js";
import { resolveHomeDirectory } from "../storage/homeDirectory.js";
import { appendJsonl, readJsonl } from "../storage/jsonl.js";
import { withFileLock } from "../storage/lock.js";
import type {
  CreateThreadInput,
  NewTranscriptEntry,
  ThreadMetadata,
  ThreadStore,
  TranscriptEntry,
} from "./types.js";

export class FileThreadStore implements ThreadStore {
  private readonly rootDir: string;

  public constructor(options?: { readonly homeDirectory?: string }) {
    this.rootDir = resolveHomeDirectory(options);
  }

  private getThreadDir(threadId: string): string {
    // Validate threadId to prevent directory traversal
    if (threadId.includes("..") || threadId.includes("/") || threadId.includes("\\")) {
      throw new Error(`Invalid thread identifier: "${threadId}"`);
    }
    return path.join(this.rootDir, "threads", threadId);
  }

  public async createThread(input: CreateThreadInput): Promise<ThreadMetadata> {
    const id = input.id ?? `th_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
    const threadDir = this.getThreadDir(id);
    await mkdir(threadDir, { recursive: true });

    const now = new Date().toISOString();
    const metadata: ThreadMetadata = {
      version: 1,
      id,
      createdAt: now,
      updatedAt: now,
      title: input.title,
      tags: input.tags ?? [],
      workingDirectory: input.workingDirectory,
      model: input.model,
      provider: input.provider,
      reasoning: input.reasoning,
      turnCount: 0,
      status: "idle",
      activeTranscriptSequence: 0,
      usage: {},
    };

    const metadataPath = path.join(threadDir, "thread.json");
    await atomicWriteFile(metadataPath, JSON.stringify(metadata, null, 2));

    return metadata;
  }

  public async getThread(threadId: string): Promise<ThreadMetadata | undefined> {
    const metadataPath = path.join(this.getThreadDir(threadId), "thread.json");
    if (!existsSync(metadataPath)) {
      return undefined;
    }
    const raw = await readFile(metadataPath, "utf-8");
    return JSON.parse(raw) as ThreadMetadata;
  }

  public async listThreads(options?: {
    readonly workingDirectory?: string;
    readonly limit?: number;
  }): Promise<readonly ThreadMetadata[]> {
    const threadsRoot = path.join(this.rootDir, "threads");
    if (!existsSync(threadsRoot)) {
      return [];
    }

    const { readdir } = await import("node:fs/promises");
    const entries = await readdir(threadsRoot, { withFileTypes: true });
    const list: ThreadMetadata[] = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const thread = await this.getThread(entry.name);
        if (thread) {
          if (
            !options?.workingDirectory ||
            thread.workingDirectory === options.workingDirectory
          ) {
            list.push(thread);
          }
        }
      }
    }

    list.sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );

    return options?.limit && options.limit > 0
      ? list.slice(0, options.limit)
      : list;
  }

  public async updateThreadMetadata(
    threadId: string,
    patch: Partial<
      Omit<ThreadMetadata, "id" | "createdAt" | "activeTranscriptSequence">
    >,
  ): Promise<ThreadMetadata> {
    const threadDir = this.getThreadDir(threadId);
    const lockPath = path.join(threadDir, ".thread.lock");

    return await withFileLock(lockPath, async () => {
      const current = await this.getThread(threadId);
      if (!current) {
        throw new Error(`Thread not found: "${threadId}"`);
      }

      const updated: ThreadMetadata = {
        ...current,
        ...patch,
        updatedAt: new Date().toISOString(),
      };

      const metadataPath = path.join(threadDir, "thread.json");
      await atomicWriteFile(metadataPath, JSON.stringify(updated, null, 2));
      return updated;
    });
  }

  public async deleteThread(threadId: string): Promise<boolean> {
    const threadDir = this.getThreadDir(threadId);
    if (!existsSync(threadDir)) {
      return false;
    }
    await rm(threadDir, { recursive: true, force: true });
    return true;
  }

  public async appendTranscript(
    threadId: string,
    entry: NewTranscriptEntry,
  ): Promise<TranscriptEntry> {
    const threadDir = this.getThreadDir(threadId);
    const lockPath = path.join(threadDir, ".thread.lock");

    return await withFileLock(lockPath, async () => {
      const current = await this.getThread(threadId);
      if (!current) {
        throw new Error(`Thread not found: "${threadId}"`);
      }

      const sequence = current.activeTranscriptSequence + 1;
      const fullEntry = { ...entry, sequence } as TranscriptEntry;

      const transcriptPath = path.join(threadDir, "transcript.jsonl");
      await appendJsonl(transcriptPath, fullEntry);

      const metadataPath = path.join(threadDir, "thread.json");
      const updatedMetadata: ThreadMetadata = {
        ...current,
        activeTranscriptSequence: sequence,
        updatedAt: new Date().toISOString(),
      };
      await atomicWriteFile(
        metadataPath,
        JSON.stringify(updatedMetadata, null, 2),
      );

      return fullEntry;
    });
  }

  public async loadTranscript(
    threadId: string,
  ): Promise<readonly TranscriptEntry[]> {
    const transcriptPath = path.join(
      this.getThreadDir(threadId),
      "transcript.jsonl",
    );
    return await readJsonl<TranscriptEntry>(transcriptPath);
  }

  public async loadMessages(threadId: string): Promise<readonly ModelMessage[]> {
    const transcript = await this.loadTranscript(threadId);
    const messages: ModelMessage[] = [];

    for (const entry of transcript) {
      if (entry.type === "modelMessage") {
        messages.push(entry.message);
      }
    }

    return messages;
  }
}
