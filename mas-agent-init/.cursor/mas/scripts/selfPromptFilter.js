/**
 * Outlet Filter that intercepts the LLM's response, extracts a "Self-prompt: " segment,
 * and adds it as a new output field for the frontend.
 *
 * @param {string} rawText The raw text output from the LLM.
 * @returns {{processedText: string, suggestedNextPrompt?: string}} The processed text and the extracted suggested prompt.
 */
function process(rawText) {
  const lines = rawText.split('\n');
  let suggestedNextPrompt = undefined;
  let processedLines = [];
  let selfPromptLineIndex = -1;

  // Find the last "Self-prompt:" line
  for (let i = lines.length - 1; i >= 0; i--) {
    if (lines[i].trim().startsWith('Self-prompt:')) {
      selfPromptLineIndex = i;
      break;
    }
  }

  if (selfPromptLineIndex !== -1) {
    const selfPromptLine = lines[selfPromptLineIndex];
    suggestedNextPrompt = selfPromptLine.substring('Self-prompt:'.length).trim();

    // Reconstruct the text without the "Self-prompt:" line
    processedLines = lines.filter((_, index) => index !== selfPromptLineIndex);

  } else {
    // If no "Self-prompt:" line is found, use the original text
    processedLines = lines;
  }

  const processedText = processedLines.join('\n');

  return {
    processedText,
    suggestedNextPrompt
  };
}

module.exports = {
  process
};