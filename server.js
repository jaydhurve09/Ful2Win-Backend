import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import fileUpload from 'express-fileupload';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import { connectCloudinary } from './config/cloudinary.js';
import postRoutes from './routes/postRoutes.js';
import gameRoutes from './routes/gameRoutes.js';
import carRacingRoute from './routes/carRacingRoute.js';
<<<<<<< HEAD
import walletRoutes from './routes/walletRoutes.js';
import webhookRoutes from './routes/webhookRoutes.js';
=======
import userRoutes from './routes/userRoutes.js';
import authRoutes from './routes/authRoutes.js';

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.error(err.name, err.message);
  process.exit(1);
});
>>>>>>> upstream/main

// Get current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();

// Load environment variables
dotenv.config({ path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env' });

<<<<<<< HEAD
// Verify required environment variables
const requiredEnvVars = [
  'RAZORPAY_KEY_ID',
  'RAZORPAY_KEY_SECRET',
  'RAZORPAY_WEBHOOK_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
if (missingVars.length > 0) {
  console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
  process.exit(1);
}

// Initialize database and cloud services
(async () => {
  try {
    console.log('Initializing database connection...');
    await connectDB();
    console.log('Database connection established');
    
    console.log('Initializing Cloudinary...');
    await connectCloudinary();
    console.log('Cloudinary connected successfully');
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
=======
// Trust proxy for production
app.set('trust proxy', 1);

// Initialize services
let server;

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
>>>>>>> upstream/main
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
    'Access-Control-Allow-Credentials',
    'Accept',
    'Origin'
  ],
  exposedHeaders: [
    'Content-Length',
    'Authorization'
  ],
  maxAge: 86400, // 24 hours
  preflightContinue: false,
  optionsSuccessStatus: 204
};

<<<<<<< HEAD
// Parse JSON for all routes except webhooks (webhooks need raw body for signature verification)
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/webhooks')) {
    next();
  } else {
    express.json({ limit: '50mb' })(req, res, next);
  }
});

// Apply CORS to all routes except webhooks
app.use((req, res, next) => {
  if (req.originalUrl.startsWith('/api/webhooks')) {
    next();
  } else {
    cors(corsOptions)(req, res, next);
  }
});
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
=======
// Simple health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Log CORS configuration
console.log('CORS Allowed Origins:', allowedOrigins);

// Apply CORS to all routes
app.options('*', cors(corsOptions)); // Enable preflight for all routes
app.use(cors(corsOptions));

// Add CORS headers to all responses
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Credentials', true);
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, Cache-Control, Pragma, Expires');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, PATCH');
  next();
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
  type: ['application/x-www-form-urlencoded']
}));

