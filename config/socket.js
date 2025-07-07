import { Server } from 'socket.io';

let io;

const initSocket = (server) => {
  // Allow multiple origins for Socket.io CORS
  const devOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5173'
  ];
  const prodOrigins = [
    'https://ful2win.vercel.app',
    'https://ful-2-win.vercel.app',
    'https://fulboost.fun',
    'https://www.fulboost.fun'
  ];
  let allowedOrigins = [...prodOrigins];
  if (process.env.NODE_ENV !== 'production') {
    allowedOrigins = [...prodOrigins, ...devOrigins];
  }
  if (process.env.FRONTEND_URL) {
    allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
  }
  if (process.env.LOCAL) {
    allowedOrigins.push(process.env.LOCAL.replace(/\/$/, ''));
  }
  console.log('[Socket.io] Allowed origins:', allowedOrigins);

  io = new Server(server, {
    cors: {
      origin: (origin, callback) => {
        if (!origin) return callback(null, true); // allow server-to-server
        const normalized = origin.replace(/\/$/, '');
        if (allowedOrigins.includes(normalized)) {
          return callback(null, true);
        }
        return callback(new Error('Not allowed by Socket.io CORS'));
      },
      methods: ['GET', 'POST'],
      credentials: true
    },
    allowEIO3: true
  });

  io.on('connection', (socket) => {
    console.log('A user connected:', socket.id);

    // Handle joining a room (e.g., for chat or game room)
    socket.on('join_room', (roomId) => {
      socket.join(roomId);
      console.log(`User ${socket.id} joined room ${roomId}`);
    });

    // Handle joining a user-specific room for personal messages
    socket.on('join_user_room', (userId) => {
      socket.join(userId);
      console.log(`User ${socket.id} joined user room ${userId}`);
    });

    // Handle leaving a room
    socket.on('leave_room', (roomId) => {
      socket.leave(roomId);
      console.log(`User ${socket.id} left room ${roomId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io not initialized!');
  }
  return io;
};

export { initSocket, getIO };
