const { ApiFirstService } = require('../src/services/api-first-service');

describe('ApiFirstService', () => {
  let service;

  beforeAll(() => {
    process.env.USE_MOCK_PLACES = 'true';
    process.env.USE_MOCK_LLM = 'true';
  });

  afterAll(() => {
    delete process.env.USE_MOCK_PLACES;
    delete process.env.USE_MOCK_LLM;
    delete process.env.MOCK_SCENARIO;
  });

  beforeEach(() => {
    service = new ApiFirstService();
  });

  describe('Internal Result Pre-Processing (_processResults)', () => {
    test('filters out non-Volkswagen car dealerships', () => {
      const places = [
        { displayName: { text: 'Toyota Central' }, location: { latitude: 40.7, longitude: -74.0 } },
        { displayName: { text: 'Volkswagen Manhattan' }, location: { latitude: 40.71, longitude: -74.01 } },
        { displayName: { text: 'BMW of Bayside' }, location: { latitude: 40.75, longitude: -73.9 } },
        { displayName: { text: 'VW Brooklyn Auto' }, location: { latitude: 40.68, longitude: -73.95 } }
      ];

      const processed = service._processResults(places, 40.7128, -74.0060);
      expect(processed.length).toBe(2);
      expect(processed.every(p => /volkswagen|vw/i.test(p.name))).toBe(true);
    });

    test('sorts dealerships in ascending order by distance and caps at top 3', () => {
      const userLat = 40.7128;
      const userLng = -74.0060;

      const places = [
        { displayName: { text: 'VW Far Away' }, location: { latitude: userLat + 0.3, longitude: userLng } },
        { displayName: { text: 'VW Closest' }, location: { latitude: userLat + 0.01, longitude: userLng } },
        { displayName: { text: 'VW Medium Distance' }, location: { latitude: userLat + 0.08, longitude: userLng } },
        { displayName: { text: 'VW Fourth Closest' }, location: { latitude: userLat + 0.15, longitude: userLng } }
      ];

      const processed = service._processResults(places, userLat, userLng);
      expect(processed.length).toBe(3);
      expect(processed[0].name).toBe('VW Closest');
      expect(processed[0].distanceKm).toBeLessThan(processed[1].distanceKm);
      expect(processed[1].distanceKm).toBeLessThan(processed[2].distanceKm);
    });
  });

  describe('End-to-End Dealership Search (Deterministic Mocked Unit Test)', () => {
    test('executes findClosestDealership and returns answer with metrics breakdown', async () => {
      const result = await service.findClosestDealership(-26.1044, 28.0645);

      expect(result).toBeDefined();
      expect(typeof result.answer).toBe('string');
      expect(result.answer.length).toBeGreaterThan(10);
      expect(Array.isArray(result.rawData)).toBe(true);
      expect(result.metrics).toHaveProperty('latencyMs');
      expect(result.metrics).toHaveProperty('breakdown');
      expect(result.metrics.breakdown).toHaveProperty('placesLatencyMs');
      expect(result.metrics.breakdown).toHaveProperty('llmLatencyMs');
      expect(result.metrics.apiCalls).toBe(1);
      expect(result.metrics.llmCalls).toBe(1);
    }, 5000);
  });

  describe('Failure Mode & Edge Case Handling', () => {
    test('returns deterministic typed fallback with 0 LLM calls when zero places found', async () => {
      process.env.MOCK_SCENARIO = 'empty';
      const result = await service.findClosestDealership(-26.1044, 28.0645);

      expect(result.metrics.zeroResultFallback).toBe(true);
      expect(result.metrics.llmCalls).toBe(0);
      expect(result.metrics.totalTokens).toBe(0);
      expect(result.answer).toContain('No authorized Volkswagen dealerships were found');
      delete process.env.MOCK_SCENARIO;
    });
  });
});
