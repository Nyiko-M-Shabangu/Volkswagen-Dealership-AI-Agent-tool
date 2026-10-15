const axios = require('axios');
const config = require('../config/api-config');
const { 
  MOCK_LLM_API_FIRST_RESPONSE, 
  MOCK_LLM_TOOL_CALL_RESPONSE, 
  MOCK_LLM_SYNTHESIS_RESPONSE 
} = require('./mock-places');

/**
 * Executes a Chat Completion request across supported model endpoints.
 * Supports both Cloudflare Workers AI and OpenAI formats.
 */
async function createChatCompletion({ messages, tools, tool_choice, temperature = 0.3 }) {
  if (process.env.USE_MOCK_LLM === 'true') {
    const hasToolRole = messages.some(m => m.role === 'tool');
    if (hasToolRole) return MOCK_LLM_SYNTHESIS_RESPONSE;
    if (tools && tools.length > 0) return MOCK_LLM_TOOL_CALL_RESPONSE;
    return MOCK_LLM_API_FIRST_RESPONSE;
  }

  const isCloudflare = config.activeLlm.provider === 'cloudflare';
  
  const url = isCloudflare
    ? `${config.cloudflare.baseUrl}/chat/completions`
    : 'https://api.openai.com/v1/chat/completions';

  const headers = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${config.activeLlm.apiKey}`
  };

  // Cloudflare Workers AI strictly requires string content on messages (never null)
  const sanitizedMessages = messages.map(msg => {
    if (msg.role === 'assistant' && msg.content === null) {
      return { ...msg, content: '' };
    }
    return msg;
  });

  const payload = {
    model: config.activeLlm.model,
    messages: sanitizedMessages,
    temperature
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
    if (tool_choice) {
      payload.tool_choice = tool_choice;
    }
  }

  const response = await axios.post(url, payload, {
    headers,
    timeout: 60000
  });

  return response.data;
}

module.exports = { createChatCompletion };
