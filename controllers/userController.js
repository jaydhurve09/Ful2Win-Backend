import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Post from '../models/Post.js';

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

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
    const user = await User.findById(req.user._id)
      .select('-password -__v -refreshToken')
      .populate('followers following', 'fullName profilePicture')
      .populate('posts', 'title content image likes comments');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Clean user data before sending
    const userData = user.toObject();
    
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
  console.log('=== Update Profile Request ===');
  console.log('Params:', req.params);
  console.log('Headers:', req.headers);
  console.log('Request body:', req.body);
  
  // Log file info if present
  if (req.file) {
    console.log('Uploaded file info:', {
      fieldname: req.file.fieldname,
      originalname: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      buffer: req.file.buffer ? `Buffer(${req.file.buffer.length} bytes)` : 'No buffer',
      encoding: req.file.encoding
    });
  } else {
    console.log('No file was uploaded with this request');
  }
  
  // Debug: Log environment info
  console.log('Environment:', {
    NODE_ENV: process.env.NODE_ENV,
    cwd: process.cwd(),
    __dirname,
    time: new Date().toISOString()
  });
  
  // Debug: Log Cloudinary config (without exposing secrets)
  const cloudinaryConfig = {
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'not configured',
    api_key: process.env.CLOUDINARY_API_KEY ? 'configured' : 'not configured',
    api_secret: process.env.CLOUDINARY_API_SECRET ? 'configured' : 'not configured'
  };
  console.log('Cloudinary config status:', cloudinaryConfig);

  try {
    const userId = req.params.userId;
    
    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid user ID format:', userId);
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }
    
    // Check if user exists and is authorized
    const currentUser = await User.findById(userId).select('-password -__v -refreshToken');
    if (!currentUser) {
      console.error('User not found with ID:', userId);
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if the current user is authorized to update this profile
    if (currentUser._id.toString() !== req.user.id && req.user.role !== 'admin') {
      console.warn(`Unauthorized access attempt: User ${req.user.id} tried to update profile of user ${userId}`);
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this profile',
        code: 'UNAUTHORIZED_ACCESS'
      });
    }

    // Initialize updates object
    const updates = { ...req.body };
    
    // List of allowed fields that can be updated
    const allowedUpdates = [
      'fullName', 'email', 'phoneNumber', 'bio', 
      'dateOfBirth', 'gender', 'country', 'profilePicture',
      'username'  // Added username to allowed updates
    ];
    
    // Initialize updates object
    const updatesToApply = {};
    
    // Add all allowed fields from req.body to updatesToApply
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined) {
        // Special handling for username to ensure it's lowercase and trimmed
        if (field === 'username' && updates[field]) {
          updatesToApply[field] = updates[field].toString().toLowerCase().trim();
        } else {
          updatesToApply[field] = updates[field];
        }
      }
    });
    
    console.log('Processing updates:', updatesToApply);
    
    // Validate username format if it's being updated
    if (updatesToApply.username) {
      const usernameRegex = /^[a-z0-9._-]+$/;
      if (!usernameRegex.test(updatesToApply.username)) {
        return res.status(400).json({
          success: false,
          message: 'Username can only contain letters, numbers, dots, underscores, and hyphens'
        });
      }
      
      // Check if username is already taken by another user
      const existingUser = await User.findOne({ 
        username: updatesToApply.username,
        _id: { $ne: userId } // Exclude current user from the check
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
    }
    
    // Handle empty profilePicture object
    if (updates.profilePicture && 
        typeof updates.profilePicture === 'object' && 
        Object.keys(updates.profilePicture).length === 0) {
      console.log('Empty profilePicture object received, removing it from updates');
      delete updates.profilePicture;
    }
    
    // Handle profile picture upload if a new file is provided
    if (req.file) {
      console.log('Processing uploaded file:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        hasBuffer: !!req.file.buffer,
        bufferLength: req.file.buffer ? req.file.buffer.length : 0,
        fieldname: req.file.fieldname,
        encoding: req.file.encoding,
        requestHeaders: {
          'content-type': req.get('content-type'),
          'content-length': req.get('content-length'),
          'x-request-id': req.get('x-request-id')
        }
      });

      // Validate file buffer
      if (!req.file.buffer || !Buffer.isBuffer(req.file.buffer) || req.file.buffer.length === 0) {
        console.error('Invalid or empty file buffer received');
        return res.status(400).json({
          success: false,
          message: 'File upload failed: No file data received.',
          code: 'NO_FILE_DATA',
          details: 'The uploaded file appears to be empty or corrupted.'
        });
      }
      
      // Check if buffer contains valid image data
      const isImage = req.file.mimetype.startsWith('image/');
      if (!isImage) {
        console.error('Uploaded file is not an image:', req.file.mimetype);
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only image files are allowed.',
          code: 'INVALID_FILE_TYPE',
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });
      }
      
      try {
        // File type validation with more specific error messages
        const allowedMimeTypes = {
          'image/jpeg': 'JPEG',
          'image/png': 'PNG',
          'image/gif': 'GIF',
          'image/webp': 'WebP'
        };
        
        if (!(req.file.mimetype in allowedMimeTypes)) {
          const allowedTypes = Object.values(allowedMimeTypes).join(', ');
          console.error('Invalid file type:', {
            mimetype: req.file.mimetype,
            allowed: Object.keys(allowedMimeTypes)
          });
          
          return res.status(400).json({ 
            success: false, 
            message: `Unsupported file type. Please upload an image file (${allowedTypes}).`,
            code: 'INVALID_FILE_TYPE',
            allowedTypes: Object.keys(allowedMimeTypes)
          });
        }
        
        // File size check (5MB limit) with human-readable error
        const maxFileSize = 5 * 1024 * 1024; // 5MB
        if (req.file.size > maxFileSize) {
          const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
          console.error('File size exceeds limit:', {
            size: req.file.size,
            sizeMB: fileSizeMB,
            maxSize: '5MB'
          });
          
          return res.status(400).json({ 
            success: false, 
            message: `File is too large (${fileSizeMB}MB). Maximum allowed size is 5MB.`,
            code: 'FILE_TOO_LARGE',
            maxSize: maxFileSize,
            actualSize: req.file.size
          });
        }
        
        console.log('Preparing to upload file to Cloudinary...');
        
        try {
          // Convert buffer to base64 for Cloudinary
          const base64Data = req.file.buffer.toString('base64');
          const dataUri = `data:${req.file.mimetype};base64,${base64Data}`;
          
          // Log Cloudinary configuration (without sensitive data)
          console.log('Cloudinary config:', {
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'missing',
            folder: 'profiles',
            transformation: '500x500 thumb, auto:good'
          });
          
          // Upload to Cloudinary with detailed error handling
          const uploadStartTime = Date.now();
          const uploadResult = await new Promise((resolve, reject) => {
            const uploadOptions = {
              folder: 'profiles',
              use_filename: true,
              unique_filename: true,
              resource_type: 'auto',
              transformation: [
                { width: 500, height: 500, gravity: 'face', crop: 'thumb' },
                { quality: 'auto:good' }
              ]
            };
            
            console.log('Starting Cloudinary upload with options:', uploadOptions);
            
            cloudinary.uploader.upload(
              dataUri,
              uploadOptions,
              (error, result) => {
                const uploadTime = Date.now() - uploadStartTime;
                if (error) {
                  console.error('Cloudinary upload failed after', uploadTime, 'ms:', {
                    error: error.message,
                    http_code: error.http_code,
                    name: error.name,
                    code: error.code
                  });
                  reject(new Error(`Failed to upload image to Cloudinary: ${error.message}`));
                } else if (!result) {
                  console.error('Cloudinary returned empty result after', uploadTime, 'ms');
                  reject(new Error('Cloudinary upload returned no result'));
                } else if (!result.secure_url) {
                  console.error('Cloudinary response missing secure_url:', result);
                  reject(new Error('Cloudinary response is missing the secure URL'));
                } else {
                  console.log('Cloudinary upload successful in', uploadTime, 'ms', {
                    bytes: result.bytes,
                    format: result.format,
                    width: result.width,
                    height: result.height,
                    url: result.secure_url.substring(0, 60) + '...'
                  });
                  resolve(result);
                }
              }
            );
          });

          // If we get here, upload was successful
          updatesToApply.profilePicture = uploadResult.secure_url;
          
          // If user had a previous profile picture and it's from Cloudinary, delete it
          if (currentUser.profilePicture && currentUser.profilePicture.includes('cloudinary.com')) {
            try {
              const publicId = currentUser.profilePicture.split('/').pop().split('.')[0];
              console.log('Deleting old profile picture with public ID:', publicId);
              
              const deleteResult = await cloudinary.uploader.destroy(`profiles/${publicId}`, {
                invalidate: true
              });
              
              console.log('Old profile picture deletion result:', {
                result: deleteResult.result,
                wasDeleted: deleteResult.result === 'ok',
                publicId: publicId
              });
              
            } catch (deleteError) {
              // Don't fail the request if deletion of old image fails, but log it
              console.error('Error deleting old profile picture (non-critical):', {
                error: deleteError.message,
                profilePicture: currentUser.profilePicture,
                userId: currentUser._id
              });
            }
          }
        } catch (cloudinaryError) {
          throw new Error(`Failed to upload image to Cloudinary: ${cloudinaryError.message}`);
        }
      } catch (error) {
        return res.status(500).json({ 
          success: false, 
          message: 'Failed to process profile picture',
          error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    
    // Find and update the user with detailed error handling
    let updatedUser;
    try {
      updatedUser = await User.findByIdAndUpdate(
        userId,
        { $set: updatesToApply },
        { 
          new: true, 
          runValidators: true,
          context: 'query' // Ensures validators run with the correct context
        }
      ).select('-password -__v -refreshToken -resetPasswordToken -resetPasswordExpire');

      if (!updatedUser) {
        console.error('User not found during update:', userId);
        return res.status(404).json({ 
          success: false, 
          message: 'User not found or update failed',
          code: 'USER_UPDATE_FAILED'
        });
      }
      
      console.log('User profile updated successfully:', {
        userId: updatedUser._id,
        updatedFields: Object.keys(updatesToApply),
        timestamp: new Date().toISOString()
      });
      
    } catch (updateError) {
      console.error('Error updating user in database:', {
        error: updateError.message,
        name: updateError.name,
        code: updateError.code,
        stack: updateError.stack,
        updates: updatesToApply,
        userId: userId
      });
      
      // Handle duplicate key errors (e.g., duplicate email)
      if (updateError.code === 11000) {
        const field = Object.keys(updateError.keyPattern)[0];
        const message = `The ${field} is already in use. Please choose a different one.`;
        
        return res.status(409).json({
          success: false,
          message: message,
          field: field,
          code: 'DUPLICATE_KEY',
          duplicateField: field
        });
      }
      
      // Handle validation errors
      if (updateError.name === 'ValidationError') {
        const errors = Object.values(updateError.errors).map(err => ({
          field: err.path,
          message: err.message,
          type: err.kind
        }));
        
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          errors: errors
        });
      }
      
      // For any other database errors
      return res.status(500).json({
        success: false,
        message: 'Failed to update user profile due to a database error',
        code: 'DATABASE_ERROR',
        error: process.env.NODE_ENV === 'development' ? updateError.message : undefined
      });
    }
    
    // Prepare the success response
    const response = {
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        username: updatedUser.username,
        email: updatedUser.email,
        fullName: updatedUser.fullName,
        phoneNumber: updatedUser.phoneNumber,
        bio: updatedUser.bio,
        profilePicture: updatedUser.profilePicture,
        role: updatedUser.role,
        isEmailVerified: updatedUser.isEmailVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt
      },
      updatedAt: updatedUser.updatedAt,
      timestamp: new Date().toISOString()
    };
    
    // If profile picture was updated, include additional info
    if (updatesToApply.profilePicture !== undefined) {
      response.profileUpdate = {
        pictureUpdated: true,
        newUrl: updatedUser.profilePicture
      };
    }
    
    // Send the success response
    res.status(200).json(response);
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

