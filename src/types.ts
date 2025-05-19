/**
 * Types for the AI reasoning system
 */

/**
 * Represents a reasoning node in a reasoning graph
 */
export interface ReasoningNode {
  id: string;
  content: string;
  type: ReasoningNodeType;
  children?: string[];
  parent?: string;
}

/**
 * Types of reasoning nodes
 */
export enum ReasoningNodeType {
  PREMISE = 'premise',
  INFERENCE = 'inference',
  CONCLUSION = 'conclusion',
  QUESTION = 'question',
}

/**
 * Configuration for the reasoning engine
 */
export interface ReasoningConfig {
  maxDepth: number;
  includeExplanations: boolean;
  reasoningStrategy: ReasoningStrategy;
}

/**
 * Strategy for reasoning
 */
export enum ReasoningStrategy {
  DEDUCTIVE = 'deductive',
  INDUCTIVE = 'inductive',
  ABDUCTIVE = 'abductive',
}

/**
 * Types for the browser tools
 */

/**
 * Represents a snapshot of browser state
 */
export interface BrowserSnapshot {
  url: string;
  title: string;
  timestamp: number;
  screenshot?: string; // Base64 encoded image
}

/**
 * Configuration for browser actions
 */
export interface BrowserActionConfig {
  timeout?: number;
  retries?: number;
  waitForNavigation?: boolean;
}

/**
 * Types of browser events to listen for
 */
export enum BrowserEventType {
  NAVIGATION = 'navigation',
  CONSOLE = 'console',
  ERROR = 'error',
  DIALOG = 'dialog',
}

/**
 * Selector strategy for finding elements
 */
export enum SelectorType {
  CSS = 'css',
  XPATH = 'xpath',
  TEXT = 'text',
}

/**
 * Types for the MCP server
 */

/**
 * Tool configuration
 */
export interface ToolConfig {
  name: string;
  description: string;
  parameters: Record<string, unknown>;
  handler: ToolHandler;
}

/**
 * Tool handler function
 */
export type ToolHandler = (params: Record<string, unknown>) => Promise<unknown>;

/**
 * MCP request
 */
export interface McpRequest {
  id: string;
  tool: string;
  params: Record<string, unknown>;
}

/**
 * MCP response
 */
export interface McpResponse {
  id: string;
  result?: unknown;
  error?: string;
}

/**
 * Server event types
 */
export enum ServerEventType {
  REQUEST = 'request',
  RESPONSE = 'response',
  ERROR = 'error',
  INFO = 'info',
}

/**
 * Types for the Taskmaster system
 */

/**
 * Task status enum
 */
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in-progress',
  DONE = 'done',
  BLOCKED = 'blocked',
  DEFERRED = 'deferred',
  CANCELED = 'canceled'
}

/**
 * Task priority enum
 */
export enum TaskPriority {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

/**
 * Subtask interface
 */
export interface Subtask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  details?: string;
}

/**
 * Task interface
 */
export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dependencies: string[];
  details?: string;
  testStrategy?: string;
  subtasks: Subtask[];
}

/**
 * Task filter options
 */
export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  withSubtasks?: boolean;
}

/**
 * Task update options
 */
export interface TaskUpdates {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dependencies?: string[];
  details?: string;
  testStrategy?: string;
  subtasks?: Subtask[];
} 