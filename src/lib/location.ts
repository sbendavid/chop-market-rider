import * as Location from 'expo-location';

export type LatLng = { lat: number; lng: number };

/** Lagos Island: shown when we can't get the phone's location. */
export const FALLBACK_LOCATION: LatLng = { lat: 6.4541, lng: 3.3947 };

/**
 * Current position, or null when permission is denied or GPS is off.
 * Uses the last known fix first: instant and works indoors.
 */
export async function currentLocation(): Promise<LatLng | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') return null;
    const last = await Location.getLastKnownPositionAsync({ maxAge: 5 * 60_000 });
    const pos =
      last ?? (await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }));
    return { lat: pos.coords.latitude, lng: pos.coords.longitude };
  } catch {
    return null;
  }
}