// @desc    Check if username is available
// @route   GET /api/users/check-username
// @access  Public
const checkUsername = async (req, res) => {
  try {
    const { username } = req.query;
    
    if (!username) {
      return res.status(400).json({
        success: false,
        message: 'Username is required'
      });
    }

    // Check if username matches the required pattern
    const usernameRegex = /^[a-z0-9._-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, dots, underscores, and hyphens'
      });
    }

    // Check if username already exists
    const existingUser = await User.findOne({ username });
    
    return res.status(200).json({
      success: true,
      available: !existingUser
    });
    
  } catch (error) {
    console.error('Error checking username:', error);
    return res.status(500).json({
      success: false,
      message: 'Error checking username availability',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// @desc    Request password reset OTP
// @route   POST /api/auth/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { phoneNumber } = req.body;

    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        message: 'Phone number is required'
      });
    }

    // Find user by phone number
    const user = await User.findOne({ phoneNumber });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No user found with this phone number'
      });
    }

    // Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Save OTP and expiry to user document
    user.resetPasswordToken = otp;
    user.resetPasswordExpire = otpExpiry;
    await user.save();

    // TODO: In a production environment, you would send this OTP via SMS
    console.log(`Password reset OTP for ${phoneNumber}: ${otp}`);

    res.status(200).json({
      success: true,
      message: 'OTP sent to registered phone number',
      // In production, don't send the OTP in the response
      otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Reset password with OTP
// @route   POST /api/auth/reset-password
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { phoneNumber, otp, newPassword } = req.body;

    // Validate input
    if (!phoneNumber || !otp || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Phone number, OTP, and new password are required'
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Find user by phone number and check OTP
    const user = await User.findOne({
      phoneNumber,
      resetPasswordToken: otp,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Update password and clear reset token
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    await user.save();

    // Invalidate all existing tokens (optional)
    // user.tokens = [];
    // await user.save();


    res.status(200).json({
      success: true,
      message: 'Password reset successful. You can now login with your new password.'
    });

  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export { 
  registerUser, 
  loginUser, 
  logoutUser,
  forgotPassword,
  resetPassword,
  checkUsername,
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
