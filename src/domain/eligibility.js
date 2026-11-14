/**
 * Pharmacy-location eligibility evaluation (Egyptian Drug Authority rule).
 *
 * The EDA rule: a new pharmacy must be at least 100 m — measured as the
 * WALKING distance — from every existing pharmacy. Bands beyond 100 m are
 * advisory "how good is this spot" labels, adopted from the PharmaLoc
 * prototype notebook.
 *
 * Pure functions over the plain pharmacy result data produced by
 * domain/pharmacyResults.js — no network, no React, no SDK objects.
 *
 * NOTE: the classification distance is the WALKING distance, per the EDA
 * rule. When walking distances are unavailable (routing service failure)
 * no verdict can be certified, so the result is UNVERIFIED — never a
 * guess based on straight-line distance.
 */

/**
 * Bands in ascending order of separation. `maxMeters: null` means "no
 * upper bound" (last band). Thresholds are in meters of walking distance.
 */
export const ELIGIBILITY_BANDS = [
  {
    id: "not-eligible",
    maxMeters: 100,
    label: "Not eligible",
    color: "#d93025",
    description: "Closer than the 100 m minimum required by the EDA rule.",
  },
  {
    id: "potential",
    maxMeters: 150,
    label: "Potential",
    color: "#f29900",
    description: "Passes the 100 m rule, but a competitor is very close.",
  },
  {
    id: "strong",
    maxMeters: 250,
    label: "Strong",
    color: "#188038",
    description: "Passes the 100 m rule with a comfortable margin.",
  },
  {
    id: "very-strong",
    maxMeters: null,
    label: "Very strong",
    color: "#0b8043",
    description: "No competitor within 250 m walking distance.",
  },
];

/**
 * The verdict used when no band can be certified: no pharmacies were
 * found near the location, or walking distances are unavailable.
 */
export const UNVERIFIED_BAND = {
  id: "unverified",
  maxMeters: null,
  label: "Unverified",
  color: "#5f6368",
  description: "The EDA rule could not be evaluated for this location.",
};

/**
 * Maps a walking separation distance to its band.
 *
 * @param {number | null} walkingDistanceMeters
 * @returns {object | null} the matching band, or null when the distance
 *   is not a usable number (caller decides what "no band" means)
 */
export function classifySeparation(walkingDistanceMeters) {
  if (typeof walkingDistanceMeters !== "number" ||
      !Number.isFinite(walkingDistanceMeters)) {
    return null;
  }

  return (
    ELIGIBILITY_BANDS.find(
      (band) =>
        band.maxMeters === null ||
        walkingDistanceMeters <= band.maxMeters
    ) ?? null
  );
}

/**
 * Finds the nearest competitor by WALKING distance (the EDA measure).
 * Pharmacies without a walking route are excluded — a straight-line
 * distance cannot certify the rule.
 *
 * @param {Array<{ walkingDistanceMeters: number | null }>} pharmacies
 * @returns {object | null} the nearest pharmacy, or null when none has
 *   a walking distance
 */
export function findNearestPharmacy(pharmacies) {
  const withWalking = (pharmacies ?? []).filter(
    (pharmacy) =>
      typeof pharmacy.walkingDistanceMeters === "number" &&
      Number.isFinite(pharmacy.walkingDistanceMeters)
  );

  if (withWalking.length === 0) {
    return null;
  }

  return withWalking.reduce((nearest, pharmacy) =>
    pharmacy.walkingDistanceMeters < nearest.walkingDistanceMeters
      ? pharmacy
      : nearest
  );
}

/**
 * Evaluates the selected location: nearest competitor, walking
 * separation, and the resulting band.
 *
 * @param {Array} pharmacies - result list for the selected location
 * @returns {{
 *   band: object,
 *   nearestPharmacy: object | null,
 *   separationMeters: number | null,
 *   unverifiedReason: string | null,
 * }}
 */
export function evaluateLocation(pharmacies) {
  if (!pharmacies || pharmacies.length === 0) {
    return {
      band: UNVERIFIED_BAND,
      nearestPharmacy: null,
      separationMeters: null,
      unverifiedReason:
        "No pharmacies were found near this location, so the nearest competitor could not be measured.",
    };
  }

  const nearestPharmacy = findNearestPharmacy(pharmacies);

  if (!nearestPharmacy) {
    return {
      band: UNVERIFIED_BAND,
      nearestPharmacy: null,
      separationMeters: null,
      unverifiedReason:
        "Walking distances are unavailable (routing service unreachable), so the EDA rule could not be applied.",
    };
  }

  return {
    band: classifySeparation(nearestPharmacy.walkingDistanceMeters),
    nearestPharmacy,
    separationMeters: nearestPharmacy.walkingDistanceMeters,
    unverifiedReason: null,
  };
}