// Raw body parser for text/plain
app.use((req, res, next) => {
  if (req.is('text/*')) {
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

// Request logging middleware (production-friendly)
app.use((req, res, next) => {
  const start = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  req.requestId = requestId;

  // Log only errors
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (res.statusCode >= 400) {
      console.error(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    } else if (process.env.NODE_ENV === 'development') {
      console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl} ${res.statusCode} - ${duration}ms`);
    }
  });

  next();
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
>>>>>>> upstream/main

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/games', gameRoutes);
<<<<<<< HEAD
app.use('/api/wallet', walletRoutes);

// Webhook routes (no body parsing for webhook verification)
app.use('/api/webhooks', webhookRoutes);
=======
app.use('/api/auth', authRoutes);
>>>>>>> upstream/main

// Game routes
app.use('/games/2d-car-racing', carRacingRoute); // This is the URL path

// Alias for the game with the actual directory name
app.use('/games/2d%20Car%20Racing%20Updated', carRacingRoute);

// Serve static game files
app.use('/games', express.static(path.join(__dirname, 'games')));

// File upload configuration
app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: path.join(__dirname, 'tmp'),
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
}));

// Enhanced request logging middleware
app.use((req, res, next) => {
  // Skip logging for static files and health checks
  if (req.path === '/health' || req.path.startsWith('/games/')) {
    return next();
  }

  const startTime = Date.now();
  const requestId = Math.random().toString(36).substring(2, 8);
  
  // Log request details
  console.log('\n' + '='.repeat(80));
  console.log(`[${new Date().toISOString()}] [${requestId}] ${req.method} ${req.originalUrl}`);
  console.log('-' * 80);
  
  // Log request headers (redact sensitive info)
  const headers = { ...req.headers };
  ['authorization', 'cookie', 'x-access-token'].forEach(header => {
    if (headers[header]) headers[header] = '***REDACTED***';
  });
  console.log('Headers:', JSON.stringify(headers, null, 2));
  
  // Log query parameters
  if (Object.keys(req.query).length > 0) {
    console.log('Query:', JSON.stringify(req.query, null, 2));
  }
  
  // Log request body for non-GET requests
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
    if (req.body && Object.keys(req.body).length > 0) {
      console.log('Body:', JSON.stringify(req.body, null, 2));
    }
    
    if (req.files && Object.keys(req.files).length > 0) {
      console.log('Files:', Object.keys(req.files).join(', '));
    }
  }
  
  // Store original response methods
  const originalJson = res.json;
  const originalSend = res.send;
  
  // Override response methods to log the response
  res.json = function(body) {
    const responseTime = Date.now() - startTime;
    console.log('\n' + '-'.repeat(80));
    console.log(`[${new Date().toISOString()}] [${requestId}] Response (${responseTime}ms)`);
    console.log('Status:', res.statusCode);
    
    // Log response body (truncate if too large)
    const responseStr = JSON.stringify(body, null, 2);
    if (responseStr.length > 1000) {
      console.log('Response:', responseStr.substring(0, 1000) + '... [TRUNCATED]');
    } else {
      console.log('Response:', responseStr);
    }
    
    console.log('='.repeat(80) + '\n');
    return originalJson.call(this, body);
  };
  
  res.send = function(body) {
    const responseTime = Date.now() - startTime;
    console.log('\n' + '-'.repeat(80));
    console.log(`[${new Date().toISOString()}] [${requestId}] Response (${responseTime}ms)`);
    console.log('Status:', res.statusCode);
    
    // Log response body (truncate if too large)
    const responseStr = typeof body === 'string' ? body : JSON.stringify(body, null, 2);
    if (responseStr && responseStr.length > 1000) {
      console.log('Response:', responseStr.substring(0, 1000) + '... [TRUNCATED]');
    } else {
      console.log('Response:', responseStr);
    }
    
    console.log('='.repeat(80) + '\n');
    return originalSend.call(this, body);
  };
  
  // Log unhandled errors
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      console.error(`[${new Date().toISOString()}] [${requestId}] Error: ${res.statusCode} - ${res.statusMessage}`);
    }
  });
  
  next();
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date().toISOString() });
});

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

//Serve static game files
app.use('/games', express.static(path.join(__dirname, 'games')));

// Simple request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

// Basic route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Welcome to Ful2Win Backend API',
    status: 'running',
    timestamp: new Date().toISOString()
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
  try {
    console.log('Initializing database connection...');
    await connectDB();
    console.log('Database connection established');
    
    console.log('Initializing Cloudinary...');
    await connectCloudinary();
    
    // Start the server
    const port = process.env.PORT || 10000;
    const server = app.listen(port, () => {
      console.log(`Server running on port ${port} in ${process.env.NODE_ENV} mode`);
      console.log(`API URL: http://localhost:${port}`);
    });
    
    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error('UNHANDLED REJECTION! 💥 Shutting down...');
      console.error(err.name, err.message);
      server.close(() => {
        process.exit(1);
      });
    });
    
    // Handle SIGTERM for graceful shutdown
    process.on('SIGTERM', () => {
      console.log('👋 SIGTERM RECEIVED. Shutting down gracefully');
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
          console.error(`Port ${port} requires elevated privileges`);
          process.exit(1);
        case 'EADDRINUSE':
          console.error(`Port ${port} is already in use`);
          process.exit(1);
        default:
          throw error;
      }
    });
    
  } catch (error) {
    console.error('Failed to initialize services:', error);
    process.exit(1);
  }
};

// Start the server
startServer();
