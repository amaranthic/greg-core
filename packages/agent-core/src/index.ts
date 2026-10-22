/**
 * @fileoverview Main entry point and barrel exports for `@amaranthic/greg-agent-core`.
 * Provides the foundational runtime engine, execution loops, checkpointing,
 * and thread sessions for the Greg agent ecosystem.
 *
 * @packageDocumentation
 */

export const agentCoreVersion = '0.1.0';

export * from './events/index.js';
export * from './hooks/index.js';
export * from './thread/index.js';
export * from './checkpoints/index.js';
export * from './tools/index.js';
export * from './engine/index.js';
