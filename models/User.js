// models/User.js
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

// Function to generate username from full name
const generateUsername = async (fullName) => {
  // Convert to lowercase and replace spaces with dots
  let baseUsername = fullName
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '.');  // Replace spaces with dots
    
  // Remove all special characters except dots, underscores, and hyphens
  baseUsername = baseUsername.replace(/[^a-z0-9._-]/g, '');
  
  // Ensure username is not empty
  if (!baseUsername) {
    baseUsername = 'user';
  }
  
  // Check if username already exists
  let username = baseUsername;
  let counter = 1;
  
  while (true) {
    const existingUser = await mongoose.model('User').findOne({ username });
    if (!existingUser) break;
    username = `${baseUsername}${counter}`;
    counter++;
  }
  
  return username;
};

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: false, // Made optional as it will be auto-generated
    unique: true,
    sparse: true, // Allows multiple null values for unique index
    trim: true,
    lowercase: true,
    match: [/^[a-z0-9._-]+$/, 'Username can only contain letters, numbers, dots, underscores, and hyphens']
  },
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please use a valid email address.']
  },
  phoneNumber: {
    type: String,
    required: true,
    unique: true,
    match: /^[0-9]{10}$/, // 10-digit phone number
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
    select: false
  },
  profilePicture: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    maxlength: 500,
    default: ''
  },
  dateOfBirth: {
    type: Date
  },
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer not to say'],
    default: 'prefer not to say'
  },
  country: {
    type: String,
    default: ''
  },
  balance: {
    type: Number,
    default: 0,
    min: 0
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastActive: {
    type: Date,
    default: Date.now
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: []
  }],
  posts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: []
  }],
  savedPosts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post',
    default: []
  }],
  socialLinks: {
    facebook: { type: String, default: '' },
    twitter: { type: String, default: '' },
    instagram: { type: String, default: '' },
    youtube: { type: String, default: '' },
    tiktok: { type: String, default: '' }
  },
  preferences: {
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
      sms: { type: Boolean, default: false }
    }
  },
  stats: {
    postCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Hash password before saving
userSchema.pre('save', async function(next) {
  // Generate username if new user or username is not set
  if (this.isNew || !this.username) {
    try {
      this.username = await generateUsername(this.fullName);
      console.log(`Generated username: ${this.username} for user: ${this.fullName}`);
    } catch (error) {
      console.error('Error generating username:', error);
      // Don't block the save if username generation fails
    }
  }
  
  // Only hash password if it was modified
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Add post-save hook
userSchema.post('save', function(doc) {
  console.log('=== User Post-Save Hook ===');
  console.log('Document saved successfully:', {
    _id: doc._id,
    fullName: doc.fullName,
    phoneNumber: doc.phoneNumber
  });
});

// Add post-init hook to log when documents are loaded
userSchema.post('init', function(doc) {
  console.log('=== User Post-Init Hook ===');
  console.log('Document loaded from database:', {
    _id: doc._id,
    fullName: doc.fullName,
    phoneNumber: doc.phoneNumber
  });
});

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate JWT token
userSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    { id: this._id, phoneNumber: this.phoneNumber },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '30d' }
  );
};

const User = mongoose.model('User', userSchema);
export default User;