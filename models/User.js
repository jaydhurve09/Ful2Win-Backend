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

// Function to generate a random referral code
const generateReferralCode = async () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluding similar looking characters
  let code = '';
  let isUnique = false;
  
  while (!isUnique) {
    // Generate a random 8-character code
    code = '';
    for (let i = 0; i < 8; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    // Check if code is already in use
    const existingUser = await mongoose.model('User').findOne({ referralCode: code });
    if (!existingUser) {
      isUnique = true;
    }
  }
  
  return code;
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
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email address']
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true,
    uppercase: true,
    match: [/^[A-Z0-9]{6,10}$/, 'Referral code must be 6-10 alphanumeric characters']
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  hasMadeFirstDeposit: {
    type: Boolean,
    default: false
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
    default: 0.00,
    min: 0,
    set: v => parseFloat(v.toFixed(2)) // Ensure 2 decimal places
  },
  coins: {
    type: Number,
    default: 0,
    min: 0
  },
  resetPasswordToken: {
    type: String,
    select: false
  },
  resetPasswordExpire: {
    type: Date,
    select: false
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
  // Game Statistics
  gameStats: {
    totalMatches: { type: Number, default: 0 },
    totalWins: { type: Number, default: 0 },
    totalLosses: { type: Number, default: 0 },
    winRate: { type: Number, default: 0 }, // Percentage
    totalTournaments: { type: Number, default: 0 },
    tournamentWins: { type: Number, default: 0 },
    totalEarnings: { type: Number, default: 0 }, // In coins
    totalSpent: { type: Number, default: 0 }, // In coins
    rank: { type: Number, default: 0 },
    experience: { type: Number, default: 0 },
    level: { type: Number, default: 1 },
    // Per-game statistics
    games: [{
      gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
      name: String,
      matchesPlayed: { type: Number, default: 0 },
      matchesWon: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 },
      highestScore: { type: Number, default: 0 },
      averageScore: { type: Number, default: 0 },
      totalScore: { type: Number, default: 0 },
      tournamentsPlayed: { type: Number, default: 0 },
      tournamentsWon: { type: Number, default: 0 },
      lastPlayed: Date
    }]
  },
  
  // Tournament participation
  tournaments: [{
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    name: String,
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    gameName: String,
    status: {
      type: String,
      enum: ['registered', 'playing', 'eliminated', 'completed', 'winner', 'runner_up']
    },
    position: Number,
    entryFee: Number,
    prizeWon: Number,
    startDate: Date,
    endDate: Date,
    matches: [{
      matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
      roundNumber: Number,
      status: String,
      result: { type: String, enum: ['won', 'lost', 'draw', 'pending'] },
      score: Number,
      opponent: {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        username: String,
        score: Number
      },
      playedAt: Date
    }]
  }],
  
  // Match history
  matchHistory: [{
    matchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Match' },
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    gameName: String,
    gameMode: { type: String, enum: ['classic', 'tournament', 'quick', 'private'] },
    tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament' },
    tournamentName: String,
    result: { type: String, enum: ['won', 'lost', 'draw', 'abandoned'] },
    score: Number,
    position: Number, // For games with rankings
    players: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
      score: Number,
      isWinner: Boolean
    }],
    startTime: Date,
    endTime: Date,
    duration: Number, // in seconds
    entryFee: Number,
    earnings: Number,
    roomId: String
  }],
  
  // Achievements and badges
  achievements: [{
    id: String,
    name: String,
    description: String,
    icon: String,
    earnedAt: Date,
    progress: { current: Number, target: Number },
    isUnlocked: Boolean
  }],
  
  // Friends and social
  friends: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    username: String,
    status: { type: String, enum: ['pending', 'accepted', 'blocked'] },
    since: { type: Date, default: Date.now },
    stats: {
      matchesPlayed: { type: Number, default: 0 },
      matchesWon: { type: Number, default: 0 },
      winRate: { type: Number, default: 0 }
    }
  }],
  
  // Chat and Messaging
  chats: [{
    chatId: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat' },
    participants: [{
      userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      username: String,
      avatar: String
    }],
    lastMessage: {
      content: String,
      timestamp: Date,
      isRead: { type: Boolean, default: false }
    },
    unreadCount: { type: Number, default: 0 },
    isMuted: { type: Boolean, default: false },
    isArchived: { type: Boolean, default: false },
    lastOpened: { type: Date, default: Date.now }
  }],
  
  // Post and Content
  posts: [{
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    title: String,
    content: String,
    media: [String],
    likes: { type: Number, default: 0 },
    comments: { type: Number, default: 0 },
    shares: { type: Number, default: 0 },
    isPublic: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
  }],
  
  // Game Library
  gameLibrary: [{
    gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
    name: String,
    category: String,
    thumbnail: String,
    lastPlayed: Date,
    playCount: { type: Number, default: 0 },
    isFavorite: { type: Boolean, default: false },
    achievements: [{
      id: String,
      name: String,
      description: String,
      icon: String,
      unlockedAt: Date,
      progress: { current: Number, target: Number },
      isUnlocked: Boolean
    }],
    stats: {
      highScore: Number,
      totalScore: { type: Number, default: 0 },
      totalTimePlayed: { type: Number, default: 0 }, // in minutes
      wins: { type: Number, default: 0 },
      losses: { type: Number, default: 0 },
      draws: { type: Number, default: 0 },
      winStreak: { type: Number, default: 0 },
      bestWinStreak: { type: Number, default: 0 }
    },
    customSettings: mongoose.Schema.Types.Mixed
  }],
  
  // User Content
  likedPosts: [{
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    likedAt: { type: Date, default: Date.now }
  }],
  
  savedPosts: [{
    postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post' },
    savedAt: { type: Date, default: Date.now },
    folder: { type: String, default: 'default' }
  }],
  
  // Game Preferences
  gamePreferences: {
    defaultGameSettings: mongoose.Schema.Types.Mixed,
    preferredGames: [{
      gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
      name: String,
      category: String,
      lastPlayed: Date,
      playCount: Number
    }],
    recentlyPlayed: [{
      gameId: { type: mongoose.Schema.Types.ObjectId, ref: 'Game' },
      name: String,
      lastPlayed: Date,
      duration: Number // in minutes
    }],
    controls: {
      sensitivity: { type: Number, default: 5, min: 1, max: 10 },
      keybindings: mongoose.Schema.Types.Mixed,
      controllerLayout: { type: String, default: 'default' }
    },
    privacy: {
      showOnlineStatus: { type: Boolean, default: true },
      allowGameInvites: { type: String, enum: ['everyone', 'friends', 'none'], default: 'friends' },
      showGameActivity: { type: Boolean, default: true },
      showAchievements: { type: Boolean, default: true }
    }
  },
  
  // User preferences for notifications
  notificationPreferences: {
    email: {
      gameInvites: { type: Boolean, default: true },
      tournamentUpdates: { type: Boolean, default: true },
      matchResults: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true },
      achievements: { type: Boolean, default: true },
      promotions: { type: Boolean, default: false }
    },
    push: {
      gameInvites: { type: Boolean, default: true },
      yourTurn: { type: Boolean, default: true },
      matchResults: { type: Boolean, default: true },
      friendRequests: { type: Boolean, default: true }
    },
    inApp: {
      all: { type: Boolean, default: true },
      friendOnline: { type: Boolean, default: true },
      tournamentReminders: { type: Boolean, default: true }
    }
  },
  
  // User stats (kept for backward compatibility)
  stats: {
    postCount: { type: Number, default: 0 },
    followerCount: { type: Number, default: 0 },
    followingCount: { type: Number, default: 0 },
    likeCount: { type: Number, default: 0 },
    commentCount: { type: Number, default: 0 },
    matches: { type: Number, default: 0 },
    wins: { type: Number, default: 0 }
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

// Post-init hook removed for cleaner logs

// Method to compare password
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

// Generate referral code for new users
userSchema.pre('save', async function(next) {
  if (this.isNew && !this.referralCode) {
    this.referralCode = await generateReferralCode();
  }
  next();
});

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