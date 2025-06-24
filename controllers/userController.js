import User from '../models/User.js';
import Post from '../models/Post.js';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { fullName, phoneNumber, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ phoneNumber });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    // Create new user
    const user = await User.create({
      fullName,
      phoneNumber,
      password, // Password will be hashed by the pre-save hook in the User model
      Balance: 0,
      followers: [],
      following: []
    });

    // Return user data (excluding password)
    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      Balance: user.Balance
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  console.log('Login request received:', {
    body: req.body,
    headers: req.headers,
    timestamp: new Date().toISOString()
  });
  
  try {
    // Check if body exists and is an object
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      const error = new Error('Invalid request body');
      error.status = 400;
      throw error;
    }

    const { phoneNumber, password } = req.body;
    console.log('Login attempt for phone number:', phoneNumber);

    // Input validation
    if (!phoneNumber || !password) {
      console.log('Missing required fields:', { phoneNumber: !!phoneNumber, password: '***' });
      console.error('Missing required fields:', { phoneNumber: !!phoneNumber, password: !!password });
      return res.status(400).json({ 
        success: false,
        message: 'Please provide both phone number and password',
        received: {
          phoneNumber: !!phoneNumber,
          password: !!password
        }
      });
    }

    // Phone number format validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid 10-digit phone number' 
      });
    }

    // Find user
    console.log('Looking up user in database...');
    const user = await User.findOne({ phoneNumber }).select('+password');
    if (!user) {
      console.log('User not found for phone number:', phoneNumber);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    console.log('User found, checking password...');
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      console.log('Invalid password for user:', phoneNumber);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Generate JWT token
    console.log('Generating JWT token...');
    const token = user.getSignedJwtToken();
    console.log('JWT token generated successfully');
    
    // Log welcome message
    console.log(`User logged in: Welcome ${user.fullName}! (ID: ${user._id})`);
    console.log('Sending success response...');
    
    // Set token in HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    
    // Return user data and token (excluding password)
    res.status(200).json({
      success: true,
      token: token, // Also send token in response for clients that can't use httpOnly cookies
      data: {
        _id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        balance: user.Balance,
        isAdmin: user.isAdmin
      }
    });

  } catch (error) {
    console.error('Login error:', {
      message: error.message,
      stack: error.stack,
      name: error.name,
      status: error.status,
      timestamp: new Date().toISOString()
    });
    
    const statusCode = error.status || 500;
    const response = {
      success: false,
      message: error.message || 'Server error during login',
      ...(process.env.NODE_ENV === 'development' && {
        error: error.message,
        stack: error.stack,
        name: error.name
      })
    };

    res.status(statusCode).json(response);
  }
};

// @desc    Get user profile by ID
// @route   GET /api/users/profile/:userId
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    console.log('Fetching user profile for ID:', req.params.userId);
    console.log('Authenticated user ID:', req.user?._id);
    
    const user = await User.findById(req.params.userId)
      .select('-password -__v -refreshToken')
      .populate('followers following', 'fullName profilePicture')
      .populate('posts', 'title content image likes comments');

    if (!user) {
      console.log('User not found with ID:', req.params.userId);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Found user:', {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber
    });
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get current user profile
// @route   GET /api/users/me
// @access  Private
const getCurrentUserProfile = async (req, res) => {
  try {
    console.log('Fetching current user profile for ID:', req.user?._id);
    
    const user = await User.findById(req.user._id)
      .select('-password -__v -refreshToken')
      .populate('followers following', 'fullName profilePicture')
      .populate('posts', 'title content image likes comments');

    if (!user) {
      console.log('Current user not found with ID:', req.user._id);
      return res.status(404).json({ message: 'User not found' });
    }

    console.log('Found current user:', {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
      phoneNumber: user.phoneNumber
    });
    
    res.json(user);
  } catch (error) {
    console.error('Error getting current user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile/:userId
// @access  Private
const updateUserProfile = async (req, res) => {
  console.log('Update profile request received:', {
    params: req.params,
    body: req.body,
    file: req.file
  });

  try {
    const userId = req.params.userId;
    let updates = { ...req.body };
    
    // List of allowed fields that can be updated
    const allowedUpdates = [
      'fullName', 'email', 'phoneNumber', 'bio', 
      'dateOfBirth', 'gender', 'country', 'profilePicture'
    ];
    
    // Filter only allowed updates
    const updatesToApply = {};
    Object.keys(updates).forEach(key => {
      if (allowedUpdates.includes(key) && updates[key] !== undefined) {
        updatesToApply[key] = updates[key];
      }
    });

    // Handle profile picture upload if exists in the request
    if (req.file) {
      try {
        console.log('Uploading profile picture to Cloudinary...');
        const result = await cloudinary.uploader.upload(req.file.path, {
          folder: "profiles",
          use_filename: true,
          unique_filename: true,
          resource_type: 'auto'
        });
        
        console.log('Cloudinary upload result:', result);
        updatesToApply.profilePicture = result.secure_url;
        
        // If there's an old profile picture, delete it from Cloudinary
        if (updates.oldProfilePicture) {
          try {
            const publicId = updates.oldProfilePicture.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`profiles/${publicId}`);
          } catch (cloudErr) {
            console.error('Error deleting old profile picture:', cloudErr);
            // Don't fail the request if deletion of old image fails
          }
        }
      } catch (uploadError) {
        console.error('Error uploading profile picture:', uploadError);
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to upload profile picture',
          error: uploadError.message 
        });
      }
    }

    // If profile picture is being removed
    if (updates.profilePicture === '') {
      updatesToApply.profilePicture = '';
      // Optionally delete from Cloudinary if needed
    }

    console.log('Applying updates to user:', updatesToApply);
    
    // Find and update the user
    const user = await User.findByIdAndUpdate(
      userId,
      { $set: updatesToApply },
      { new: true, runValidators: true }
    ).select('-password -__v -refreshToken');

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }

    console.log('User profile updated successfully:', user);
    res.json({
      success: true,
      message: 'Profile updated successfully',
      user
    });
  } catch (error) {
    console.error('Error updating user profile:', {
      error: error.message,
      stack: error.stack,
      name: error.name
    });
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors
      });
    }
    
    // Handle duplicate key errors (e.g., duplicate email)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} already in use`,
        field
      });
    }
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Get all users (with pagination)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password -__v -refreshToken')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 });

    const total = await User.countDocuments();

    res.json({
      users,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalUsers: total
    });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Get user posts
// @route   GET /api/users/:userId/posts
// @access  Private
const getUserPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Post.find({ author: req.params.userId })
      .populate('author', 'fullName profilePicture')
      .populate({
        path: 'comments.user',
        select: 'fullName profilePicture'
      })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const total = await Post.countDocuments({ author: req.params.userId });

    res.json({
      posts,
      currentPage: page,
      totalPages: Math.ceil(total / limit),
      totalPosts: total
    });
  } catch (error) {
    console.error('Error getting user posts:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/users/logout
// @access  Private
const logoutUser = (req, res) => {
  res.cookie('jwt', '', {
    httpOnly: true,
    expires: new Date(0)
  });
  res.status(200).json({ message: 'Logged out successfully' });
};

export { 
  registerUser, 
  loginUser, 
  logoutUser,
  getUserProfile,
  getCurrentUserProfile,
  updateUserProfile,
  getUsers,
  getUserPosts
};

// Add error handling for unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  // Recommended: send the information to an error tracking service
});
