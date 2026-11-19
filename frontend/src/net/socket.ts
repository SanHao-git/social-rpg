import { io } from 'socket.io-client';

const opts = { autoConnect: false };
const url =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.DEV ? 'http://localhost:3000' : undefined);

export const socket = url ? io(url, opts) : io(opts);

export function connectWithName(name: string) {
  socket.auth = { name };
  socket.connect();
}