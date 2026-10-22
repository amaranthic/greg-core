/**
 * @file prompt.ts
 * @description System prompts and instruction templates for ReadFileTool.
 */

/**
 * Detailed instruction description provided to the language model for ReadFileTool.
 */
export const READ_FILE_DESCRIPTION =
  "Reads content from a file in the workspace with 1-based line numbering. " +
  "Supports start line offset and line limit parameters for efficiently inspecting large files. " +
  "Binary files and blocking device files are automatically rejected.";
