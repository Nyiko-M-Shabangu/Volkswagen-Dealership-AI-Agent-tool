const axios = require('axios');
require('dotenv').config();

async function checkModels() {
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const accountId = process.env.CLOUDFLARE_ACCOUNT_ID;

  // Let's test llama-3.1-8b-instruct, llama-3.1-70b-instruct, and llama-3.3-70b-instruct-fp8-fast
  const candidates = [
    '@cf/meta/llama-3.1-8b-instruct',
    '@cf/meta/llama-3.1-70b-instruct',
    '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
    '@cf/meta/llama-3-8b-instruct'
  ];

  for (const model of candidates) {
    try {
      const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/v1/chat/completions`;
      const res = await axios.post(
        url,
        {
          model: model,
          messages: [{ role: 'user', content: 'Say hi in 3 words' }]
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      console.log(`[FOUND] Model ${model} works! Response:`, res.data.choices[0]?.message?.content);
      return model;
    } catch (err) {
      console.log(`[FAILED] Model ${model}:`, err.response?.data?.errors?.[0]?.message || err.message);
    }
  }
}

checkModels();
