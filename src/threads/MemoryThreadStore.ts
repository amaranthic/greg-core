/**
 * @fileoverview In-memory implementation of ThreadStore for testing and ephemeral workloads.
 * @packageDocumentation
 */

import { randomUUID } from "node:crypto";
import type { ModelMessage } from "../model/types.js";
import type {
  CreateThreadInput,
  NewTranscriptEntry,
  ThreadMetadata,
  ThreadStore,
  TranscriptEntry,
} from "./types.js";

export class MemoryThreadStore implements ThreadStore {
  private readonly threads = new Map<string, ThreadMetadata>();
  private readonly transcripts = new Map<string, TranscriptEntry[]>();

  public async createThread(input: CreateThreadInput): Promise<ThreadMetadata> {
    const id = input.id ?? `th_${randomUUID().replace(/-/g, "").slice(0, 16)}`;
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

    this.threads.set(id, metadata);
    this.transcripts.set(id, []);
    return metadata;
  }

  public async getThread(threadId: string): Promise<ThreadMetadata | undefined> {
    return this.threads.get(threadId);
  }

  public async listThreads(options?: {
    readonly workingDirectory?: string;
    readonly limit?: number;
  }): Promise<readonly ThreadMetadata[]> {
    let list = Array.from(this.threads.values());
    if (options?.workingDirectory) {
      list = list.filter((t) => t.workingDirectory === options.workingDirectory);
    }
    if (options?.limit && options.limit > 0) {
      list = list.slice(0, options.limit);
    }
    return list;
  }

  public async updateThreadMetadata(
    threadId: string,
    patch: Partial<
      Omit<ThreadMetadata, "id" | "createdAt" | "activeTranscriptSequence">
    >,
  ): Promise<ThreadMetadata> {
    const existing = this.threads.get(threadId);
    if (!existing) {
      throw new Error(`Thread not found: "${threadId}"`);
    }

    const updated: ThreadMetadata = {
      ...existing,
      ...patch,
      updatedAt: new Date().toISOString(),
    };
    this.threads.set(threadId, updated);
    return updated;
  }

  public async deleteThread(threadId: string): Promise<boolean> {
    this.transcripts.delete(threadId);
    return this.threads.delete(threadId);
  }

  public async appendTranscript(
    threadId: string,
    entry: NewTranscriptEntry,
  ): Promise<TranscriptEntry> {
    const thread = this.threads.get(threadId);
    if (!thread) {
      throw new Error(`Thread not found: "${threadId}"`);
    }

    const log = this.transcripts.get(threadId) ?? [];
    const sequence = log.length + 1;
    const fullEntry = { ...entry, sequence } as TranscriptEntry;

    log.push(fullEntry);
    this.transcripts.set(threadId, log);

    this.threads.set(threadId, {
      ...thread,
      activeTranscriptSequence: sequence,
      updatedAt: new Date().toISOString(),
    });

    return fullEntry;
  }

  public async loadTranscript(
    threadId: string,
  ): Promise<readonly TranscriptEntry[]> {
    return [...(this.transcripts.get(threadId) ?? [])];
  }

  public async loadMessages(threadId: string): Promise<readonly ModelMessage[]> {
    const log = this.transcripts.get(threadId) ?? [];
    const messages: ModelMessage[] = [];

    for (const entry of log) {
      if (entry.type === "modelMessage") {
        messages.push(entry.message);
      }
    }

    return messages;
  }
}
