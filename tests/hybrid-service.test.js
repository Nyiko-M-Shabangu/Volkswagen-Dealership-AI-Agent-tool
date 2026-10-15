const { HybridService } = require('../src/services/hybrid-service');
const sampleQueries = require('./fixtures/sample-queries.json');

describe('HybridService Routing Classification', () => {
  let hybrid;

  beforeEach(() => {
    hybrid = new HybridService();
  });

  test('classifies simple nearest queries to api-first', () => {
    expect(hybrid.classifyQuery('Where is the closest VW dealership?')).toBe('api-first');
    expect(hybrid.classifyQuery('Nearest VW dealer')).toBe('api-first');
  });

  test('classifies queries with rating, hours, or comparisons to tool-calling', () => {
    expect(hybrid.classifyQuery('Find a dealer with rating above 4.5 and open late')).toBe('tool-calling');
    expect(hybrid.classifyQuery('Compare the closest 2 dealerships and also check weekend hours')).toBe('tool-calling');
  });

  test('accurately routes all sample query fixtures', () => {
    for (const item of sampleQueries) {
      const decision = hybrid.classifyQuery(item.query);
      expect(decision).toBe(item.expectedRoute);
    }
  });
});
