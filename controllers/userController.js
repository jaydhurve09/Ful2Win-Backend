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
    console.log('=== Register User Request ===');
    console.log('Request body:', req.body);
    
    const { fullName, phoneNumber, password } = req.body;

    if (!fullName || !phoneNumber || !password) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields',
        required: ['fullName', 'phoneNumber', 'password']
      });
    }

    // Check if user already exists
    console.log('Checking if user exists with phone:', phoneNumber);
    const userExists = await User.findOne({ phoneNumber });
    if (userExists) {
      console.log('User already exists with phone:', phoneNumber);
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this phone number' 
      });
    }

    console.log('Creating new user...');
    // Create new user
    const user = await User.create({
      fullName,
      phoneNumber,
      password, // Password will be hashed by the pre-save hook in the User model
      Balance: 0,
      followers: [],
      following: []
    });

    console.log('User created successfully:', {
      _id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber
    });

    // Verify the user was saved to the database
    const savedUser = await User.findById(user._id);
    console.log('User retrieved from database:', savedUser ? 'Found' : 'Not found');

    // Return user data (excluding password)
    res.status(201).json({
      success: true,
      _id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      Balance: user.Balance
    });
  } catch (error) {
    console.error('Error registering user:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({ 
      success: false, 
      message: 'Server error', 
      error: error.message 
    });
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    console.log('\n=== Login Request ===');
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl}`);
    
    // Log request headers and body for debugging
    console.log('Headers:', req.headers);
    console.log('Raw body:', req.body);
    
    let requestBody = req.body;
    
    // If body is a string, try to parse it as JSON
    if (typeof req.body === 'string' || req.body === undefined) {
      try {
        requestBody = JSON.parse(req.body || '{}');
      } catch (error) {
        console.error('Error parsing JSON body:', error);
        return res.status(400).json({
          success: false,
          message: 'Invalid JSON in request body'
        });
      }
    }
    
    const { phoneNumber, password } = requestBody;
    
    // Input validation
    if (!phoneNumber || !password) {
      console.log('Missing required fields:', { 
        phoneNumber: !!phoneNumber, 
        password: '***' 
      });
      
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
        message: 'Please enter a valid 10-digit phone number'
      });
    }

    // Find user
    console.log('Looking up user in database with phone number:', phoneNumber);
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
    const token = user.getSignedJwtToken();

    // Set JWT token in HTTP-only cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });

    // Remove password from output
    user.password = undefined;

    res.status(200).json({
      success: true,
      token,
      data: user
    });
    
  } catch (error) {
    console.error('Login error:', error);
    
    const statusCode = error.statusCode || 500;
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
    file: req.file,
    files: req.files,
    headers: req.headers
  });

  try {
    const userId = req.params.userId;
    
    // Check if user exists and is authorized
    const currentUser = await User.findById(userId).select('-password -__v -refreshToken');
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize updates object
    const updates = { ...req.body };
    
    // List of allowed fields that can be updated
    const allowedUpdates = [
      'fullName', 'email', 'phoneNumber', 'bio', 
      'dateOfBirth', 'gender', 'country', 'profilePicture'
    ];
    
    // Initialize updates object
    const updatesToApply = {};
    
    // Add all allowed fields from req.body to updatesToApply
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        updatesToApply[field] = updates[field];
      }
    });
    
    console.log('Processing updates:', updatesToApply);
    
    // Handle empty profilePicture object
    if (updates.profilePicture && 
        typeof updates.profilePicture === 'object' && 
        Object.keys(updates.profilePicture).length === 0) {
      console.log('Empty profilePicture object received, removing it from updates');
      delete updates.profilePicture;
    }
    
    // Handle profile picture upload if a new file is provided
    if (req.file) {
      try {
        console.log('Processing new profile picture upload...');
        
        // Validate file
        if (!req.file.buffer) {
          throw new Error('File buffer is empty. The file might be corrupted or too large.');
        }

        const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (!allowedMimeTypes.includes(req.file.mimetype)) {
          throw new Error(`Unsupported file type: ${req.file.mimetype}. Please upload an image file (JPEG, PNG, GIF, or WebP).`);
        }
        
        // Convert buffer to base64 for Cloudinary
        const base64Data = req.file.buffer.toString('base64');
        const dataUri = `data:${req.file.mimetype};base64,${base64Data}`;
        
        console.log('Uploading to Cloudinary...');
        
        // Upload to Cloudinary using base64
        const result = await cloudinary.uploader.upload(dataUri, {
          folder: "profiles",
          use_filename: true,
          unique_filename: true,
          resource_type: 'auto',
          transformation: [
            { width: 500, height: 500, gravity: 'face', crop: 'thumb' },
            { quality: 'auto:good' }
          ]
        });
        
        if (!result?.secure_url) {
          throw new Error('Failed to upload image to Cloudinary: No URL returned');
        }
        
        console.log('Cloudinary upload successful:', {
          url: result.secure_url,
          public_id: result.public_id,
          format: result.format,
          bytes: result.bytes
        });
        
        // Set the new profile picture URL
        updatesToApply.profilePicture = result.secure_url;
        
        // Delete the old profile picture from Cloudinary if it exists
        if (currentUser.profilePicture?.includes('cloudinary')) {
          try {
            const publicId = currentUser.profilePicture.split('/').pop().split('.')[0];
            await cloudinary.uploader.destroy(`profiles/${publicId}`);
            console.log('Old profile picture deleted from Cloudinary');
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
    } else if (updates.profilePicture === '') {
      // If profile picture is being removed
      updatesToApply.profilePicture = '';
      
      // Delete old profile picture from Cloudinary if it exists
      if (currentUser.profilePicture && currentUser.profilePicture.includes('cloudinary')) {
        try {
          const publicId = currentUser.profilePicture.split('/').pop().split('.')[0];
          await cloudinary.uploader.destroy(`profiles/${publicId}`);
          console.log('Profile picture removed from Cloudinary');
        } catch (cloudErr) {
          console.error('Error removing profile picture:', cloudErr);
          // Continue even if deletion fails
        }
      }
    }

    console.log('Applying updates to user:', updatesToApply);
    
    // If no updates to apply, return current user
    if (Object.keys(updatesToApply).length === 0) {
      return res.json({
        success: true,
        message: 'No changes detected',
        user: currentUser
      });
    }
    
    // Find and update the user
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatesToApply },
      { new: true, runValidators: true }
    ).select('-password -__v -refreshToken');

    if (!updatedUser) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found or update failed' 
      });
    }

    console.log('User profile updated successfully:', updatedUser);
    
    // Prepare response
    const response = {
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser.toObject()
    };
    
    // If profile picture was updated, include the new URL
    if (updatesToApply.profilePicture !== undefined) {
      response.profilePicture = updatedUser.profilePicture;
    }
    
    res.json(response);
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

// @desc    Logout user / clear token
// @route   POST /api/users/logout
// @access  Private
const logoutUser = async (req, res) => {
  try {
    // Clear any existing cookies
    res.clearCookie('jwt');
    
    // If using token in Authorization header, we can't directly invalidate it
    // But we can send instructions to the client to clear their token
    // In a production app, you might want to implement a token blacklist here
    
    res.status(200).json({ 
      success: true,
      message: 'Logged out successfully' 
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Error during logout',
      error: error.message
    });
  }
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
