import type { IDeliveryCoordinates } from "../types/model.types.js";

const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org/reverse";
const NOMINATIM_RATE_LIMIT_MS = 1000; // 1 request per second as per Nominatim policy
let lastNominatimCall = 0;

/**
 * Reverse geocodes coordinates using Nominatim (OpenStreetMap's free service)
 * Returns area name (suburb/village/town) from coordinates
 * Respects Nominatim's rate limit (1 req/sec)
 */
export const reverseGeocodeCoordinates = async (
  latitude: number,
  longitude: number,
): Promise<string | null> => {
  try {
    // Enforce rate limiting
    const now = Date.now();
    const timeSinceLastCall = now - lastNominatimCall;
    if (timeSinceLastCall < NOMINATIM_RATE_LIMIT_MS) {
      await new Promise((resolve) =>
        setTimeout(resolve, NOMINATIM_RATE_LIMIT_MS - timeSinceLastCall),
      );
    }

    const response = await fetch(
      `${NOMINATIM_BASE_URL}?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`,
      {
        headers: {
          "User-Agent": "Food-Service-Backend/1.0",
        },
      },
    );

    lastNominatimCall = Date.now();

    if (!response.ok) {
      console.error(
        `Nominatim reverse geocoding failed: ${response.statusText}`,
      );
      return null;
    }

    const data: any = await response.json();

    // Extract area name: prefer suburb, then village, then town, then city
    const addressDetails = data.address || {};
    const areaName =
      addressDetails.suburb ||
      addressDetails.village ||
      addressDetails.town ||
      addressDetails.city ||
      null;

    return areaName;
  } catch (error) {
    console.error("Error during reverse geocoding:", error);
    return null;
  }
};

/**
 * Validates delivery coordinates
 */
export const validateCoordinates = (
  latitude: number,
  longitude: number,
): { valid: boolean; error?: string } => {
  if (latitude < -90 || latitude > 90) {
    return { valid: false, error: "Latitude must be between -90 and 90" };
  }
  if (longitude < -180 || longitude > 180) {
    return { valid: false, error: "Longitude must be between -180 and 180" };
  }
  return { valid: true };
};

/**
 * Calculates distance between two coordinates (in kilometers)
 * Uses Haversine formula for great circle distance
 */
export const calculateDistance = (
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number => {
  const R = 6371; // Earth's radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

/**
 * Checks if delivery location is reasonable
 * (within distance threshold from restaurant to avoid fraud)
 */
export const isLocationReasonable = (
  restaurantLat: number,
  restaurantLon: number,
  deliveryLat: number,
  deliveryLon: number,
  maxDeliveryRadiusKm: number = 25, // Default ~25km
): boolean => {
  const distance = calculateDistance(
    restaurantLat,
    restaurantLon,
    deliveryLat,
    deliveryLon,
  );
  return distance <= maxDeliveryRadiusKm;
};

/**
 * Builds delivery coordinates object from request
 */
export const buildDeliveryCoordinates = (
  latitude: number,
  longitude: number,
  accuracy?: number,
): IDeliveryCoordinates => {
  return {
    latitude,
    longitude,
    accuracy,
    capturedAt: new Date(),
  };
};
