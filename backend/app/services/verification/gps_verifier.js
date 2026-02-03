import { haversine } from "../../utils/geo.js";

export const verify = (task, proof) => {
  const target = task.verification_criteria?.target_location; // [lat, lon]
  const user_loc = proof?.gps_location; // [lat, lon]
  if (!target || !user_loc) {
    throw new Error("Missing GPS location data");
  } else {
    // Determine distance
    const dist = haversine(target, user_loc);
    const min_dist = task.verification_criteria?.min_distance_meters || 100;
    if (dist > min_dist) {
      throw new Error(
        `Distance ${Math.round(dist)}m exceeds limit ${min_dist}m`,
      );
    }
  }
  return { status: "APPROVED" };
};
