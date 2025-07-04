import dotenv from 'dotenv';
import schedule from 'node-schedule';
import express from 'express';
import cors from 'cors';
import messageRoutes from './routes/messageRoutes.js';
import path from 'path';
import { fileURLToPath } from 'url';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import { createServer } from 'http';
import { initSocket } from './config/socket.js';
import connectDB from './config/db.js';
import { connectCloudinary } from './config/cloudinary.js';
import { isConfigured } from './config/cloudinary.js';
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
  console.error(`UNCAUGHT EXCEPTION! 💥 Shutting down... ${err.name} ${err.message}`);
  process.exit(1);
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();

// Create HTTP server
const server = createServer(app);

// Initialize Socket.IO
const io = initSocket(server);

// Make io accessible in routes
app.set('io', io);

// Load environment variables
try {
  if (process.env.NODE_ENV !== 'production') {
    const envPath = '.env';

    const result = dotenv.config({ path: envPath });
    if (result.error) {
      console.warn(`[Server] Warning: Could not load .env file. Using process.env only.`);
    } else {
      console.log(`[Server] Successfully loaded environment from ${envPath}`);
    }
  } else {
    console.log(`[Server] Production mode - Using environment variables from process.env`);
  }

  console.log(`[Server] Current working directory: ${process.cwd()}`);

  // Verify required environment variables
  const requiredEnvVars = [
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'MONGODB_URI',
    'JWT_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
  }
  
  // Log the Cloudinary config (masking sensitive values)
  // if (process.env.CLOUDINARY_CLOUD_NAME) {
  //   console.log('[Server] Cloudinary Config:', {
  //     CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
  //     CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? '***' + process.env.CLOUDINARY_API_KEY.slice(-4) : 'Not set',
  //     CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? '***' + process.env.CLOUDINARY_API_SECRET.slice(-4) : 'Not set'
  //   });
  // } else {
  //   console.warn('[Server] Cloudinary environment variables not found');
  // }
} catch (error) {
  console.error(`[Server] Error during initialization: ${error.message}`);
  process.exit(1);
}

// Trust proxy for production
app.set('trust proxy', 1);

// Add your frontend URL to the allowed origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://localhost:5173',
  'https://ful2win.vercel.app',
  'https://ful-2-win.vercel.app',
  'https://www.ful2win.com',
  'https://api.ful2win.com'
].filter(Boolean);

// Add FRONTEND_URL if it exists
if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL.replace(/\/$/, '');
  if (!allowedOrigins.includes(frontendUrl)) {
    allowedOrigins.push(frontendUrl);
  }
}

// Add LOCAL if it exists
if (process.env.LOCAL) {
  const localUrl = process.env.LOCAL.replace(/\/$/, '');
  if (!allowedOrigins.includes(localUrl)) {
    allowedOrigins.push(localUrl);
  }
}

// CORS configuration
const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps, curl requests, or server-side requests)
    if (!origin) return callback(null, true);
    
    // Normalize the origin by removing trailing slash for consistent comparison
    const normalizedOrigin = origin.endsWith('/') ? origin.slice(0, -1) : origin;
    
    // Check if the normalized origin is in the allowed origins
    const isAllowed = allowedOrigins.some(allowedOrigin => {
      const normalizedAllowed = allowedOrigin.endsWith('/') ? allowedOrigin.slice(0, -1) : allowedOrigin;
      return normalizedOrigin === normalizedAllowed;
    });
    
    if (!isAllowed) {
      return callback(new Error('Not allowed by CORS'), false);
    }
    
    return callback(null, true);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Cache-Control',
    'Pragma',
    'Expires',
    'Access-Control-Allow-Headers',
    'Access-Control-Allow-Credentials'
  ],
  exposedHeaders: [
    'Content-Length',
    'Authorization'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

// Apply CORS to all routes except webhooks
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/webhooks')) {
    next();
  } else {
    cors(corsOptions)(req, res, next);
  }
});

// Enable preflight for all routes
app.options('*', cors(corsOptions));

// Body parsing middleware - must come before any route that needs to read the body
app.use(express.json({ 
  limit: '50mb',
  strict: false, // Allow any JSON value
  type: ['application/json', 'application/*+json', 'text/plain'] // Handle various content types
}));

