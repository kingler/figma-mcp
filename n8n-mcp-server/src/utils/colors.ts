/**
 * Terminal color utilities for n8n MCP server
 */

export const Colors = {
  HEADER: '\x1b[95m',
  BLUE: '\x1b[94m',
  GREEN: '\x1b[92m',
  YELLOW: '\x1b[93m',
  RED: '\x1b[91m',
  ENDC: '\x1b[0m',
  BOLD: '\x1b[1m',
  UNDERLINE: '\x1b[4m',
};

/**
 * Print a header message
 */
export function printHeader(text: string): void {
  console.log(`\n${Colors.HEADER}${Colors.BOLD}=== ${text} ===${Colors.ENDC}\n`);
}

/**
 * Print a success message
 */
export function printSuccess(text: string): void {
  console.log(`${Colors.GREEN}✓ ${text}${Colors.ENDC}`);
}

/**
 * Print an error message
 */
export function printError(text: string): void {
  console.log(`${Colors.RED}✗ ${text}${Colors.ENDC}`);
}

/**
 * Print a warning message
 */
export function printWarning(text: string): void {
  console.log(`${Colors.YELLOW}! ${text}${Colors.ENDC}`);
}

/**
 * Print an info message
 */
export function printInfo(text: string): void {
  console.log(`${Colors.BLUE}ℹ ${text}${Colors.ENDC}`);
}
