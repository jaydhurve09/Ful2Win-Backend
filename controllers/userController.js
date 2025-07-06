import fs from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { v2 as cloudinary } from 'cloudinary';
import mongoose from 'mongoose';
import crypto from 'crypto';
import User from '../models/User.js';
import Post from '../models/Post.js';
import path from 'path';

// @desc    Get user profile picture
// @route   GET /api/users/profile-picture/:userId
// @access  Public
const getProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select('profilePicture');
    
    if (!user || !user.profilePicture) {
      // Return default profile picture
      const defaultImagePath = path.join(
        dirname(fileURLToPath(import.meta.url)), 
        '..', 
        'public',
        'images',
        'default-profile.png'
      );
      return res.sendFile(defaultImagePath);
    }

    // If it's a URL, redirect to it
    if (user.profilePicture.startsWith('http')) {
      return res.redirect(user.profilePicture);
    }

    // If it's a local path, send the file
    const imagePath = path.join(
      dirname(fileURLToPath(import.meta.url)), 
      '..', 
      'uploads',
      'profile-pictures',
      user.profilePicture
    );

    if (fs.existsSync(imagePath)) {
      return res.sendFile(imagePath);
    }

    // If file doesn't exist, return default
    const defaultImagePath = path.join(
      dirname(fileURLToPath(import.meta.url)), 
      '..', 
      'public',
      'images',
      'default-profile.png'
    );
    return res.sendFile(defaultImagePath);
  } catch (error) {
    // Log the error and return default image
    console.error('Error getting profile picture:', error);
    const defaultImagePath = path.join(
      dirname(fileURLToPath(import.meta.url)), 
      '..', 
      'public',
      'images',
      'default-profile.png'
    );
    return res.sendFile(defaultImagePath);
  }
};

// Create __dirname equivalent for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Standardized error handler
function handleError(res, error, message = 'Server error', status = 500) {
  console.error(message, error);
  res.status(status).json({
    success: false,
    message,
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
  });
}

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    
    const { fullName, phone,phoneNumber, password,email, referralCode } = req.body;

    if (!fullName || !phoneNumber || !password|| !email) {
      console.log('Missing required fields');
      return res.status(400).json({ 
        success: false,
        message: 'Please provide all required fields',
        required: ['fullName', 'phoneNumber', 'password']
      });
    }

    // Check if user already exists
    console.log('Checking if user exists with phone:', phoneNumber);
    const userExists = await User.findOne({ phoneNumber }).session(session);
    if (userExists) {
      console.log('User already exists with phone:', phoneNumber);
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this phone number' 
      });
    }

    // If referral code is provided, validate it
    let referrer = null;
    if (referralCode) {
      referrer = await User.findOne({ referralCode }).session(session);
      if (!referrer) {
        return res.status(400).json({
          success: false,
          message: 'Invalid referral code'
        });
      }
    }

    console.log('Creating new user...');
    // Create new user
    const userData = {
      fullName,
      phoneNumber,
      email,
      password, // Password will be hashed by the pre-save hook in the User model
      Balance: 0,
      followers: [],
      following: []
    };

    // If valid referrer, set the referredBy field
    if (referrer) {
      userData.referredBy = referrer._id;
    }

    const user = await User.create([userData], { session });
    const newUser = user[0];

    console.log('User created successfully:', {
      _id: newUser._id,
      fullName: newUser.fullName,
      phoneNumber: newUser.phoneNumber,
      referralCode: newUser.referralCode,
      referredBy: newUser.referredBy
    });
 // generate a token and return them
    const token = newUser.getSignedJwtToken();
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    });
    console.log('JWT token generated and set in cookie');
    // Remove password from output
     await session.commitTransaction();
     session.endSession();

    newUser.password = undefined;
    console.log('Returning user data without password');
    res.status(201).json({
      success: true,
      user: newUser,
      token,
      message: 'User registered successfully'
    });


    // Create referral record if applicable
    // if (referrer) {
    //   const Referral = (await import('../models/Referral.js')).default;
    //   await Referral.create([{
    //     referrer: referrer._id,
    //     referredUser: newUser._id,
    //     referralCode: referrer.referralCode
    //   }], { session });
    // }

    // // Commit the transaction
    
    // // Return user data (excluding password)
    // res.status(201).json({
    //   success: true,
    //   _id: newUser._id,
    //   fullName: newUser.fullName,
    //   phoneNumber: newUser.phoneNumber,
    //   Balance: newUser.balance,
    //   referralCode: newUser.referralCode,
    //   referredBy: newUser.referredBy
    // });
  } catch (error) {
    handleError(res, error, 'Error registering user');
  }
};

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  // Debug: log the incoming request body and its type
  console.log('LOGIN REQUEST BODY:', req.body, 'TYPE:', typeof req.body);

  try {
    // Accept both JSON and stringified JSON body
    let { phone, password } = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!phone || !password) {
      return res.status(400).json({ success: false, message: 'Phone and password are required' });
    }
    // Find user by phone number
    let user;
    try {
      user = await User.findOne({ phoneNumber: phone }).select('+password');
    } catch (dbErr) {
      console.error('MongoDB connection or query error during login:', dbErr);
      return res.status(500).json({ success: false, message: 'Database connection error', error: dbErr.message });
    }
    if (!user) {
      console.warn('Login failed: phone number not found:', phone);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    // Compare password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      console.warn('Login failed: wrong password for phone:', phone);
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
    // Generate JWT (assuming user.getSignedJwtToken() exists)
    const token = user.getSignedJwtToken ? user.getSignedJwtToken() : 'MOCK_TOKEN';
    user.password = undefined;
    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      data: user
    });
    // End of loginUser logic
  } catch (error) {
    handleError(res, error, 'Error during login', error.statusCode || 500);
  }
};

