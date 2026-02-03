/**
 * Calculate the great-circle distance between two points on the Earth's surface
 * using the Haversine formula.
 * @param {number[]} coords1 - [latitude, longitude] of point 1
 * @param {number[]} coords2 - [latitude, longitude] of point 2
 * @returns {number} Distance in meters
 */
export const haversine = (coords1, coords2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371e3; // metres

  const lat1 = coords1[0];
  const lon1 = coords1[1];
  const lat2 = coords2[0];
  const lon2 = coords2[1];

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);
  const delta_phi = toRad(lat2 - lat1);
  const delta_lambda = toRad(lon2 - lon1);

  const a =
    Math.sin(delta_phi / 2) * Math.sin(delta_phi / 2) +
    Math.cos(phi1) *
      Math.cos(phi2) *
      Math.sin(delta_lambda / 2) *
      Math.sin(delta_lambda / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
};
