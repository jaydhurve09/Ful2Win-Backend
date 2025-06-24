import jwt from 'jsonwebtoken';
import User from '../models/User.js';

// Test endpoint to verify token
const testToken = (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    return res.status(200).json({
      success: true,
      message: 'Token is valid',
      user: {
        id: decoded.id,
        phoneNumber: decoded.phoneNumber,
        iat: new Date(decoded.iat * 1000).toISOString(),
        exp: new Date(decoded.exp * 1000).toISOString()
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token',
      error: error.message
    });
  }
};

/**
 * Middleware to protect routes - verifies JWT token
 */
const protect = async (req, res, next) => {
  console.log('\n=== New Request ===');
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
  
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];
    
    console.log('🔑 Token received (first 15 chars):', token ? `${token.substring(0, 15)}...` : 'No token');
    console.log('Request Headers:', {
      'content-type': req.headers['content-type'],
      'user-agent': req.headers['user-agent'],
      'authorization': 'Bearer [TOKEN]',
      'x-requested-with': req.headers['x-requested-with']
    });

    try {
      // Verify token
      console.log('🔍 Verifying token...');
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      
      console.log('✅ Token verified successfully. Decoded:', {
        userId: decoded.userId || decoded.id,
        iat: new Date(decoded.iat * 1000).toISOString(),
        exp: new Date(decoded.exp * 1000).toISOString(),
        currentTime: new Date().toISOString()
      });

      // Get user from the token
      const user = await User.findById(decoded.id).select('-password -refreshToken');

      if (!user) {
        console.error('User not found for ID:', decoded.id);
        return res.status(401).json({ error: 'User not found' });
      }

      console.log('User authenticated:', {
        userId: user._id,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName
      });

      req.user = user;
      next();
    } catch (error) {
      console.error('Token verification failed:', {
        name: error.name,
        message: error.message,
        expiredAt: error.expiredAt || 'N/A',
        date: new Date().toISOString(),
        stack: error.stack
      });
      
      return res.status(401).json({ 
        success: false,
        error: 'Not authorized, token failed',
        message: error.message,
        expired: error.name === 'TokenExpiredError',
        timestamp: new Date().toISOString()
      });
    }
  } else {
    console.error('No token provided in Authorization header');
    return res.status(401).json({ 
      success: false, 
      error: 'Not authorized, no token',
      headers: Object.keys(req.headers)
    });
  }
};

/**
 * Middleware to restrict routes to admin users only
 */
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    res.status(403).json({ error: 'Not authorized as an admin' });
  }
};

/**
 * Middleware to verify if the user is the owner of the resource
 */
const ownerOrAdmin = (req, res, next) => {
  if (req.user && (req.user._id.toString() === req.params.userId || req.user.isAdmin)) {
    next();
  } else {
    res.status(403).json({ error: 'Not authorized to access this resource' });
  }
};

export { protect, admin, ownerOrAdmin, testToken };