// @desc    Get user profile by ID
// @route   GET /api/users/profile/:userId
// @access  Private
const getUserProfile = async (req, res) => {
  try {
    
    const user = await User.findById(req.params.userId)
      .select('-password -__v -refreshToken')
      .populate('followers following', 'fullName profilePicture')
      .populate('posts', 'title content image likes comments');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    
    res.json(user);
  } catch (error) {
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

    // Convert to plain object and clean sensitive data
    const userData = user.toObject({ getters: true });
    
    // Ensure profilePicture exists in the response
    if (!userData.hasOwnProperty('profilePicture')) {
      userData.profilePicture = ''; // Ensure the field exists, even if null/undefined
    }
    
    // Handle the profile picture URL
    if (!userData.profilePicture) {
      userData.profilePicture = ''; // Ensure empty string if falsy
    } else if (!userData.profilePicture.startsWith('http') && 
              !userData.profilePicture.startsWith('blob:')) {
      // Only prepend base URL if it's not already a full URL or blob URL
      userData.profilePicture = `${process.env.CLIENT_URL || 'http://localhost:3000'}${userData.profilePicture.startsWith('/') ? '' : '/'}${userData.profilePicture}`;
    }
    
    res.json({
      success: true,
      data: userData
    });
  } catch (error) {
    console.error('Error getting current user profile:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

// Configure Cloudinary if not already configured
if (!cloudinary.config().cloud_name) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}

// @desc    Update user profile
// @route   PUT /api/users/profile/:userId
// @access  Private
const updateUserProfile = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    // Log file info if present
    // if (req.file) {
    //   console.log('Uploaded file info:', {
    //     fieldname: req.file.fieldname,
    //     originalname: req.file.originalname,
    //     mimetype: req.file.mimetype,
    //     size: req.file.size,
    //     buffer: req.file.buffer ? `Buffer(${req.file.buffer.length} bytes)` : 'No buffer',
    //     encoding: req.file.encoding
    //   });
    // } else {
    //   console.log('No file was uploaded with this request');
    // }
    
    // Debug: Log environment info
    // console.log('Environment:', {
    //   NODE_ENV: process.env.NODE_ENV,
    //   cwd: process.cwd(),
    //   __dirname,
    //   time: new Date().toISOString()
    // });
    
    // Debug: Log Cloudinary config (without exposing secrets)
    const cloudinaryConfig = {
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'not configured',
      api_key: process.env.CLOUDINARY_API_KEY ? 'configured' : 'not configured',
      api_secret: process.env.CLOUDINARY_API_SECRET ? 'configured' : 'not configured'
    };
    console.log('Cloudinary config status:', cloudinaryConfig);

    const userId = req.params.userId;
    
    // Validate user ID format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      console.error('Invalid user ID format:', userId);
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format',
        code: 'INVALID_USER_ID'
      });
    }
    
    // Check if user exists and is authorized
    const currentUser = await User.findById(userId).select('-password -__v -refreshToken').session(session);
    if (!currentUser) {
      console.error('User not found with ID:', userId);
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }
    
    // Check if the current user is authorized to update this profile
    if (currentUser._id.toString() !== req.user.id && req.user.role !== 'admin') {
      console.warn(`Unauthorized access attempt: User ${req.user.id} tried to update profile of user ${userId}`);
      await session.abortTransaction();
      session.endSession();
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
      'username'
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
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Username can only contain letters, numbers, dots, underscores, and hyphens'
        });
      }
      
      // Check if username is already taken by another user
      const existingUser = await User.findOne({ 
        username: updatesToApply.username,
        _id: { $ne: userId }
      }).session(session);
      
      if (existingUser) {
        await session.abortTransaction();
        session.endSession();
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
      delete updatesToApply.profilePicture;
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
        await session.abortTransaction();
        session.endSession();
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
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({
          success: false,
          message: 'Invalid file type. Only image files are allowed.',
          code: 'INVALID_FILE_TYPE',
          allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });
      }
      
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
        
        await session.abortTransaction();
        session.endSession();
        return res.status(400).json({ 
          success: false, 
          message: `Unsupported file type. Please upload an image file (${allowedTypes}).`,
          code: 'INVALID_FILE_TYPE',
          allowedTypes: Object.keys(allowedMimeTypes)
        });
      }
      
      // File size check (5MB limit)
      const maxFileSize = 5 * 1024 * 1024; // 5MB
      if (req.file.size > maxFileSize) {
        const fileSizeMB = (req.file.size / (1024 * 1024)).toFixed(2);
        console.error('File size exceeds limit:', {
          size: req.file.size,
          sizeMB: fileSizeMB,
          maxSize: '5MB'
        });
        
        await session.abortTransaction();
        session.endSession();
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
        
        // Verify Cloudinary configuration
        if (!process.env.CLOUDINARY_CLOUD_NAME || 
            !process.env.CLOUDINARY_API_KEY || 
            !process.env.CLOUDINARY_API_SECRET) {
          throw new Error('Cloudinary configuration is missing. Please check your environment variables.');
        }
        
        // Log Cloudinary configuration status
        console.log('Cloudinary configuration status:', {
          cloud_name: process.env.CLOUDINARY_CLOUD_NAME ? 'configured' : 'missing',
          api_key: process.env.CLOUDINARY_API_KEY ? 'configured' : 'missing',
          api_secret: process.env.CLOUDINARY_API_SECRET ? 'configured' : 'missing'
        });

        // Upload to Cloudinary with detailed error handling
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
          
          cloudinary.uploader.upload(
            dataUri,
            uploadOptions,
            (error, result) => {
              if (error) {
                console.error('Cloudinary upload error:', error);
                reject(new Error(`Failed to upload image to Cloudinary: ${error.message}`));
              } else if (!result || !result.secure_url) {
                reject(new Error('Cloudinary upload returned invalid response'));
              } else {
                resolve(result);
              }
            }
          );
        });
        
        // Set the new profile picture URL
        updatesToApply.profilePicture = uploadResult.secure_url;
        
        // If there was a previous profile picture, delete it from Cloudinary
        if (currentUser.profilePicture) {
          const oldProfilePicture = currentUser.profilePicture;
          try {
            // Extract public_id from the URL
            const urlParts = oldProfilePicture.split('/');
            const fileNameWithExtension = urlParts.pop();
            const publicId = `profiles/${fileNameWithExtension.split('.')[0]}`;
            
            // Delete the old image from Cloudinary
            const deleteResult = await cloudinary.uploader.destroy(publicId, {
              invalidate: true
            });
            
            console.log('Old profile picture deleted from Cloudinary:', {
              publicId,
              result: deleteResult.result,
              wasDeleted: deleteResult.result === 'ok'
            });
            
          } catch (deleteError) {
            // Don't fail the request if deletion of old image fails, but log it
            console.error('Error deleting old profile picture (non-critical):', {
              error: deleteError.message,
              profilePicture: oldProfilePicture,
              userId: currentUser._id
            });
          }
        }
        
      } catch (cloudinaryError) {
        await session.abortTransaction();
        session.endSession();
        console.error('Cloudinary error:', cloudinaryError);
        return res.status(500).json({
          success: false,
          message: 'Failed to process image upload',
          code: 'IMAGE_UPLOAD_ERROR',
          error: process.env.NODE_ENV === 'development' ? cloudinaryError.message : undefined
        });
      }
    }
    
    // Update the user in the database
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: updatesToApply },
      { new: true, runValidators: true, session }
    ).select('-password -__v -refreshToken');

    if (!updatedUser) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({
        success: false,
        message: 'User not found',
        code: 'USER_NOT_FOUND'
      });
    }

    // If profile picture was updated, notify followers
    if (updatesToApply.profilePicture) {
      try {
        await notifyProfilePictureUpdate(updatedUser._id);
        console.log('Notified followers about profile picture update');
      } catch (notifyError) {
        // Don't fail the request if notification fails, but log it
        console.error('Error notifying followers about profile picture update:', {
          error: notifyError.message,
          userId: updatedUser._id
        });
      }
    }

    // Commit the transaction
    await session.commitTransaction();
    session.endSession();

    // console.log('User profile updated successfully:', {
    //   userId: updatedUser._id,
    //   updatedFields: Object.keys(updatesToApply),
    //   timestamp: new Date().toISOString()
    // });

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
    if (updatesToApply.profilePicture) {
      response.profileUpdate = {
        pictureUpdated: true,
        newUrl: updatedUser.profilePicture
      };
    }

    // Send the success response
    return res.status(200).json(response);

  } catch (error) {
    // Abort the transaction in case of any error
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    
    console.error('Error updating user profile:', {
      error: error.message,
      stack: error.stack,
      name: error.name,
      code: error.code
    });
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => ({
        field: err.path,
        message: err.message,
        type: err.kind
      }));
      
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        code: 'VALIDATION_ERROR',
        errors
      });
    }
    
    // Handle duplicate key errors (e.g., duplicate email)
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: `${field.charAt(0).toUpperCase() + field.slice(1)} is already in use. Please choose a different one.`,
        field,
        code: 'DUPLICATE_KEY',
        duplicateField: field
      });
    }

    // Handle other errors
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while updating the profile',
      code: 'SERVER_ERROR',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
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
    handleError(res, error, 'Error getting users');
  }
};

