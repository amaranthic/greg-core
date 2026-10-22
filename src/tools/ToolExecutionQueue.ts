/**
 * @file ToolExecutionQueue.ts
 * @description Provides a deterministic serialization queue for executing non-concurrency-safe
 * tools in Hernex. Guarantees FIFO execution order without resource contention.
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

    let settleUnderlyingTask!: () => void;
    const underlyingSettled = new Promise<void>((resolve) => {
      settleUnderlyingTask = resolve;
    });

    const previousTail = this.executionTail;
    this.executionTail = previousTail.then(
      () => underlyingSettled,
      () => underlyingSettled,
    );

    // Wait for all prior tasks in the queue to settle completely
    await previousTail;

    if (abortSignal?.aborted) {
      settleUnderlyingTask();
      throw new Error(
        `Tool execution aborted: ${abortSignal.reason ?? "Aborted by signal"}`,
      );
    }

    const taskPromise = (async () => {
      try {
        return await task();
      } finally {
        settleUnderlyingTask();
      }
    })();

    return await raceWithSignal(taskPromise, abortSignal);
  }
}
