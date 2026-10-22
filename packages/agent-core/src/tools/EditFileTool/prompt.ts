/**
 * @file prompt.ts
 * @description System prompts and instruction templates for EditFileTool.
 */

/**
 * Detailed instruction description provided to the language model for EditFileTool.
 */
export const EDIT_FILE_DESCRIPTION =
  "Performs surgical string replacement in a workspace file. " +
  "Requires exact matching of 'oldString' with existing file content, including indentation. " +
  "If 'oldString' appears multiple times, specify 'replaceAll: true' or provide unique surrounding context. " +
  "This tool is mutating and triggers checkpoint capture.";
