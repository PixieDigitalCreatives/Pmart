import { io } from 'socket.io-client';
import { getAccessToken } from './apiClient';

// Same origin by default: the Vite dev server (and the production reverse proxy) forward /socket.io to the API.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || window.location.origin;

/**
 * Opens an authenticated Socket.IO connection. The caller must call `.close()` when done.
 */
export function openSocket() {
  return io(SOCKET_URL, {
    path: '/socket.io',
    transports: ['websocket', 'polling'],
    auth: (cb) => cb({ token: getAccessToken() })
  });
}
