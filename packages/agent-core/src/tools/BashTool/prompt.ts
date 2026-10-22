/**
 * @file prompt.ts
 * @description System prompts and instruction templates for BashTool.
 */

/**
 * Detailed instruction description provided to the language model for BashTool.
 */
export const BASH_DESCRIPTION =
  "Executes a bash shell command in the workspace directory. " +
  "Captures stdout, stderr, and exit code. Supports abort signals and execution timeouts. " +
  "This tool is mutating and triggers checkpoint capture.";
