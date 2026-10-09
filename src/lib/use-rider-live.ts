import { useQueryClient } from '@tanstack/react-query';
import * as Notifications from 'expo-notifications';
import { useEffect, useRef } from 'react';
import { Platform, Vibration } from 'react-native';

import { riderApi } from '@/api/endpoints';
import type { Delivery, Job, OrderStatus, Page } from '@/api/types';

import { formatNaira } from './money';
import { queryKeys } from './query-client';
import { getSocket } from './socket';

type DeliveryEvent = { orderId: string; status: OrderStatus; readyAt: string | null };

const NEW_JOB_VIBRATION = [0, 400, 200, 400];

function banner(title: string, body: string, data: Record<string, string>) {
  void Notifications.scheduleNotificationAsync({
    content: { title, body, data },
    trigger: null,
  }).catch(() => undefined);
}

/**
 * Live rider feed. Joins this rider's delivery room and the online-riders
 * broadcast (the server picks the rooms from the login).
 *
 * "job:available" goes to every online rider in the city, so the app refetches
 * its own nearby list and only buzzes when the new job is actually within
 * reach. "delivery:updated" covers the rider's own jobs: food ready, cancelled.
 */
export function useRiderLive(enabled: boolean, online: boolean) {
  const queryClient = useQueryClient();
  const onlineRef = useRef(online);
  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  useEffect(() => {
    if (!enabled) return;
    const socket = getSocket();
    const refreshMine = () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.deliveriesAll });
      void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
    };
    const join = () => {
      socket.emit('subscribe:rider:deliveries', {});
      refreshMine();
      void queryClient.invalidateQueries({ queryKey: queryKeys.jobs });
    };

    const onJobAvailable = async ({ orderId }: { orderId: string }) => {
      if (!onlineRef.current) return;
      const jobs = await queryClient
        .fetchQuery({ queryKey: queryKeys.jobs, queryFn: riderApi.jobs, staleTime: 0 })
        .catch(() => [] as Job[]);
      const job = jobs.find((j) => j.orderId === orderId);
      if (!job) return; // too far away for this rider
      if (Platform.OS !== 'web') Vibration.vibrate(NEW_JOB_VIBRATION);
      banner(
        'New delivery job',
        `${job.kitchen.name} · ${(job.toPickupMeters / 1000).toFixed(1)} km away · earn ${formatNaira(job.payoutKobo)}`,
        { orderId },
      );
    };

    const onJobTaken = ({ orderId }: { orderId: string }) => {
      queryClient.setQueryData<Job[]>(queryKeys.jobs, (jobs) => jobs?.filter((j) => j.orderId !== orderId));
    };

    const onDeliveryUpdated = (e: DeliveryEvent) => {
      const cached = queryClient
        .getQueryData<Page<Delivery>>(queryKeys.deliveries('active'))
        ?.data.find((d) => d._id === e.orderId);
      refreshMine();
      if (!cached) return;
      const ref = cached.ref;
      if (e.status === 'cancelled') {
        if (Platform.OS !== 'web') Vibration.vibrate(NEW_JOB_VIBRATION);
        banner('Order cancelled', `#${ref} from ${cached.kitchen.name} was cancelled. Don't collect it.`, {
          orderId: e.orderId,
        });
      } else if (e.readyAt && !cached.readyAt) {
        banner('Food is ready', `#${ref} is packed and waiting at ${cached.kitchen.name}.`, { orderId: e.orderId });
      }
    };

    socket.on('connect', join);
    socket.on('job:available', onJobAvailable);
    socket.on('job:taken', onJobTaken);
    socket.on('delivery:updated', onDeliveryUpdated);
    if (socket.connected) join();

    return () => {
      socket.off('connect', join);
      socket.off('job:available', onJobAvailable);
      socket.off('job:taken', onJobTaken);
      socket.off('delivery:updated', onDeliveryUpdated);
    };
  }, [enabled, queryClient]);
}
