const config = require('../config/api-config');
const { calculateDistance } = require('../utils/distance');
const { extractTokenUsage } = require('../utils/token-counter');
const { searchNearbyDealerships } = require('../utils/places-client');
const { createChatCompletion } = require('../utils/llm-client');
const logger = require('../utils/logger');

class ToolCallingService {
  constructor() {
    this.model = config.activeLlm.model;
    this.metrics = { apiCalls: 0, llmCalls: 0, totalTokens: 0 };

    this.tools = [{
      type: 'function',
      function: {
        name: 'search_nearby_dealerships',
        description: 'Search for Volkswagen dealerships near a specific geographic coordinate',
        parameters: {
          type: 'object',
          properties: {
            latitude: { type: 'number', description: 'Latitude of user or center point' },
            longitude: { type: 'number', description: 'Longitude of user or center point' },
            radius: { type: 'number', description: 'Search radius in meters', default: 50000 },
            max_results: { type: 'integer', description: 'Maximum results to return', default: 3 }
          },
          required: ['latitude', 'longitude']
        }
      }
    }];
  }

  async findClosestDealership(userLat, userLng) {
    const startTime = Date.now();
    this.metrics.apiCalls = 0;
    this.metrics.llmCalls = 0;
    this.metrics.totalTokens = 0;

    const turn1Start = Date.now();
    const initialResponse = await createChatCompletion({
      messages: [
        { 
          role: 'system', 
          content: 'You are an automotive assistant for Volkswagen South Africa. Always use the search_nearby_dealerships tool to look up live dealership data when a user asks for dealership locations, then synthesize a concise response with distance in km, address, and hours.' 
        },
        { 
          role: 'user', 
          content: `Where is the closest VW dealership? I am currently at latitude ${userLat}, longitude ${userLng}.` 
        }
      ],
      tools: this.tools,
      tool_choice: 'auto',
      temperature: 0.3
    });
    const llmTurn1Ms = Date.now() - turn1Start;
    this.metrics.llmCalls++;

    const initialTokenUsage = extractTokenUsage(initialResponse);
    if (initialTokenUsage) this.metrics.totalTokens += initialTokenUsage.total;

    const message = initialResponse.choices[0]?.message;
    if (!message) {
      throw new Error('No response message received from LLM');
    }

    if (message.tool_calls && message.tool_calls.length > 0) {
      const toolCall = message.tool_calls[0];
      let args = {};
      try {
        args = typeof toolCall.function.arguments === 'string'
          ? JSON.parse(toolCall.function.arguments)
          : toolCall.function.arguments;
      } catch (e) {
        logger.warn('Failed to parse tool arguments from model, using user coordinates fallback');
        args = { latitude: userLat, longitude: userLng };
      }

      const searchLat = args.latitude ?? userLat;
      const searchLng = args.longitude ?? userLng;
      const radius = args.radius ?? 50000;

      const placesStart = Date.now();
      const rawPlaces = await searchNearbyDealerships(searchLat, searchLng, radius);
      const placesLatencyMs = Date.now() - placesStart;
      this.metrics.apiCalls++;

      const dealerships = this._formatResults(rawPlaces, userLat, userLng);

      const turn2Start = Date.now();
      const finalResponse = await createChatCompletion({
        messages: [
          { role: 'system', content: 'You are an automotive assistant for Volkswagen South Africa. You MUST answer using ONLY the dealerships provided in the tool response. Do not introduce outside dealerships or locations from memory. State the closest dealership name, distance in km, address, and trading hours from the tool results.' },
          { role: 'user', content: `Where is the closest VW dealership? I am currently at latitude ${userLat}, longitude ${userLng}.` },
          message,
          {
            role: 'tool',
            tool_call_id: toolCall.id || 'call_001',
            name: toolCall.function.name,
            content: JSON.stringify(dealerships)
          }
        ],
        temperature: 0.3
      });
      const llmTurn2Ms = Date.now() - turn2Start;
      this.metrics.llmCalls++;

      const finalTokenUsage = extractTokenUsage(finalResponse);
      if (finalTokenUsage) this.metrics.totalTokens += finalTokenUsage.total;

      return {
        answer: finalResponse.choices[0].message.content,
        rawData: dealerships,
        metrics: {
          ...this.metrics,
          latencyMs: Date.now() - startTime,
          breakdown: {
            llmTurn1Ms,
            placesLatencyMs,
            llmTurn2Ms,
            totalLlmMs: llmTurn1Ms + llmTurn2Ms
          },
          tokenUsage: {
            initial: initialTokenUsage,
            final: finalTokenUsage,
            total: this.metrics.totalTokens
          },
          provider: config.activeLlm.provider,
          model: this.model
        }
      };
    }

    // Fallback if model answered directly without tool call
    return {
      answer: message.content,
      rawData: null,
      metrics: {
        ...this.metrics,
        latencyMs: Date.now() - startTime,
        tokenUsage: {
          initial: initialTokenUsage,
          total: this.metrics.totalTokens
        },
        provider: config.activeLlm.provider,
        model: this.model
      }
    };
  }

  _formatResults(places, userLat, userLng) {
    return places
      .filter(p => {
        const name = p.displayName?.text?.toLowerCase() || '';
        return name.includes('volkswagen') || name.includes('vw');
      })
      .map(p => ({
        name: p.displayName?.text,
        address: p.formattedAddress,
        rating: p.rating || 'N/A',
        phone: p.nationalPhoneNumber || 'N/A',
        distanceKm: calculateDistance(userLat, userLng, p.location),
        openNow: p.currentOpeningHours?.openNow ?? null
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);
  }
}

module.exports = { ToolCallingService };