app.use(express.urlencoded({ 
  extended: true, 
  limit: '50mb',
  type: ['application/x-www-form-urlencoded'],
  parameterLimit: 10000 // Increase parameter limit for large forms
}));

// Raw body parser for text/plain and other content types
app.use((req, res, next) => {
  if (req.is('text/*') || req.is('application/xml') || req.is('application/xml-dtd')) {
    let data = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => {
      try {
        req.body = data ? JSON.parse(data) : {};
        next();
      } catch (e) {
        req.body = data;
        next();
      }
    });
  } else {
    next();
  }
});

// Error handling for JSON parsing
app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return res.status(400).json({
      success: false,
      message: 'Invalid JSON in request body',
      error: process.env.NODE_ENV === 'development' ? err.message : 'Bad request'
    });
  }
  next(err);
});

// Request logging middleware
const requestLogger = (req, res, next) => {
  // Skip logging for static files and health checks
  if (req.path === '/health' || req.path.startsWith('/games/')) {
    return next();
  }

  const startTime = Date.now();
  const requestId = req.requestId || Math.random().toString(36).substring(2, 8);
  req.requestId = requestId;
  
  // Log request details
  console.log('\n' + '='.repeat(80));
  console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl}`);
  
  // Log request headers (redact sensitive info)
  const headers = { ...req.headers };
  ['authorization', 'cookie', 'x-access-token'].forEach(header => {
    if (headers[header]) headers[header] = '***REDACTED***';
  });
  
  // console.log('Headers:', JSON.stringify(headers, null, 2));
  
  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    console.log('Query:', JSON.stringify(req.query, null, 2));
  }
  
  // Log request body for non-GET requests
  // if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
  //   if (req.body && Object.keys(req.body).length > 0) {
  //     console.log('Body:', JSON.stringify(req.body, null, 2));
  //   }
    
  //   if (req.files && Object.keys(req.files).length > 0) {
  //     console.log('Files:', Object.keys(req.files).join(', '));
  //   }
  // }
  
  // Store original response methods
  const originalJson = res.json;
  const originalSend = res.send;
  
  // Override response methods to log the response
  res.json = function(body) {
    const responseTime = Date.now() - startTime;
    // console.log('\n' + '-'.repeat(40));
    // console.log(`[${new Date().toISOString()}] [${requestId}] Response (${responseTime}ms)`);
    // console.log('Status:', res.statusCode);
    
    // Log response body (truncate if too large)
    // const responseStr = JSON.stringify(body, null, 2);
    // if (responseStr.length > 1000) {
    //   console.log('Response:', responseStr.substring(0, 1000) + '... [TRUNCATED]');
    // } else {
    //   console.log('Response:', responseStr);
    // }
    
    // console.log('='.repeat(80) + '\n');
    return originalJson.call(this, body);
  };
  
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    // console.log('\n' + '-'.repeat(40));
    // console.log(`[${new Date().toISOString()}] [${requestId}] Response (${responseTime}ms)`);
    // console.log('Status:', res.statusCode);
    
    // Log response body (truncate if too large)
    // const responseStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    // if (responseStr && responseStr.length > 1000) {
    //   console.log('Response:', responseStr.substring(0, 1000) + '... [TRUNCATED]');
    // } else if (responseStr) {
    //   console.log('Response:', responseStr);
    // }
    
    // console.log('='.repeat(80) + '\n');
    return originalSend.call(this, body);
  };
  
  next();
};

// Apply the request logger middleware
app.use(requestLogger);

// File upload configuration - must come before routes that handle file uploads
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'tmp'),
  createParentPath: true,
  limits: { 
    fileSize: 50 * 1024 * 1024, // 50MB max file size
    files: 5, // Maximum number of files
    abortOnLimit: true // Return 413 if file is too large
  },
  safeFileNames: true, // Strip special characters from file names
  preserveExtension: 4 // Preserve file extension (up to 4 chars)
}));

// API Routes - organized by functionality
app.use('/api/posts', postRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/tournaments', tournamentRoutes);
app.use('/api/car-racing', carRacingRoute);
app.use('/api/wallet', walletRoutes);
app.use('/api/referrals', referralRoutes);
// app.use('/api/webhooks', webhookRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/score', Scorerouter);
app.use('/api/notifications', notificationRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/messages', messageRoutes);

// Game routes - static files and game-specific endpoints
app.use('/games', express.static(path.join(__dirname, 'games'), {
  setHeaders: (res) => {
    res.set('Cache-Control', 'public, max-age=31536000'); // 1 year cache for static assets
  }
}));

// Game route aliases
app.use('/games/2d-car-racing', carRacingRoute);
app.use('/games/2d%20Car%20Racing%20Updated', carRacingRoute);

// Test endpoint for debugging
app.get('/api/test', (req, res) => {
  console.log('Test endpoint hit!');
  res.status(200).json({ 
    status: 'success', 
    message: 'Test endpoint is working!',
    timestamp: new Date().toISOString() 
  });
});

// API Routes - This comes AFTER fileUpload middleware
app.use('/api/posts', postRoutes);
app.use('/api/games', gameRoutes);
app.use('/api/users', userRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/wallet', walletRoutes);
app.use('/api/referrals', referralRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/follow', followRoutes);

// Serve static game files
app.use('/games', express.static(path.join(__dirname, 'games')));

// Health check endpoint (moved up before other routes)
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString() 
  });
});

// Single root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Ful2Win Backend API',
    status: 'running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    path: req.originalUrl
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    success: false,
    message: 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { error: err.message })
  });
});

// Start the server
const startServer = async () => {
  console.log('🔵 [startServer] Starting server initialization...');
  try {
    // Initialize database
    console.log('🔵 [startServer] Connecting to MongoDB...');
    try {
      await connectDB();
      console.log('✅ MongoDB connected successfully');
    } catch (dbErr) {
      console.error('❌ [startServer] MongoDB connection failed:', dbErr);
      process.exit(1);
    }

    // Initialize Cloudinary (non-blocking)
    console.log('🔵 [startServer] Initializing Cloudinary...');
    try {
      await connectCloudinary();
      console.log('✅ Cloudinary connected successfully');
    } catch (error) {
      console.warn('⚠️ [startServer] Cloudinary initialization warning:', error.message);
      console.log('⚠️ Server will start without Cloudinary. Some features may not work.');
    }

    // Start the server using the existing server instance
    console.log('🟢 [startServer] About to start server...');
    const PORT = process.env.PORT || 5000;
    console.log(`🔵 [startServer] Using port: ${PORT}`);

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`✅ Server running in ${process.env.NODE_ENV || 'development'} mode on port ${PORT}`);
      console.log('✅ Socket.IO server is running');
      console.log(`🌐 API: http://localhost:${PORT}/api`);
      console.log(`📝 API Documentation: http://localhost:${PORT}/api-docs`);
      console.log('\nPress CTRL+C to stop the server\n');
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('\n❌ UNHANDLED REJECTION! Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });

    // Handle SIGTERM for graceful shutdown
    process.on('SIGTERM', () => {
      console.log('\n👋 SIGTERM RECEIVED. Shutting down gracefully');
      server.close(() => {
        console.log('💥 Process terminated!');
        process.exit(0);
      });
    });

    // Handle server errors
    server.on('error', (error) => {
      if (error.syscall !== 'listen') {
        throw error;
      }
      // Handle specific listen errors with friendly messages
      switch (error.code) {
        case 'EACCES':
          console.error(`Port ${PORT} requires elevated privileges`);
          process.exit(1);
        case 'EADDRINUSE':
          console.error(`Port ${PORT} is already in use`);
          process.exit(1);
        default:
          throw error;
      }
    });
  } catch (error) {
    console.error('🔴 [startServer] Failed to initialize services:', error);
    process.exit(1);
  }
};

// Export the app and startServer function
export { app, startServer };


export default { app, startServer };
// startServer();

// module.exports = { app, startServer };

// if (import.meta.url === `${process.argv[1]}`) {
//   startServer();
// }
//export default { app, startServer };
if (import.meta.url === `file://${process.argv[1]}`) {
  startServer();
}

