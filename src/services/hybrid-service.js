const { ApiFirstService } = require('./api-first-service');
const { ToolCallingService } = require('./tool-calling-service');
const logger = require('../utils/logger');

class HybridService {
  constructor() {
    this.apiFirst = new ApiFirstService();
    this.toolCalling = new ToolCallingService();
  }

  /**
   * Evaluates query characteristics to route between API-First and Tool Calling.
   * Simple location queries -> API-First (lower latency, 1 LLM call, deterministic)
   * Multi-criteria or conversational queries -> Tool Calling (flexible, model-led parameter tuning)
   */
  classifyQuery(query) {
    const lower = (query || '').toLowerCase();

    // 1. Complex conditions, multi-criteria, comparisons, and conversational reasoning -> Tool Calling
    const complexPatterns = [
      /\b(ratings?|stars?|reviews?|scores?|satisfaction)\b/,
      /\b(open late|weekends?|saturday|sunday|open now|right now|after \d+|hours?|trading)\b/,
      /\b(compare|comparison|versus|\bvs\b|difference|better|best|rank)\b/,
      /\b(service|workshop|repairs?|maintenance|brake|urgent)\b/,
      /\b(charging|ev|id\.4|mastercars|certified|inventory|stock|test drive)\b/,
      /\b(buying|buy|options|financing|finance|check engine|dealer principal|park|drop off)\b/,
      /\band also\b/
    ];

    const hasComplexConditions = complexPatterns.some(pattern => pattern.test(lower));
    if (hasComplexConditions) {
      return 'tool-calling';
    }

    // 2. Direct proximity patterns without secondary constraints -> API-First
    const nearestPatterns = [
      /\b(closest|nearest)\b/,
      /\bwhere is\b/,
      /\bwhere can i find\b/,
      /\bhow far is\b/,
      /\bdirections to\b/,
      /\baddress of\b/
    ];

    const isSimpleNearest = nearestPatterns.some(pattern => pattern.test(lower));
    if (isSimpleNearest) {
      return 'api-first';
    }

    // Default to tool calling for exploratory queries
    return 'tool-calling';
  }

  async handleQuery(query, userLat, userLng) {
    const route = this.classifyQuery(query);
    logger.info(`HybridRouter directed query to [${route}] pattern: "${query}"`);

    if (route === 'api-first') {
      const result = await this.apiFirst.findClosestDealership(userLat, userLng);
      return {
        ...result,
        routeUsed: 'api-first',
        routeReason: 'Direct proximity lookup suited for pre-processing'
      };
    } else {
      const result = await this.toolCalling.findClosestDealership(userLat, userLng);
      return {
        ...result,
        routeUsed: 'tool-calling',
        routeReason: 'Complex or exploratory prompt requiring model decision making'
      };
    }
  }
}

module.exports = { HybridService };
