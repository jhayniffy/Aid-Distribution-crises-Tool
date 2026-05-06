/**
 * Ray-casting point-in-polygon test.
 * @param {{ lat: number, lng: number }} point
 * @param {Array<{ lat: number, lng: number }>} polygon  - ordered vertices
 * @returns {boolean}
 */
export function isInsideGeofence(point, polygon) {
  let inside = false;
  const { lat: px, lng: py } = point;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const { lat: xi, lng: yi } = polygon[i];
    const { lat: xj, lng: yj } = polygon[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** Promisified wrapper around the browser Geolocation API */
export function getCurrentPosition(options = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Geolocation not supported'));
    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 10000, ...options });
  });
}
