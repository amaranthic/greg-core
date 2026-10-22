/**
 * @file prompt.ts
 * @description System prompts and instruction templates for WriteFileTool.
 */

/**
 * Detailed instruction description provided to the language model for WriteFileTool.
 */
export const WRITE_FILE_DESCRIPTION =
  "Writes the complete content to a file in the workspace. " +
  "If the file does not exist, it is created along with any necessary parent directories. " +
  "If the file already exists, it is completely overwritten. " +
  "This tool is mutating and triggers checkpoint capture.";
