import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { connectCloudinary } from './config/Cloudinary.js';
import postRoutes from './routes/postRoute.js';
import gameRoutes from './routes/gameRoutes.js';
import fileUpload from 'express-fileupload';

// Get current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();

// Load environment variables
dotenv.config();

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
  }
})();

// CORS configuration
const corsOptions = {
  origin: 'http://localhost:5173',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Basic middleware
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/posts', postRoutes);
app.use('/api/games', gameRoutes);

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

// Global error handler for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Consider whether to exit the process here
  // process.exit(1);
});

// Global error handler for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  // Consider whether to exit the process here
  // process.exit(1);
});

// Set port - default to 5001 to avoid conflicts with other services
const PORT = 5001; // Hardcoded to 5001 to avoid any environment variable issues

// Start server
const server = app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API URL: http://localhost:${PORT}`);
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
      break;
    case 'EADDRINUSE':
      console.error(`Port ${PORT} is already in use`);
      process.exit(1);
      break;
    default:
      throw error;
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully');
  server.close(() => {
    console.log('Process terminated');
    process.exit(0);
  });
});
