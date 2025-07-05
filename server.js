import dotenv from 'dotenv';
dotenv.config();
import schedule from 'node-schedule';
import express from 'express';
import cors from 'cors';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { initSocket } from './config/socket.js';
import connectDB from './config/db.js';
import { connectCloudinary } from './config/cloudinary.js';

// --- Security middleware suggestions (uncomment to enable in production) ---
// import helmet from 'helmet';
// import rateLimit from 'express-rate-limit';

// --- Uncomment the following lines for enhanced security ---
// app.use(helmet());
// app.use(rateLimit({
//   windowMs: 15 * 60 * 1000, // 15 minutes
//   max: 100, // limit each IP to 100 requests per windowMs
//   standardHeaders: true,
//   legacyHeaders: false,
// }));

// Routes
import messageRoutes from './routes/messageRoutes.js';
import postRoutes from './routes/postRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import tournamentRoutes from './routes/tournamentRoutes.js';
import carRacingRoute from './routes/carRacingRoute.js';
import walletRoutes from './routes/walletRoutes.js';
import referralRoutes from './routes/referralRoutes.js';
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';
import Scorerouter from './routes/ScoreRoute.js';
import notificationRoutes from './routes/notificationRoutes.js';
import followRoutes from './routes/followRoutes.js';

dotenv.config();

process.on('uncaughtException', (err) => {
  console.error(`❌ Uncaught Exception: ${err.name} ${err.message}`);
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Log all request headers for debugging
// NOTE: This logs every request header. Remove or comment out in production for performance and security.
app.use((req, res, next) => {
  console.log(`➡️  [${req.method}] ${req.protocol}://${req.get('host')}${req.originalUrl}`);
  console.log('🔎 All Headers:', JSON.stringify(req.headers, null, 2));
  next();
});
const server = createServer(app);
const io = initSocket(server);

app.set('io', io);
app.set('trust proxy', 1);

// ================================
// ✅ CORS CONFIGURATION
// ================================
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://ful2win.vercel.app',
  'https://ful-2-win.vercel.app',
  'https://fulboost.fun',
  'https://fulboost.fun/login',
  'https://www.fulboost.fun'
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(process.env.FRONTEND_URL.replace(/\/$/, ''));
}
if (process.env.LOCAL) {
  allowedOrigins.push(process.env.LOCAL.replace(/\/$/, ''));
}

console.log('✅ Allowed CORS Origins:', allowedOrigins);

// Log environment variables relevant to CORS and deployment
console.log('🛠️ NODE_ENV:', process.env.NODE_ENV);
console.log('🛠️ FRONTEND_URL:', process.env.FRONTEND_URL);
console.log('🛠️ LOCAL:', process.env.LOCAL);
console.log('🛠️ PORT:', process.env.PORT);

const corsOptions = {
  allowedHeaders: [
    'Accept',
    'Authorization',
    'Cache-Control',
    'Content-Type',
    'DNT',
    'Expires',
    'Origin',
    'Pragma',
    'Referer',
    'User-Agent',
    'X-Razorpay-Signature',
    'X-Requested-With',
    'expires',
    'login',
    'blocked'
  ],

  // Dynamically allow only the origins in allowedOrigins
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow requests with no origin (e.g., mobile apps, curl)
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error('Not allowed by CORS'), false);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH']
};

// Log every incoming request for debugging
app.use((req, res, next) => {
  const protocol = req.protocol;
  const host = req.get('host');
  const fullUrl = `${protocol}://${host}${req.originalUrl}`;
  console.log(`➡️  [${req.method}] ${fullUrl} - Origin: ${req.headers.origin}`);
  if (req.originalUrl.startsWith('/api/webhooks')) return next();
  return cors(corsOptions)(req, res, next);
});
app.options('*', cors(corsOptions));

// ================================
// ✅ MIDDLEWARES
// ================================
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'tmp'),
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 },
  safeFileNames: true,
  preserveExtension: 4
}));

// ================================
// ✅ API ROUTES
// ================================
app.use('/api/posts', postRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/car-racing', carRacingRoute);
app.use('/api/wallet', walletRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/score', Scorerouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/messages', messageRoutes);

// ================================
// ✅ STATIC FILES
// ================================
app.use('/games', express.static(path.join(__dirname, 'games'), {
  setHeaders: res => res.set('Cache-Control', 'public, max-age=31536000')
}));

// ================================
// ✅ HEALTH + ROOT
// ================================
app.get('/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));
app.get('/', (req, res) => res.json({
  message: 'Welcome to Ful2Win Backend API',
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString()
}));

// ================================
// ✅ ERROR HANDLING
// ================================
app.use((req, res) => res.status(404).json({
  success: false,
  message: 'Route not found',
  path: req.originalUrl
}));
app.use((err, req, res, next) => {
  console.error('🔥 Global error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// ================================
// ✅ START SERVER
// ================================
const startServer = async () => {
  try {
    console.log('🔵 Connecting to MongoDB...');
    await connectDB();
    console.log('✅ MongoDB connected');

    console.log('🔵 Connecting to Cloudinary...');
    await connectCloudinary();
    console.log('✅ Cloudinary connected');

    const PORT = process.env.PORT || 5000;
    server.listen(PORT, '0.0.0.0', () => {
      console.log('========================================');
      console.log(`🚀 Server running on port ${PORT} in ${process.env.NODE_ENV || 'production'} mode`);
      console.log('🌍 API Base URL:', `https://api.fulboost.fun`);
      console.log('✅ Allowed CORS Origins:', allowedOrigins);
      console.log('========================================');
    });

    process.on('unhandledRejection', (err) => {
      console.error('❌ Unhandled Rejection:', err);
      server.close(() => process.exit(1));
    });

    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM received. Shutting down.');
      server.close(() => process.exit(0));
    });

  } catch (err) {
    console.error('❌ Startup error:', err);
    process.exit(1);
  }
};

if (import.meta.url === `file://${process.argv[1]}`) startServer();

export { app, startServer };
export default { app, startServer };
