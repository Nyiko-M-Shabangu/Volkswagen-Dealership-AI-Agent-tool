const config = require('../config/api-config');
const { calculateDistance } = require('../utils/distance');
const { extractTokenUsage } = require('../utils/token-counter');
const { searchNearbyDealerships } = require('../utils/places-client');
const { createChatCompletion } = require('../utils/llm-client');

class ApiFirstService {
  constructor() {
    this.model = config.activeLlm.model;
    this.metrics = { apiCalls: 0, llmCalls: 0, totalTokens: 0 };
  }

  async findClosestDealership(userLat, userLng) {
    const startTime = Date.now();
    this.metrics.apiCalls = 0;
    this.metrics.llmCalls = 0;
    this.metrics.totalTokens = 0;

    const placesStart = Date.now();
    const rawPlaces = await searchNearbyDealerships(userLat, userLng, 50000);
    const placesLatencyMs = Date.now() - placesStart;
    this.metrics.apiCalls++;

    const dealerships = this._processResults(rawPlaces, userLat, userLng);

    // Deterministic typed fallback if zero dealerships found within search radius
    if (dealerships.length === 0) {
      return {
        answer: 'No authorized Volkswagen dealerships were found within 50 km of your coordinates.',
        rawData: [],
        metrics: {
          ...this.metrics,
          latencyMs: Date.now() - startTime,
          breakdown: {
            placesLatencyMs,
            llmLatencyMs: 0
          },
          tokenUsage: { prompt: 0, completion: 0, total: 0 },
          provider: config.activeLlm.provider,
          model: this.model,
          zeroResultFallback: true
        }
      };
    }

    const systemPrompt = 'You are an automotive assistant for Volkswagen South Africa. Use the provided dealership data to answer concisely. Include name, distance in km, address, and trading hours.';
    const userPrompt = `User location: (${userLat}, ${userLng})
Closest Volkswagen dealerships:
${JSON.stringify(dealerships, null, 2)}

Answer: Where is the closest VW dealership?`;

    const llmStart = Date.now();
    const completion = await createChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.3
    });
    const llmLatencyMs = Date.now() - llmStart;
    this.metrics.llmCalls++;

    const tokenUsage = extractTokenUsage(completion);
    if (tokenUsage) this.metrics.totalTokens += tokenUsage.total;

    return {
      answer: completion.choices[0].message.content,
      rawData: dealerships,
      metrics: {
        ...this.metrics,
        latencyMs: Date.now() - startTime,
        breakdown: {
          placesLatencyMs,
          llmLatencyMs
        },
        tokenUsage,
        provider: config.activeLlm.provider,
        model: this.model
      }
    };
  }

  _processResults(places, userLat, userLng) {
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
        openNow: p.currentOpeningHours?.openNow ?? null,
        website: p.websiteUri || 'N/A'
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, 3);
  }
}

module.exports = { ApiFirstService };
