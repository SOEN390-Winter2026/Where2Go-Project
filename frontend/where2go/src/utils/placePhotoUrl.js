import { GOOGLE_MAPS_API_KEY } from '@env';

/**
 * Builds a Google Places Photo API URL from a photo_reference.
 * @param {string} photoReference - The photo_reference from Places API response
 * @param {number} maxWidth - Max width in pixels (default 400)
 * @returns {string|null} Photo URL or null if no reference
 */
export function getPlacePhotoUrl(photoReference, maxWidth = 400) {
  if (!photoReference || !GOOGLE_MAPS_API_KEY) return null;
  return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=${maxWidth}&photo_reference=${photoReference}&key=${GOOGLE_MAPS_API_KEY}`;
}
