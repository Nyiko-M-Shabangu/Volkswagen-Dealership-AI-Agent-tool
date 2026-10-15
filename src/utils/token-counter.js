/**
 * Approximate token count using whitespace/punctuation heuristic
 * GPT-4o / Llama-3 average: ~1 token per 0.75 English words
 * For exact counts, use LLM response usage metadata
 */
function estimateTokens(text) {
  if (!text) return 0;
  const tokens = String(text).match(/\S+/g) || [];
  return Math.ceil(tokens.length / 0.75);
}

/**
 * Extract exact token usage from OpenAI / Cloudflare OpenAI-compatible response
 */
function extractTokenUsage(response) {
  if (response?.usage) {
    return {
      prompt: response.usage.prompt_tokens || 0,
      completion: response.usage.completion_tokens || 0,
      total: response.usage.total_tokens || 0
    };
  }
  return null;
}

module.exports = { estimateTokens, extractTokenUsage };
