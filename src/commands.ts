/**
 * Command-line interface commands for Taskmaster
 */

import { Command } from 'commander';
import { Task, TaskStatus, TaskPriority } from './types';

/**
 * Create the CLI program with all commands
 * @returns The configured Commander program
 */
export function createCliProgram(): Command {
  const program = new Command();
  
  program
    .name('task-master')
    .description('Task management system powered by AI')
    .version('0.1.0');
  
  // Initialize project
  program
    .command('init')
    .description('Initialize a new Taskmaster project')
    .option('-n, --name <name>', 'Project name')
    .option('-d, --description <text>', 'Project description')
    .option('-v, --version <version>', 'Project version')
    .option('-y, --yes', 'Skip prompts and use default values', false)
    .action((options) => {
      console.log('Initializing project with options:', options);
      // Implementation to be added
    });
  
  // List tasks
  program
    .command('list')
    .description('List all tasks')
    .option('-s, --status <status>', 'Filter by status')
    .option('--with-subtasks', 'Include subtasks in the listing', false)
    .action((options) => {
      console.log('Listing tasks with options:', options);
      // Implementation to be added
    });
  
  // Show task details
  program
    .command('show')
    .argument('<id>', 'Task ID to show')
    .description('Show details of a specific task')
    .action((id) => {
      console.log(`Showing details for task ${id}`);
      // Implementation to be added
    });
  
  // Add task
  program
    .command('add-task')
    .description('Add a new task')
    .option('-p, --prompt <text>', 'Description of the task to add')
    .option('-d, --dependencies <ids>', 'Comma-separated list of dependency task IDs')
    .option('--priority <priority>', 'Task priority (high, medium, low)')
    .action((options) => {
      console.log('Adding task with options:', options);
      // Implementation to be added
    });
  
  // Other commands would be added here
  
  return program;
}

/**
 * Parse command line arguments and execute the appropriate command
 * @param args - Command line arguments
 * @returns The parsed command
 */
export function parseArgs(args: string[]): Command {
  const program = createCliProgram();
  return program.parse(args);
} 