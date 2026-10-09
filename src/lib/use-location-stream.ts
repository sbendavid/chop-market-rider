import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { useEffect } from 'react';
import { create } from 'zustand';

import { riderApi } from '@/api/endpoints';
import type { RiderLocationBody } from '@/api/types';

import type { LatLng } from './location';
import { getSocket } from './socket';

/** On a job customers watch the bike move; between jobs the server only needs a rough fix for nearby jobs. */
const ON_JOB = { everyMs: 10_000, meters: 20, accuracy: Location.Accuracy.High };
const IDLE = { everyMs: 60_000, meters: 100, accuracy: Location.Accuracy.Balanced };
const KEEP_AWAKE_TAG = 'chop-rider-job';

type PositionState = { position: LatLng | null; sharing: boolean; error: string | null };

/** Last fix, for distances on screen. */
export const useRiderPosition = create<PositionState>(() => ({ position: null, sharing: false, error: null }));

function send(body: RiderLocationBody) {
  const socket = getSocket();
  // The socket is cheaper on mobile data; fall back to HTTP when it's down.
  if (socket.connected) socket.emit('rider:location', body, () => undefined);
  else void riderApi.location(body).catch(() => undefined);
}

/**
 * Streams the rider's position while online and the app is open (foreground
 * only, by design: no background-location permission). During a job the
 * screen is kept on, since riders ride with the phone mounted.
 */
export function useLocationStream(online: boolean, onJob: boolean) {
  useEffect(() => {
    if (!online) {
      useRiderPosition.setState({ sharing: false });
      return;
    }
    const mode = onJob ? ON_JOB : IDLE;
    let sub: Location.LocationSubscription | null = null;
    let cancelled = false;
    let lastSent = 0;

    void (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync().catch(() => ({ status: 'denied' }));
      if (cancelled) return;
      if (status !== 'granted') {
        useRiderPosition.setState({ sharing: false, error: 'Allow location so customers can follow their food.' });
        return;
      }
      useRiderPosition.setState({ sharing: true, error: null });
      sub = await Location.watchPositionAsync(
        { accuracy: mode.accuracy, timeInterval: mode.everyMs, distanceInterval: mode.meters },
        ({ coords }) => {
          const position = { lat: coords.latitude, lng: coords.longitude };
          useRiderPosition.setState({ position });
          const now = Date.now();
          if (now - lastSent < mode.everyMs) return;
          lastSent = now;
          send({
            ...position,
            heading: coords.heading != null && coords.heading >= 0 ? coords.heading % 360 : undefined,
            speedKmh:
              coords.speed != null && coords.speed >= 0 ? Math.min(200, Math.round(coords.speed * 3.6)) : undefined,
          });
        },
      ).catch(() => null);
      if (cancelled) sub?.remove();
    })();

    return () => {
      cancelled = true;
      sub?.remove();
    };
  }, [online, onJob]);

  useEffect(() => {
    if (!onJob) return;
    void activateKeepAwakeAsync(KEEP_AWAKE_TAG).catch(() => undefined);
    return () => {
      void Promise.resolve(deactivateKeepAwake(KEEP_AWAKE_TAG)).catch(() => undefined);
    };
  }, [onJob]);
}
