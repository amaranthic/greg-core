/**
 * @file prompt.ts
 * @description System prompts and instruction templates for GrepTool.
 */

/**
 * Detailed instruction description provided to the language model for GrepTool.
 */
export const GREP_DESCRIPTION =
  "Searches file contents across the workspace matching a regular expression or plain text pattern. " +
  "Supports path scoping, file glob filtering, and case-insensitive matching. " +
  "Returns matching relative file paths with line numbers and line content.";
