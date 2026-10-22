/**
 * @fileoverview System instruction descriptions for standard agent tools.
 * @packageDocumentation
 */

/**
 * System prompt description for ReadFileTool.
 */
export const readFileDescription =
  "Reads content from a file in the workspace with 1-based line numbering. " +
  "Supports start line offset and line limit parameters for efficiently inspecting large files. " +
  "Binary files and blocking device files are automatically rejected.";

/**
 * System prompt description for WriteFileTool.
 */
export const writeFileDescription =
  "Writes the complete content to a file in the workspace. " +
  "If the file does not exist, it is created along with any necessary parent directories. " +
  "If the file already exists, it is completely overwritten. " +
  "This tool is mutating and triggers checkpoint capture.";

/**
 * System prompt description for EditFileTool.
 */
export const editFileDescription =
  "Performs surgical string replacement in a workspace file. " +
  "Requires exact matching of 'oldString' with existing file content, including indentation. " +
  "If 'oldString' appears multiple times, specify 'replaceAll: true' or provide unique surrounding context. " +
  "This tool is mutating and triggers checkpoint capture.";

/**
 * System prompt description for BashTool.
 */
export const bashDescription =
  "Executes a bash shell command in the workspace directory. " +
  "Captures stdout, stderr, and exit code. Supports abort signals and execution timeouts. " +
  "This tool is mutating and triggers checkpoint capture.";

/**
 * System prompt description for GlobTool.
 */
export const globDescription =
  "Searches for files across the workspace matching a glob pattern (e.g. '**/*.ts', 'src/**/*.json'). " +
  "Automatically ignores version control and dependency directories like .git and node_modules. " +
  "Returns matching relative file paths with a cap of 250 results.";

/**
 * System prompt description for GrepTool.
 */
export const grepDescription =
  "Searches file contents across the workspace matching a regular expression or plain text pattern. " +
  "Supports path scoping, file glob filtering, and case-insensitive matching. " +
  "Returns matching relative file paths with line numbers and line content.";