// @desc    Check if username is available
// @route   GET /api/users/check-username/:username
// @access  Public
// @desc    Forgot password - Send reset token
// @route   POST /api/users/forgot-password
// @access  Public
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'No account with that email exists'
      });
    }

    // Generate reset token (you might want to use a more secure method in production)
    const resetToken = crypto.randomBytes(20).toString('hex');
    
    // Set token and expiry (1 hour from now)
    user.resetPasswordToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.resetPasswordExpire = Date.now() + 3600000; // 1 hour

    await user.save({ validateBeforeSave: false });

    // Create reset URL
    const resetUrl = `${req.protocol}://${req.get('host')}/api/users/reset-password/${resetToken}`;

    // TODO: Send email with reset URL
    console.log('Password reset URL:', resetUrl);

    res.status(200).json({
      success: true,
      message: 'Password reset email sent'
    });
  } catch (error) {
    handleError(res, error, 'Error during forgot password');
  }
};

// @desc    Reset password
// @route   PUT /api/users/reset-password/:token
// @access  Public
const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with matching token and check if it's not expired
    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpire: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired token'
      });
    }

    // Update password and clear reset token
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpire = undefined;
    
    await user.save();

    // TODO: Send confirmation email

    res.status(200).json({
      success: true,
      message: 'Password reset successful'
    });

  } catch (error) {
    handleError(res, error, 'Error resetting password');
  }
};

