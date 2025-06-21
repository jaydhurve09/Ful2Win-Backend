import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory name in ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize express app
const app = express();

// Load environment variables
dotenv.config();

// Import configurations and routes
import connectDB from './config/db.js';
import { connectCloudinary } from './config/Cloudinary.js';
import postRoutes from './routes/postRoute.js';
import gameRoutes from './routes/gameRoutes.js';
import fileUpload from 'express-fileupload';

// Initialize database and cloud services
connectDB();
connectCloudinary();

// Basic middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// API Routes
app.use('/api/posts', postRoutes);
app.use('/api/games', gameRoutes);

// Serve static game files
app.use('/games', express.static(path.join(__dirname, 'games')));

// Simple request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.originalUrl}`);
  next();
});

app.use(fileUpload({
  useTempFiles: true,
  tempFileDir: '/tmp/',
  createParentPath: true,
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB max file size
}));

// Debug: Log body and files after fileUpload middleware
app.use((req, res, next) => {
  console.log('--- DEBUG MIDDLEWARE ---');
  console.log('Method:', req.method, 'URL:', req.originalUrl);
  console.log('Headers:', req.headers);
  console.log('req.body:', req.body);
  console.log('req.files:', req.files);
  console.log('------------------------');
  next();
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

// Set port
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`API URL: http://localhost:${PORT}`);
});
