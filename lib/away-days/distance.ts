/**
 * Distance between two grounds — Haversine over the mean Earth radius (spec §26).
 * Computed on the page from the registry's coordinates; never stored as a fact.
 */

const EARTH_KM = 6371.0088

export type LatLng = { latitude: number; longitude: number }

export function haversineKm(a: LatLng, b: LatLng): number {
  const rad = Math.PI / 180
  const dLat = (b.latitude - a.latitude) * rad
  const dLng = (b.longitude - a.longitude) * rad
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(a.latitude * rad) * Math.cos(b.latitude * rad) * Math.sin(dLng / 2) ** 2
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)))
}

/** Rounded for print: to 10 km under 1,000 km, to 100 km above — a caption, not a survey. */
export function roundKm(km: number): number {
  if (km < 50) return Math.round(km)
  return km < 1000 ? Math.round(km / 10) * 10 : Math.round(km / 100) * 100
}
