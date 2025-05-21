import { runIterativeChain, IterativeChainConfig, IterativeChainResult } from '../reasoning/iterative_chain';
import { LLMClient } from '../llm-client';

/**
 * Mock LLMClient for testing iterative chain logic.
 */
class MockLLMClient {
  callCount = 0;
  getModel() { return 'mock-model'; }
  getMaxTokens() { return 1000; }
  getTemperature() { return 0.1; }
  getAnthropic() {
    return {
      messages: {
        create: async () => {
          this.callCount++;
          // Simulate structured output for each step
          if (this.callCount === 1) {
            return { content: [{ text: JSON.stringify({ IMPROVED_CONTENT: 'First improvement', CHANGES_MADE: ['Initial change'], AREAS_FOR_IMPROVEMENT: ['More clarity'], QUALITY_SCORE: 7 }) }] };
          } else if (this.callCount === 2) {
            return { content: [{ text: JSON.stringify({ IMPROVED_CONTENT: 'Second improvement', CHANGES_MADE: ['Clarity improved'], AREAS_FOR_IMPROVEMENT: ['Tighten intro'], QUALITY_SCORE: 8 }) }] };
          } else if (this.callCount === 3) {
            return { content: [{ text: JSON.stringify({ IMPROVED_CONTENT: 'Final improvement', CHANGES_MADE: ['Intro tightened'], AREAS_FOR_IMPROVEMENT: ['None'], QUALITY_SCORE: 9 }) }] };
          } else {
            // Final processing
            return { content: [{ text: JSON.stringify({ FINAL_CONTENT: 'Polished content', SUMMARY: 'Improved clarity and intro', QUALITY_SCORE: 9 }) }] };
          }
        }
      }
    };
  }
}

describe('runIterativeChain', () => {
  /**
   * Should perform iterative refinement and terminate on quality score.
   */
  it('runs the chain and terminates when quality score >= 9', async () => {
    const config: IterativeChainConfig = {
      chain_name: 'Test Chain',
      input_variables: [
        { name: 'draft', description: 'Initial draft' }
      ],
      initial_prompt: 'Improve: {{draft}}',
      iteration_prompt: 'Refine: {{previous_output.IMPROVED_CONTENT}}',
      max_iterations: 5,
      termination_conditions: [
        { condition: 'QUALITY_SCORE >= 9', explanation: 'Stop at high quality' }
      ],
      use_final_processing: true,
      final_processing_prompt: 'Polish: {{previous_output.IMPROVED_CONTENT}}'
    };
    const input = { draft: 'This is a test draft.' };
    const mockLLM = new MockLLMClient() as unknown as LLMClient;
    const result: IterativeChainResult = await runIterativeChain(config, input, mockLLM);
    // Should have 3 iterations (7, 8, 9)
    expect(result.history.length).toBe(3);
    expect(result.terminated_by).toBe('QUALITY_SCORE >= 9');
    expect(result.final_output.FINAL_CONTENT).toBe('Polished content');
    expect(result.final_output.QUALITY_SCORE).toBe(9);
  });

  /**
   * Should handle final processing and return the correct output.
   */
  it('applies final processing step if enabled', async () => {
    const config: IterativeChainConfig = {
      chain_name: 'Test Chain',
      input_variables: [
        { name: 'draft', description: 'Initial draft' }
      ],
      initial_prompt: 'Improve: {{draft}}',
      iteration_prompt: 'Refine: {{previous_output.IMPROVED_CONTENT}}',
      max_iterations: 2,
      termination_conditions: [],
      use_final_processing: true,
      final_processing_prompt: 'Polish: {{previous_output.IMPROVED_CONTENT}}'
    };
    const input = { draft: 'Another draft.' };
    const mockLLM = new MockLLMClient() as unknown as LLMClient;
    const result: IterativeChainResult = await runIterativeChain(config, input, mockLLM);
    expect(result.final_output.FINAL_CONTENT).toBe('Polished content');
    expect(result.final_output.SUMMARY).toBe('Improved clarity and intro');
  });

  /**
   * Should return raw output if LLM returns non-JSON.
   */
  it('returns RAW_OUTPUT if LLM output is not JSON', async () => {
    class BadLLMClient extends MockLLMClient {
      getAnthropic() {
        return {
          messages: {
            create: async () => ({ content: [{ text: 'Not JSON' }] })
          }
        };
      }
    }
    const config: IterativeChainConfig = {
      chain_name: 'Test Chain',
      input_variables: [
        { name: 'draft', description: 'Initial draft' }
      ],
      initial_prompt: 'Improve: {{draft}}',
      iteration_prompt: 'Refine: {{previous_output.IMPROVED_CONTENT}}',
      max_iterations: 1,
      termination_conditions: [],
      use_final_processing: false
    };
    const input = { draft: 'Bad output test.' };
    const badLLM = new BadLLMClient() as unknown as LLMClient;
    const result: IterativeChainResult = await runIterativeChain(config, input, badLLM);
    expect(result.history[0].output).toHaveProperty('RAW_OUTPUT', 'Not JSON');
  });
}); 