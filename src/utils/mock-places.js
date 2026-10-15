/**
 * Realistic Google Places API (New) mock fixtures for offline testing,
 * CI environments, and edge-case failure mode simulation.
 */

const MOCK_VW_PLACES_SANDTON = [
  {
    id: 'places/ChIJN1t_tDeuEmsRUsoyG83frY4',
    displayName: { text: 'Hatfield Volkswagen Bryanston', languageCode: 'en' },
    formattedAddress: 'Cnr William Nicol & Ballyclare Dr, Bryanston, Sandton, 2191, South Africa',
    location: { latitude: -26.0712, longitude: 28.0264 },
    rating: 4.4,
    userRatingCount: 512,
    nationalPhoneNumber: '011 799 8000',
    websiteUri: 'https://www.hatfieldvw.co.za',
    currentOpeningHours: {
      openNow: true,
      weekdayDescriptions: [
        'Monday: 7:30 AM – 5:30 PM',
        'Tuesday: 7:30 AM – 5:30 PM',
        'Wednesday: 7:30 AM – 5:30 PM',
        'Thursday: 7:30 AM – 5:30 PM',
        'Friday: 7:30 AM – 5:30 PM',
        'Saturday: 8:30 AM – 1:00 PM',
        'Sunday: Closed'
      ]
    }
  },
  {
    id: 'places/ChIJs2-q2b6tEmsRFVz0hO9uU-A',
    displayName: { text: 'Barons Volkswagen Woodmead', languageCode: 'en' },
    formattedAddress: 'Waterval Cres, Woodmead, Sandton, 2191, South Africa',
    location: { latitude: -26.0528, longitude: 28.0869 },
    rating: 4.2,
    userRatingCount: 680,
    nationalPhoneNumber: '011 209 8000',
    websiteUri: 'https://www.baronsvw.co.za',
    currentOpeningHours: {
      openNow: true,
      weekdayDescriptions: [
        'Monday: 7:30 AM – 5:30 PM',
        'Tuesday: 7:30 AM – 5:30 PM',
        'Wednesday: 7:30 AM – 5:30 PM',
        'Thursday: 7:30 AM – 5:30 PM',
        'Friday: 7:30 AM – 5:30 PM',
        'Saturday: 8:00 AM – 1:00 PM',
        'Sunday: Closed'
      ]
    }
  },
  {
    id: 'places/ChIJw74rZlqtEmsR_8_X46oM12A',
    displayName: { text: 'Lindsay Saker Midrand Volkswagen', languageCode: 'en' },
    formattedAddress: 'Old Pretoria Main Rd, Halfway House, Midrand, 1685, South Africa',
    location: { latitude: -25.9961, longitude: 28.1294 },
    rating: 4.1,
    userRatingCount: 395,
    nationalPhoneNumber: '011 541 8000',
    websiteUri: 'https://www.lindsaysaker.co.za',
    currentOpeningHours: {
      openNow: false,
      weekdayDescriptions: [
        'Monday: 7:30 AM – 5:30 PM',
        'Tuesday: 7:30 AM – 5:30 PM',
        'Wednesday: 7:30 AM – 5:30 PM',
        'Thursday: 7:30 AM – 5:30 PM',
        'Friday: 7:30 AM – 5:30 PM',
        'Saturday: 8:30 AM – 12:30 PM',
        'Sunday: Closed'
      ]
    }
  },
  {
    id: 'places/ChIJx8xXxL5uEmsR199X1234567',
    displayName: { text: 'Toyota Sandton Auto', languageCode: 'en' },
    formattedAddress: 'Rivonia Rd, Sandton, 2196, South Africa',
    location: { latitude: -26.1030, longitude: 28.0550 },
    rating: 4.5,
    userRatingCount: 410,
    nationalPhoneNumber: '011 883 0000',
    websiteUri: 'https://www.toyota.co.za',
    currentOpeningHours: { openNow: true }
  }
];

const MOCK_EMPTY_PLACES = [];

const MOCK_LLM_API_FIRST_RESPONSE = {
  id: 'chatcmpl-mock-api-first-001',
  object: 'chat.completion',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'The closest authorized Volkswagen dealership to your location in Sandton is Hatfield Volkswagen Bryanston, located at Cnr William Nicol & Ballyclare Dr, Bryanston (approximately 5.1 km away). Phone: 011 799 8000. Operating hours: Monday to Friday 7:30 AM – 5:30 PM, Saturday 8:30 AM – 1:00 PM.'
      },
      finish_reason: 'stop'
    }
  ],
  usage: {
    prompt_tokens: 182,
    completion_tokens: 76,
    total_tokens: 258
  }
};

const MOCK_LLM_TOOL_CALL_RESPONSE = {
  id: 'chatcmpl-mock-tool-call-001',
  object: 'chat.completion',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_mock_123',
            type: 'function',
            function: {
              name: 'search_nearby_dealerships',
              arguments: JSON.stringify({
                latitude: -26.1044,
                longitude: 28.0645,
                radius: 50000
              })
            }
          }
        ]
      },
      finish_reason: 'tool_calls'
    }
  ],
  usage: {
    prompt_tokens: 241,
    completion_tokens: 33,
    total_tokens: 274
  }
};

const MOCK_LLM_SYNTHESIS_RESPONSE = {
  id: 'chatcmpl-mock-synthesis-002',
  object: 'chat.completion',
  choices: [
    {
      index: 0,
      message: {
        role: 'assistant',
        content: 'Based on your location, the closest Volkswagen dealership is Hatfield Volkswagen Bryanston, situated approximately 5.1 km away at Cnr William Nicol & Ballyclare Dr, Bryanston. Their phone number is 011 799 8000 and trading hours are Monday to Friday 7:30 AM – 5:30 PM, Saturday 8:30 AM – 1:00 PM.'
      },
      finish_reason: 'stop'
    }
  ],
  usage: {
    prompt_tokens: 78,
    completion_tokens: 89,
    total_tokens: 167
  }
};

module.exports = {
  MOCK_VW_PLACES_SANDTON,
  MOCK_EMPTY_PLACES,
  MOCK_LLM_API_FIRST_RESPONSE,
  MOCK_LLM_TOOL_CALL_RESPONSE,
  MOCK_LLM_SYNTHESIS_RESPONSE
};
