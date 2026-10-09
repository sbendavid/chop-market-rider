import { Linking } from 'react-native';

import { notify } from './confirm';

/** Turn-by-turn in Google Maps (app if installed, browser otherwise). */
export function openDirections(to: { lat: number | null; lng: number | null; address?: string | null }) {
  const destination = to.lat != null && to.lng != null ? `${to.lat},${to.lng}` : (to.address ?? '');
  if (!destination) return notify('No location for this stop', 'Call ahead and ask for directions.');
  const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(destination)}&travelmode=driving`;
  void Linking.openURL(url).catch(() => notify("Couldn't open maps"));
}

export function callPhone(phone: string) {
  void Linking.openURL(`tel:${phone.replace(/\s+/g, '')}`).catch(() => notify("Couldn't start the call", phone));
}

/** 850 -> "850 m", 2340 -> "2.3 km". */
export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return '';
  return meters < 1000 ? `${Math.round(meters / 10) * 10} m` : `${(meters / 1000).toFixed(1)} km`;
}