// @desc    Check if username is available
// @route   GET /api/users/check-username/:username
// @access  Public
const checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    
    // Basic validation
    if (!username || typeof username !== 'string' || username.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Username must be at least 3 characters long',
        available: false
      });
    }

    // Check if username follows allowed format (letters, numbers, dots, underscores, hyphens)
    const usernameRegex = /^[a-zA-Z0-9._-]+$/;
    if (!usernameRegex.test(username)) {
      return res.status(400).json({
        success: false,
        message: 'Username can only contain letters, numbers, dots, underscores, and hyphens',
        available: false
      });
    }

    // Check if username is already taken
    const existingUser = await User.findOne({ 
      username: username.toLowerCase() 
    });

    if (existingUser) {
      return res.json({
        success: true,
        available: false,
        message: 'Username is already taken'
      });
    }

    // Username is available
    res.json({
      success: true,
      available: true,
      message: 'Username is available'
    });

  } catch (error) {
    handleError(res, error, 'Error checking username availability');
  }
};

// @desc    Logout user / clear token
// @route   POST /api/users/logout
// @access  Private
const logoutUser = (req, res) => {
  try {
    // Clear the token from client-side
    // In a browser environment, this would be handled by removing the token from localStorage
    // This endpoint is here for API consistency and to invalidate tokens if needed in the future
    
    res.status(200).json({
      success: true,
      message: 'Successfully logged out'
    });
  } catch (error) {
    handleError(res, error, 'Error during logout');
  }
};

// @desc    Get all posts for a specific user
// @route   GET /api/users/:userId/posts
// @access  Public
const getUserPosts = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;
    
    // Convert to numbers and validate
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(50, Math.max(1, parseInt(limit)));
    
    // Check if user exists
    const user = await User.findById(userId).select('username');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get posts with pagination
    const query = { user: userId, isPublished: true };
    
    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum)
        .populate('user', 'username profilePicture')
        .populate('likes', 'username')
        .populate('comments.user', 'username profilePicture'),
      
      Post.countDocuments(query)
    ]);

    const totalPages = Math.ceil(total / limitNum);

    res.status(200).json({
      success: true,
      count: posts.length,
      page: pageNum,
      totalPages,
      totalPosts: total,
      data: posts
    });

  } catch (error) {
    handleError(res, error, 'Error fetching user posts');
  }
};

export { 
  registerUser, 
  loginUser, 
  logoutUser,
  getProfilePicture,
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
