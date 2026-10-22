/**
 * @file ToolExecutionQueue.ts
 * @description Provides a deterministic serialization queue for executing non-concurrency-safe
 * tools in `@amaranthic/greg-agent-core`. Guarantees FIFO execution order without resource contention.
 */

/**
 * Races a promise against an optional abort signal, rejecting immediately if aborted.
 *
 * @typeParam T - The resolved value type of the promise.
 * @param promise - The asynchronous task promise to await.
 * @param abortSignal - Optional signal to monitor for cancellation.
 * @returns A promise that resolves with the task result or rejects with an abort error.
 */
export function raceWithSignal<T>(
  promise: Promise<T>,
  abortSignal?: AbortSignal,
): Promise<T> {
  if (!abortSignal) {
    return promise;
  }

  if (abortSignal.aborted) {
    return Promise.reject(
      new Error(`Tool execution aborted: ${abortSignal.reason ?? "Aborted by signal"}`),
    );
  }

  return new Promise<T>((resolve, reject) => {
    const handleAbort = (): void => {
      reject(
        new Error(`Tool execution aborted: ${abortSignal.reason ?? "Aborted by signal"}`),
      );
    };

    abortSignal.addEventListener("abort", handleAbort, { once: true });

    promise
      .then(resolve, reject)
      .finally(() => {
        abortSignal.removeEventListener("abort", handleAbort);
      });
  });
}

/**
 * Serial execution queue ensuring non-concurrency-safe tools run sequentially.
 *
 * @example
 * ```typescript
 * const queue = new ToolExecutionQueue();
 *
 * const result = await queue.run(async () => {
 *   return await mutateFileSystem();
 * }, abortSignal);
 * ```
 */
export class ToolExecutionQueue {
  private executionTail: Promise<unknown> = Promise.resolve();

  /**
   * Enqueues an asynchronous task to run sequentially after all prior tasks in the queue complete.
   *
   * @typeParam T - The return type of the task.
   * @param task - The asynchronous operation function to execute.
   * @param abortSignal - Optional abort signal for task cancellation.
   * @returns A promise resolving to the task's return value.
   */
  public async run<T>(
    task: () => Promise<T>,
    abortSignal?: AbortSignal,
  ): Promise<T> {
    if (abortSignal?.aborted) {
      throw new Error(
        `Tool execution aborted: ${abortSignal.reason ?? "Aborted by signal"}`,
      );
    }

    const executeTask = (): Promise<T> => raceWithSignal(task(), abortSignal);

    const nextTail = this.executionTail.then(executeTask, executeTask);
    this.executionTail = nextTail.catch(() => {});

    return nextTail;
  }
}
