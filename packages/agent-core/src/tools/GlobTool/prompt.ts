/**
 * @file prompt.ts
 * @description System prompts and instruction templates for GlobTool.
 */

/**
 * Detailed instruction description provided to the language model for GlobTool.
 */
export const GLOB_DESCRIPTION =
  "Searches for files across the workspace matching a glob pattern (e.g. '**/*.ts', 'src/**/*.json'). " +
  "Automatically ignores version control and dependency directories like .git and node_modules. " +
  "Returns matching relative file paths with a cap of 250 results.";
