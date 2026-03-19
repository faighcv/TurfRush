import { Server } from 'socket.io';

let io;

export function initSocket(httpServer) {
  io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket) => {
    const userId = socket.handshake.auth?.userId;
    if (userId) {
      socket.join(`user:${userId}`);
    }

    // Join a city room for city-wide territory updates
    socket.on('join:city', (cityId) => {
      socket.join(`city:${cityId || 'montreal'}`);
    });

    socket.on('disconnect', () => {});
  });

  return io;
}

export function broadcastTerritoryUpdate(hexUpdates) {
  if (!io) return;
  io.to('city:montreal').emit('territory:updated', hexUpdates);
}

export function notifyUser(userId, event, data) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, data);
}

export { io };
