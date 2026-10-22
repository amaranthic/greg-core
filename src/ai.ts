/**
 * @fileoverview Explicit raw Vercel AI SDK escape hatch for `@amaranthic/hernex/ai`.
 *
 * @remarks
 * Invocations made through this subpath bypass Hernex's mandatory credential pairing
 * and model string routing, executing with native AI SDK semantics.
 *
 * @packageDocumentation
 */

export * from "ai";
