const { ToolCallingService } = require('../src/services/tool-calling-service');

describe('ToolCallingService', () => {
  let service;

  beforeAll(() => {
    process.env.USE_MOCK_PLACES = 'true';
    process.env.USE_MOCK_LLM = 'true';
  });

  afterAll(() => {
    delete process.env.USE_MOCK_PLACES;
    delete process.env.USE_MOCK_LLM;
  });

  beforeEach(() => {
    service = new ToolCallingService();
  });

  describe('Tool Definitions and Schemas', () => {
    test('defines search_nearby_dealerships tool with required parameters', () => {
      expect(Array.isArray(service.tools)).toBe(true);
      expect(service.tools.length).toBeGreaterThan(0);

      const tool = service.tools[0];
      expect(tool.type).toBe('function');
      expect(tool.function.name).toBe('search_nearby_dealerships');
      expect(tool.function.parameters.required).toContain('latitude');
      expect(tool.function.parameters.required).toContain('longitude');
    });

    test('_formatResults properly filters and calculates distance', () => {
      const places = [
        { displayName: { text: 'Ford Store' }, location: { latitude: 40.7, longitude: -74.0 } },
        { displayName: { text: 'Volkswagen Queens' }, location: { latitude: 40.72, longitude: -73.9 } }
      ];

      const formatted = service._formatResults(places, 40.7128, -74.0060);
      expect(formatted.length).toBe(1);
      expect(formatted[0].name).toBe('Volkswagen Queens');
      expect(typeof formatted[0].distanceKm).toBe('number');
    });
  });

  describe('End-to-End Tool Calling Execution (Deterministic Mocked Unit Test)', () => {
    test('invokes model, executes tool, and synthesizes final answer with breakdown', async () => {
      const result = await service.findClosestDealership(-26.1044, 28.0645);

      expect(result).toBeDefined();
      expect(typeof result.answer).toBe('string');
      expect(result.answer.length).toBeGreaterThan(10);
      expect(result.metrics).toBeDefined();
      expect(result.metrics.latencyMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics.totalTokens).toBeGreaterThan(0);
      expect(result.metrics).toHaveProperty('breakdown');
      expect(result.metrics.breakdown).toHaveProperty('llmTurn1Ms');
      expect(result.metrics.breakdown).toHaveProperty('placesLatencyMs');
      expect(result.metrics.breakdown).toHaveProperty('llmTurn2Ms');
      expect(result.metrics.llmCalls).toBe(2);
      expect(result.metrics.apiCalls).toBe(1);
    }, 5000);
  });
});
