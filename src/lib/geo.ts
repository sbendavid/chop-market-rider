import type { LatLng } from './location';

/** Same assumptions as the server: roads are ~1.3x straight line, ~20 km/h in city traffic. */
const ROAD_FACTOR = 1.3;
const CITY_KMH = 20;

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6_371_000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export function etaMinutes(from: LatLng, to: LatLng): number {
  const km = (haversineMeters(from, to) * ROAD_FACTOR) / 1000;
  return Math.max(1, Math.ceil((km / CITY_KMH) * 60));
}
