const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
require('dotenv').config();
const connectDB = require('./config/db');

const app = express();

// Connect to Database
connectDB();

// Import routes
const userRoutes = require('./routes/userRoutes');

// Middleware
app.use(cors());

// Parse application/json
app.use(bodyParser.json({ limit: '10mb' }));
// Parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
// Parse text/plain as JSON
app.use(bodyParser.text({ type: 'text/plain' }));
app.use((req, res, next) => {
  if (req.is('text/plain') && req.body) {
    try {
      req.body = JSON.parse(req.body);
    } catch (e) {
      return res.status(400).json({
        success: false,
        message: 'Invalid JSON in request body',
        error: e.message
      });
    }
  }
  next();
});

// Log all incoming requests
app.use((req, res, next) => {
  const start = Date.now();
  
  // Override the end method to log the response time
  const originalEnd = res.end;
  res.end = function(chunk, encoding) {
    const duration = Date.now() - start;
    console.log(`${req.method} ${req.originalUrl} - ${res.statusCode} [${duration}ms]`);
    originalEnd.apply(res, [chunk, encoding]);
  };
  
  next();
});

// Routes
app.use('/api/users', userRoutes);

// Basic route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to Ful2Win Backend API' });
});

// Set port
const PORT = process.env.PORT || 5000;

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
