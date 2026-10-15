const { calculateDistance } = require('../src/utils/distance');

describe('Distance Calculator (Haversine Formula)', () => {
  test('returns 0 for identical coordinates', () => {
    const lat = 40.7128;
    const lng = -74.0060;
    const dist = calculateDistance(lat, lng, { latitude: lat, longitude: lng });
    expect(dist).toBe(0);
  });

  test('calculates accurate distance between known South African landmarks (Sandton to Rosebank)', () => {
    // Sandton City (-26.1044, 28.0645) to Rosebank Mall (-26.1467, 28.0436) ~ 4.5 km
    const dist = calculateDistance(-26.1044, 28.0645, {
      latitude: -26.1467,
      longitude: 28.0436
    });
    expect(dist).toBeGreaterThanOrEqual(4.0);
    expect(dist).toBeLessThanOrEqual(5.0);
  });

  test('supports { lat, lng } shorthand properties', () => {
    const dist1 = calculateDistance(40.7128, -74.0060, { latitude: 40.7500, longitude: -74.0000 });
    const dist2 = calculateDistance(40.7128, -74.0060, { lat: 40.7500, lng: -74.0000 });
    expect(dist1).toBe(dist2);
  });

  test('gracefully handles missing or null location object', () => {
    expect(calculateDistance(40.7128, -74.0060, null)).toBe(0);
    expect(calculateDistance(40.7128, -74.0060, undefined)).toBe(0);
  });
});
