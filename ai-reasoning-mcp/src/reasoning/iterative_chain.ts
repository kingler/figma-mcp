/**
 * Iterative Prompt Chain Tool for MCP
 *
 * Enables multi-step iterative reasoning and refinement using configurable prompts and termination logic.
 *
 * @module iterative_chain
 */

import { LLMClient } from '../llm-client';

// --------------------
// Type Definitions
// --------------------

/**
 * Describes a single input variable for the chain.
 */
export interface ChainInputVariable {
  name: string;
  description: string;
}

/**
 * Describes a single termination condition.
 */
export interface TerminationCondition {
  condition: string; // e.g., 'previous_output.QUALITY_SCORE >= 9'
  explanation: string;
}

/**
 * Configuration for the iterative chain.
 */
export interface IterativeChainConfig {
  chain_name: string;
  input_variables: ChainInputVariable[];
  initial_prompt: string;
  iteration_prompt: string;
  max_iterations: number;
  termination_conditions: TerminationCondition[];
  use_final_processing: boolean;
  final_processing_prompt?: string;
}

/**
 * State for a single iteration.
 */
export interface IterationState {
  iteration_count: number;
  input: Record<string, any>;
  previous_output?: Record<string, any>;
  output?: Record<string, any>;
}

/**
 * Result of running the iterative chain.
 */
export interface IterativeChainResult {
  history: IterationState[];
  final_output: Record<string, any>;
  terminated_by: string;
}

// --------------------
// Main Iterative Chain Logic
// --------------------

/**
 * Runs an iterative prompt chain based on the provided config and input variables.
 *
 * @param config - The chain configuration
 * @param input - The initial input variables
 * @param llmClient - Optional LLMClient instance (for DI/testing)
 * @returns The full history and final output
 */
export async function runIterativeChain(
  config: IterativeChainConfig,
  input: Record<string, any>,
  llmClient?: LLMClient
): Promise<IterativeChainResult> {
  // Use provided LLMClient or create a new one
  const llm = llmClient || new LLMClient();

  let state: IterationState = {
    iteration_count: 1,
    input: { ...input },
  };
  const history: IterationState[] = [];
  let terminated_by = '';

  // Helper to call LLM and parse output
  async function callLLM(prompt: string, vars: Record<string, any>): Promise<Record<string, any>> {
    // Interpolate variables into prompt (simple replace, can be improved)
    let filledPrompt = prompt;
    for (const [key, value] of Object.entries(vars)) {
      const token = `{{${key}}}}`;
      // Use a function replacement to avoid `$` expansion
      filledPrompt = filledPrompt.split(token).join(String(value));
    const temperature = llm.getTemperature();
    const anthropic = llm.getAnthropic();
    const response = await anthropic.messages.create({
      model,
      max_tokens: maxTokens,
      temperature,
      messages: [
        { role: 'user', content: filledPrompt }
      ]
    });
    const responseContent = response.content[0];
    const content = 'text' in responseContent ? responseContent.text : '';
    // Try to parse as JSON, fallback to raw text
    try {
      return JSON.parse(content);
    } catch {
      return { RAW_OUTPUT: content };
    }
  }

  // Initial step
  state.output = await callLLM(config.initial_prompt, state.input);
  history.push({ ...state });

  // Iteration loop
  while (state.iteration_count < config.max_iterations) {
    // Check termination conditions (basic: quality score, can be extended)
    const quality = state.output?.QUALITY_SCORE || 0;
    if (quality >= 9) {
      terminated_by = 'QUALITY_SCORE >= 9';
      break;
    }
    // TODO: Add more robust termination condition evaluation

    // Prepare for next iteration
    state = {
      iteration_count: state.iteration_count + 1,
      input: { ...input },
      previous_output: state.output,
    };
    state.output = await callLLM(config.iteration_prompt, {
      ...state.input,
      previous_output: state.previous_output,
      iteration_count: state.iteration_count,
    });
    history.push({ ...state });
  }

  // Final processing
  let final_output = state.output || {};
  if (config.use_final_processing && config.final_processing_prompt) {
    final_output = await callLLM(config.final_processing_prompt, {
      ...input,
      previous_output: state.output,
      iteration_count: state.iteration_count,
    });
    terminated_by = terminated_by || 'max_iterations';
  }

  return {
    history,
    final_output,
    terminated_by: terminated_by || 'max_iterations',
  };
} 