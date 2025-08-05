// Geographic distance calculation utilities
const zipcodes = require('zipcodes');

interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculate the distance between two points using the Haversine formula
 * @param lat1 Latitude of first point
 * @param lon1 Longitude of first point  
 * @param lat2 Latitude of second point
 * @param lon2 Longitude of second point
 * @returns Distance in miles
 */
export function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3959; // Earth's radius in miles
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
    
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRadians(degrees: number): number {
  return degrees * (Math.PI / 180);
}

/**
 * Get coordinates for a ZIP code
 * @param zipCode 5-digit ZIP code
 * @returns Coordinates object or null if not found
 */
export function getZipCoordinates(zipCode: string): Coordinates | null {
  try {
    // Clean ZIP code to first 5 digits
    const cleanZip = zipCode.substring(0, 5);
    const location = zipcodes.lookup(cleanZip);
    
    if (location && location.latitude && location.longitude) {
      return {
        lat: parseFloat(location.latitude),
        lng: parseFloat(location.longitude)
      };
    }
    
    return null;
  } catch (error) {
    console.error(`Error looking up ZIP ${zipCode}:`, error);
    return null;
  }
}

/**
 * Calculate distance between two ZIP codes
 * @param zip1 First ZIP code
 * @param zip2 Second ZIP code  
 * @returns Distance in miles or null if coordinates not found
 */
export function calculateZipDistance(zip1: string, zip2: string): number | null {
  const coords1 = getZipCoordinates(zip1);
  const coords2 = getZipCoordinates(zip2);
  
  if (!coords1 || !coords2) {
    return null;
  }
  
  return calculateDistance(coords1.lat, coords1.lng, coords2.lat, coords2.lng);
}