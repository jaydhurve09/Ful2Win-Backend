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
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
    // Get token from header
    token = req.headers.authorization.split(' ')[1];

    try {
      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      // Get user from the token
      const user = await User.findById(decoded.id).select('-password -refreshToken');

      if (!user) {
        return res.status(401).json({ 
          success: false,
          error: 'User not found' 
        });
      }

      req.user = user;
      next();
    } catch (error) {
      // Log error for server-side debugging
      console.error('Auth Error:', error.name, error.message);
      
      return res.status(401).json({ 
        success: false,
        error: 'Not authorized, token failed',
        message: error.message,
        expired: error.name === 'TokenExpiredError'
      });
    }
  } else {
    return res.status(401).json({ 
      success: false, 
      error: 'Not authorized, no token' 
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
