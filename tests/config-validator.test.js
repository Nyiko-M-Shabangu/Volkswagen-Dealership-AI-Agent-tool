require('dotenv').config();
const {
  isPlaceholderOrEmpty,
  validateGoogleApiKey,
  validateCloudflareConfig,
  validateOpenAiConfig,
  validateConfig
} = require('../src/config/validator');

describe('Configuration & API Key Validator (Best Practice)', () => {
  describe('Placeholder Detection', () => {
    test('identifies placeholders and empty values', () => {
      expect(isPlaceholderOrEmpty('')).toBe(true);
      expect(isPlaceholderOrEmpty('   ')).toBe(true);
      expect(isPlaceholderOrEmpty('your_google_places_api_key_here')).toBe(true);
      expect(isPlaceholderOrEmpty('sk-your_openai_api_key_here')).toBe(true);
      expect(isPlaceholderOrEmpty('<INSERT_KEY_HERE>')).toBe(true);
      expect(isPlaceholderOrEmpty('TODO_ADD_KEY')).toBe(true);
      expect(isPlaceholderOrEmpty(null)).toBe(true);
      expect(isPlaceholderOrEmpty(undefined)).toBe(true);
    });

    test('accepts realistic keys as non-placeholder', () => {
      expect(isPlaceholderOrEmpty('AIzaSyD_ExampleValidKey1234567890123456')).toBe(false);
      expect(isPlaceholderOrEmpty('0123456789abcdef0123456789abcdef')).toBe(false);
    });
  });

  describe('Google Maps Places API Key Validation', () => {
    test('flags missing or placeholder Google API key', () => {
      const res = validateGoogleApiKey('your_google_places_api_key_here');
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('INVALID');
    });

    test('identifies OAuth / Service Account token (starting with AQ.) as invalid Maps key', () => {
      const res = validateGoogleApiKey('AQ.MockServiceAccountKeyForTestingValidation012345');
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('INVALID');
      expect(res.message).toContain('OAuth/Service Account key');
    });

    test('validates authentic Google Maps API key (starting with AIzaSy)', () => {
      const res = validateGoogleApiKey('AIzaSyMockValidPlacesApiKey0123456789ABCDE');
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('VALID');
    });
  });

  describe('Cloudflare Workers AI Validation', () => {
    test('validates correct 32-hex account ID and token', () => {
      const res = validateCloudflareConfig(
        '0123456789abcdef0123456789abcdef',
        'cf_mock_token_for_unit_tests_only_1234567890abcdef',
        '@cf/meta/llama-3.1-70b-instruct'
      );
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('VALID');
    });

    test('flags non-hexadecimal account ID', () => {
      const res = validateCloudflareConfig(
        'not-a-valid-hex-account-id',
        'cf_mock_token_for_unit_tests_only_1234567890abcdef',
        '@cf/meta/llama-3.1-70b-instruct'
      );
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('INVALID');
    });

    test('flags placeholder Cloudflare tokens', () => {
      const res = validateCloudflareConfig(
        '0123456789abcdef0123456789abcdef',
        'your_cloudflare_api_token_here',
        '@cf/meta/llama-3.1-70b-instruct'
      );
      expect(res.isValid).toBe(false);
    });
  });

  describe('OpenAI Validation', () => {
    test('validates standard sk- format key', () => {
      const res = validateOpenAiConfig('sk-mock-valid-openai-key-for-testing-1234567890', 'gpt-4o');
      expect(res.isValid).toBe(true);
      expect(res.status).toBe('VALID');
    });

    test('flags keys that do not start with sk- or are placeholders', () => {
      const res = validateOpenAiConfig('sk-your_openai_api_key_here', 'gpt-4o');
      expect(res.isValid).toBe(false);
      expect(res.status).toBe('INVALID');
    });
  });

  describe('Overall Environment Validation (validateConfig)', () => {
    test('validates custom env objects correctly', () => {
      const customEnv = {
        AI_PROVIDER: 'cloudflare',
        CLOUDFLARE_ACCOUNT_ID: '0123456789abcdef0123456789abcdef',
        CLOUDFLARE_API_TOKEN: 'cf_mock_token_for_unit_tests_only_1234567890abcdef',
        CLOUDFLARE_MODEL: '@cf/meta/llama-3.1-70b-instruct',
        GOOGLE_API_KEY: 'AIzaSyMockValidPlacesApiKey0123456789ABCDE'
      };

      const result = validateConfig(customEnv);
      expect(result.isValid).toBe(true);
      expect(result.provider).toBe('cloudflare');
      expect(result.llm.isValid).toBe(true);
      expect(result.google.isValid).toBe(true);
    });

    test('returns structured validation report for active environment', () => {
      const result = validateConfig();
      expect(result).toHaveProperty('isValid');
      expect(result).toHaveProperty('provider');
      expect(result).toHaveProperty('llm');
      expect(result).toHaveProperty('google');
      expect(typeof result.isValid).toBe('boolean');
      expect(typeof result.llm.isValid).toBe('boolean');
      expect(typeof result.google.isValid).toBe('boolean');
    });

    test('correctly flags empty or missing environment as invalid without throwing', () => {
      const result = validateConfig({});
      expect(result.isValid).toBe(false);
      expect(result.llm.isValid).toBe(false);
      expect(result.google.isValid).toBe(false);
      expect(Array.isArray(result.errors)).toBe(true);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });
});
