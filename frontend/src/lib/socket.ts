import { io, Socket } from 'socket.io-client';
import { useAuthStore } from './store';
import { useMapStore } from './store';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const user = useAuthStore.getState().user;
    socket = io(process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000', {
      auth: { userId: user?.id },
      transports: ['websocket'],
    });

    socket.on('connect', () => {
      socket?.emit('join:city', 'montreal');
    });

    socket.on('territory:updated', () => {
      useMapStore.getState().triggerTerritoryRefresh();
    });

    socket.on('disconnect', () => {});
  }
  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}
