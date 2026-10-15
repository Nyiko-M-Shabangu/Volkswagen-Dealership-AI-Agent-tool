/**
 * Calculate distance between two coordinates using Haversine formula
 * @param {number} lat1 - Latitude of point 1
 * @param {number} lng1 - Longitude of point 1
 * @param {Object} loc2 - { latitude, longitude } or { lat, lng }
 * @returns {number} Distance in kilometers, rounded to 1 decimal place
 */
function calculateDistance(lat1, lng1, loc2) {
  if (!loc2) return 0;
  const lat2 = loc2.latitude !== undefined ? loc2.latitude : loc2.lat;
  const lng2 = loc2.longitude !== undefined ? loc2.longitude : loc2.lng;

  const R = 6371; // Earth radius in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = 
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * 
    Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

module.exports = { calculateDistance };
