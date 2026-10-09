import { io, type Socket } from 'socket.io-client';

import { API_ORIGIN, tokens } from '@/api/client';

let socket: Socket | null = null;

/**
 * One shared Socket.IO connection, opened on first use. The token is read on
 * every (re)connect, so a refreshed access token is picked up automatically.
 */
export function getSocket(): Socket {
  if (socket) return socket;
  socket = io(API_ORIGIN, {
    // WebSocket only: long-polling burns data and battery on mobile networks.
    transports: ['websocket'],
    auth: (cb) => {
      void tokens.getAccessToken().then((token) => cb({ token }));
    },
    reconnectionDelay: 2_000,
    reconnectionDelayMax: 30_000,
  });
  socket.on('connect_error', (err) => {
    // Expired access token: refresh happens in getAccessToken on the next attempt.
    if (err.message === 'Unauthorized') void tokens.getAccessToken();
  });
  return socket;
}

export function closeSocket() {
  socket?.disconnect();
  socket = null;
}
