/**
 * @fileoverview High-performance asynchronous event queue for decoupled progress and lifecycle streaming.
 * @packageDocumentation
 */

/**
 * Lightweight asynchronous queue enabling push-based streaming without timer polling.
 *
 * @typeParam T - The item type emitted by the queue.
 */
export class AsyncEventQueue<T> implements AsyncIterable<T> {
  private readonly items: T[] = [];
  private readonly waitingConsumers: Array<{
    resolve: (result: IteratorResult<T>) => void;
    reject: (error: unknown) => void;
  }> = [];
  private isClosed = false;
  private failureError: unknown = null;

  /**
   * Pushes a new item into the queue. Wakes waiting consumers immediately.
   *
   * @param item - The item to enqueue.
   */
  public push(item: T): void {
    if (this.isClosed) {
      return;
    }
    if (this.waitingConsumers.length > 0) {
      const consumer = this.waitingConsumers.shift()!;
      consumer.resolve({ value: item, done: false });
    } else {
      this.items.push(item);
    }
  }

  /**
   * Closes the queue gracefully, signaling completion to consumers.
   */
  public close(): void {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    while (this.waitingConsumers.length > 0) {
      const consumer = this.waitingConsumers.shift()!;
      consumer.resolve({ value: undefined as unknown as T, done: true });
    }
  }

  /**
   * Signals a fatal error to any waiting or future consumers.
   *
   * @param error - Error instance or message.
   */
  public error(error: unknown): void {
    if (this.isClosed) {
      return;
    }
    this.isClosed = true;
    this.failureError = error;
    while (this.waitingConsumers.length > 0) {
      const consumer = this.waitingConsumers.shift()!;
      consumer.reject(error);
    }
  }

  /**
   * Fetches the next item from the queue asynchronously.
   *
   * @returns A promise resolving to the next IteratorResult.
   */
  public async next(): Promise<IteratorResult<T>> {
    if (this.items.length > 0) {
      return { value: this.items.shift()!, done: false };
    }
    if (this.failureError) {
      throw this.failureError;
    }
    if (this.isClosed) {
      return { value: undefined as unknown as T, done: true };
    }
    return new Promise<IteratorResult<T>>((resolve, reject) => {
      this.waitingConsumers.push({ resolve, reject });
    });
  }

  /**
   * Implements the AsyncIterable protocol.
   */
  public [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: () => this.next(),
      return: async () => {
        this.close();
        return { value: undefined as unknown as T, done: true };
      },
    };
  }
}
