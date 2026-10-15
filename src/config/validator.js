require('dotenv').config();

const PLACEHOLDER_PATTERNS = [
  /your_/i,
  /<.*>/,
  /todo/i,
  /placeholder/i,
  /sk-your_/i
];

function isPlaceholderOrEmpty(value) {
  if (!value || typeof value !== 'string') return true;
  const trimmed = value.trim();
  if (trimmed.length === 0) return true;
  return PLACEHOLDER_PATTERNS.some(pattern => pattern.test(trimmed));
}

/**
 * Validates Google Maps Platform API Key
 * Expected format: Starts with "AIza" and is 30 to 45 characters.
 */
function validateGoogleApiKey(key) {
  if (isPlaceholderOrEmpty(key)) {
    return {
      status: 'INVALID',
      isValid: false,
      message: 'GOOGLE_API_KEY is missing or set to placeholder. A valid Google Maps Places API key starting with "AIzaSy" is required.'
    };
  }

  const trimmed = key.trim();

  // If it starts with AQ., it is an OAuth / Service Account token, not a Maps API Key
  if (trimmed.startsWith('AQ.')) {
    return {
      status: 'INVALID',
      isValid: false,
      message: 'GOOGLE_API_KEY appears to be an OAuth/Service Account key (starts with AQ.), but Google Maps Places API requires an API key starting with "AIzaSy".'
    };
  }

  // Standard Google Maps API Key regex (starts with AIza...)
  const googleApiKeyRegex = /^AIza[0-9A-Za-z-_]{30,45}$/;
  if (!googleApiKeyRegex.test(trimmed)) {
    return {
      status: 'INVALID',
      isValid: false,
      message: 'GOOGLE_API_KEY does not match the standard Google Maps format (starts with "AIzaSy" ~39 chars).'
    };
  }

  return {
    status: 'VALID',
    isValid: true,
    message: 'Valid Google Maps Places API key detected.'
  };
}

/**
 * Validates Cloudflare Workers AI configuration
 */
function validateCloudflareConfig(accountId, apiToken, model) {
  const errors = [];

  // Account ID: 32-character hex
  const hex32Regex = /^[a-f0-9]{32}$/i;
  if (isPlaceholderOrEmpty(accountId) || !hex32Regex.test(accountId.trim())) {
    errors.push('CLOUDFLARE_ACCOUNT_ID must be a 32-character hexadecimal string.');
  }

  // API Token
  if (isPlaceholderOrEmpty(apiToken) || apiToken.trim().length < 20) {
    errors.push('CLOUDFLARE_API_TOKEN is missing, placeholder, or suspiciously short.');
  }

  // Model name: should start with @cf/
  if (isPlaceholderOrEmpty(model) || !model.startsWith('@cf/')) {
    errors.push('CLOUDFLARE_MODEL should be a valid Workers AI model path starting with "@cf/".');
  }

  if (errors.length > 0) {
    return {
      status: 'INVALID',
      isValid: false,
      errors,
      message: errors.join(' ')
    };
  }

  return {
    status: 'VALID',
    isValid: true,
    message: `Valid Cloudflare Workers AI configuration detected (${model}).`
  };
}

/**
 * Validates OpenAI configuration
 */
function validateOpenAiConfig(apiKey, model) {
  const errors = [];

  if (isPlaceholderOrEmpty(apiKey) || !apiKey.trim().startsWith('sk-') || apiKey.trim().length < 20) {
    errors.push('OPENAI_API_KEY must start with "sk-" and be a valid non-placeholder secret key.');
  }

  if (isPlaceholderOrEmpty(model)) {
    errors.push('OPENAI_MODEL is not specified.');
  }

  if (errors.length > 0) {
    return {
      status: 'INVALID',
      isValid: false,
      errors,
      message: errors.join(' ')
    };
  }

  return {
    status: 'VALID',
    isValid: true,
    message: `Valid OpenAI configuration detected (${model}).`
  };
}

/**
 * Comprehensive configuration validator
 */
function validateConfig(env = process.env) {
  const providerRaw = (env.AI_PROVIDER || 'openai').toLowerCase().trim();
  const isCloudflare = providerRaw.includes('cloudflare');
  const provider = isCloudflare ? 'cloudflare' : 'openai';

  const googleCheck = validateGoogleApiKey(env.GOOGLE_API_KEY);

  let llmCheck;
  if (provider === 'cloudflare') {
    llmCheck = validateCloudflareConfig(
      env.CLOUDFLARE_ACCOUNT_ID,
      env.CLOUDFLARE_API_TOKEN,
      env.CLOUDFLARE_MODEL || '@cf/meta/llama-3.1-70b-instruct'
    );
  } else {
    llmCheck = validateOpenAiConfig(
      env.OPENAI_API_KEY,
      env.OPENAI_MODEL || 'gpt-4o'
    );
  }

  const errors = [];

  if (!llmCheck.isValid) {
    errors.push(`[${provider.toUpperCase()}] ${llmCheck.message}`);
  }

  if (!googleCheck.isValid) {
    errors.push(`[Google Maps] ${googleCheck.message}`);
  }

  return {
    isValid: errors.length === 0,
    provider,
    errors,
    google: googleCheck,
    llm: llmCheck
  };
}

/**
 * Prints a formatted startup health validation banner
 */
function printValidationBanner(validation) {
  console.log('='.repeat(70));
  console.log('API Configuration Health Check');
  console.log('='.repeat(70));
  console.log(`AI Provider:      [${validation.provider.toUpperCase()}] -> ${validation.llm.status}`);
  console.log(`  Details:        ${validation.llm.message}`);
  console.log(`Google Places:    [${validation.google.status}] -> LIVE`);
  console.log(`  Details:        ${validation.google.message}`);

  if (validation.errors.length > 0) {
    console.log('-'.repeat(70));
    console.log('CONFIGURATION ERRORS:');
    validation.errors.forEach(e => console.error(`  ! ${e}`));
  }
  console.log('='.repeat(70) + '\n');
}

module.exports = {
  isPlaceholderOrEmpty,
  validateGoogleApiKey,
  validateCloudflareConfig,
  validateOpenAiConfig,
  validateConfig,
  printValidationBanner
};
