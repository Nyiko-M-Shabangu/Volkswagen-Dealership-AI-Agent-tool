const axios = require('axios');
const config = require('../config/api-config');
const logger = require('./logger');
const { MOCK_VW_PLACES_SANDTON, MOCK_EMPTY_PLACES } = require('./mock-places');

/**
 * Searches Volkswagen car dealerships using Google Places API (New).
 * Uses `places:searchText` with `locationBias` to ensure live brand-specific results.
 */
async function searchNearbyDealerships(lat, lng, radius = 50000) {
  if (process.env.USE_MOCK_PLACES === 'true') {
    if (process.env.MOCK_SCENARIO === 'empty') return MOCK_EMPTY_PLACES;
    return MOCK_VW_PLACES_SANDTON;
  }

  try {
    const url = 'https://places.googleapis.com/v1/places:searchText';
    const response = await axios.post(
      url,
      {
        textQuery: 'Volkswagen dealership',
        includedType: 'car_dealer',
        locationBias: {
          circle: {
            center: { latitude: lat, longitude: lng },
            radius: radius
          }
        }
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-Api-Key': config.google.apiKey,
          'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location,places.rating,places.nationalPhoneNumber,places.websiteUri,places.currentOpeningHours'
        },
        timeout: config.google.timeout || 10000
      }
    );

    return response.data?.places || [];
  } catch (err) {
    const errorMsg = err.response?.data?.error?.message || err.message;
    logger.error(`Google Places API request failed via axios: ${errorMsg}`);
    throw new Error(`Google Places API error: ${errorMsg}`);
  }
}

module.exports = { searchNearbyDealerships };
