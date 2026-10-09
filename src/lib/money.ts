/** All amounts from the API are integer kobo (₦1 = 100 kobo). */

function group(n: number) {
  return Math.trunc(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** 150000 -> "₦1,500", 150050 -> "₦1,500.50". No Intl dependency (old Android WebViews/Hermes). */
export function formatNaira(kobo: number | null | undefined): string {
  const value = kobo ?? 0;
  const sign = value < 0 ? '-' : '';
  const abs = Math.abs(value);
  const naira = Math.floor(abs / 100);
  const rest = abs % 100;
  return `${sign}₦${group(naira)}${rest ? `.${rest.toString().padStart(2, '0')}` : ''}`;
}

/** Parse what a user typed ("1,500" or "1500.5") into kobo. */
export function nairaToKobo(input: string): number | null {
  const cleaned = input.replace(/[₦,\s]/g, '');
  if (!/^\d+(\.\d{0,2})?$/.test(cleaned)) return null;
  return Math.round(Number(cleaned) * 100);
}

export function formatDistance(meters: number | null | undefined): string {
  if (meters == null) return '';
  return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}
