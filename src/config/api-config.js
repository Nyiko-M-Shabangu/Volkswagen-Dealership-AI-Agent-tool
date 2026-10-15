require('dotenv').config();
const { validateConfig, printValidationBanner } = require('./validator');

const providerRaw = (process.env.AI_PROVIDER || 'openai').toLowerCase().trim();
const isCloudflare = providerRaw.includes('cloudflare');

const cloudflareAccountId = process.env.CLOUDFLARE_ACCOUNT_ID || '';
const cloudflareBaseUrl = cloudflareAccountId 
  ? `https://api.cloudflare.com/client/v4/accounts/${cloudflareAccountId}/ai/v1`
  : undefined;

// Validate credentials and environment configuration on startup
const validation = validateConfig(process.env);

module.exports = {
  provider: isCloudflare ? 'cloudflare' : 'openai',

  validation,
  printValidationBanner: () => printValidationBanner(validation),

  google: {
    apiKey: process.env.GOOGLE_API_KEY,
    status: validation.google.status,
    message: validation.google.message,
    timeout: 10000,
    retries: 3
  },

  openai: {
    apiKey: process.env.OPENAI_API_KEY,
    model: process.env.OPENAI_MODEL || 'gpt-4o',
    timeout: 30000
  },

  cloudflare: {
    accountId: cloudflareAccountId,
    apiToken: process.env.CLOUDFLARE_API_TOKEN,
    model: process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.1-70b-instruct',
    baseUrl: cloudflareBaseUrl,
    timeout: 30000
  },

  // Active LLM settings based on selected provider
  activeLlm: {
    provider: isCloudflare ? 'cloudflare' : 'openai',
    apiKey: isCloudflare ? process.env.CLOUDFLARE_API_TOKEN : process.env.OPENAI_API_KEY,
    baseURL: isCloudflare ? cloudflareBaseUrl : undefined,
    model: isCloudflare 
      ? (process.env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.1-70b-instruct')
      : (process.env.OPENAI_MODEL || 'gpt-4o')
  },

  benchmark: {
    iterations: parseInt(process.env.BENCHMARK_ITERATIONS, 10) || 50,
    location: {
      lat: parseFloat(process.env.BENCHMARK_LOCATION_LAT) || -26.1044,
      lng: parseFloat(process.env.BENCHMARK_LOCATION_LNG) || 28.0645
    }
  }
};
