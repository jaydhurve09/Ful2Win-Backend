import mongoose from 'mongoose';

// Define game categories
const GAME_CATEGORIES = [
  'arcade',
  'puzzle',
  'action',
  'adventure',
  'strategy',
  'sports',
  'racing',
  'other'
];

// Game metadata schema (for game information)
const gameMetadataSchema = new mongoose.Schema({
  // Unique identifier for the game (e.g., 'whack-a-mole')
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/
  },
  // Display name for the game
  displayName: {
    type: String,
    required: true,
    trim: true
  },
  // Game description
  description: {
    type: String,
    required: true,
    trim: true
  },
  // URL or path to the game's thumbnail image
  thumbnail: {
    type: String,
    required: true,
    trim: true
  },
  // Base path where the game files are served from
  path: {
    type: String,
    required: true,
    trim: true
  },
  // Category of the game
  category: {
    type: String,
    enum: GAME_CATEGORIES,
    default: 'arcade'
  },
  // Game version for cache busting
  version: {
    type: String,
    default: '1.0.0'
  },
  // Game tags for search and filtering
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  // Game configuration options
  config: {
    hasScores: {
      type: Boolean,
      default: true
    },
    supportsMultiplayer: {
      type: Boolean,
      default: false
    },
    requiresFullscreen: {
      type: Boolean,
      default: false
    }
  },
  // Game statistics
  stats: {
    plays: {
      type: Number,
      default: 0
    },
    lastPlayed: Date
  },
  // SEO metadata
  meta: {
    title: String,
    description: String,
    keywords: [String]
  },
  // Game creator information
  creator: {
    name: String,
    url: String
  },
  // Whether the game is active and should be shown to users
  isActive: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Game session schema (for individual game plays)
const gameSessionSchema = new mongoose.Schema({
  // Reference to the game metadata
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameMetadata',
    required: true
  },
  // Player information (can be 'anonymous' or user ID)
  player: {
    type: String,
    default: 'anonymous',
    required: true
  },
  // Game-specific data
  score: {
    type: Number,
    default: 0
  },
  duration: {
    type: Number, // in seconds
    default: 0
  },
  status: {
    type: String,
    enum: ['in-progress', 'completed', 'abandoned'],
    default: 'in-progress'
  },
  // Game state or additional data
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  startedAt: {
    type: Date,
    default: Date.now
  },
  endedAt: {
    type: Date
  }
}, { timestamps: true });

// Indexes for better query performance
gameMetadataSchema.index({ name: 1, isActive: 1 });
gameMetadataSchema.index({ category: 1, isActive: 1 });
gameSessionSchema.index({ player: 1, status: 1 });
gameSessionSchema.index({ game: 1, score: -1 }); // For leaderboards

// Virtual for game URL
gameMetadataSchema.virtual('url').get(function() {
  return `/api/games/${this.name}`;
});

// Method to increment play count
gameMetadataSchema.methods.incrementPlays = async function() {
  this.stats.plays += 1;
  this.stats.lastPlayed = new Date();
  return this.save();
};

// Create models
const GameMetadata = mongoose.model('GameMetadata', gameMetadataSchema);
const GameSession = mongoose.model('GameSession', gameSessionSchema);

export { GameMetadata, GameSession, GAME_CATEGORIES };
