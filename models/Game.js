import mongoose from 'mongoose';

// Define game categories and types
const GAME_TYPES = [
  'Card',
  'Board',
  'Puzzle',
  'Arcade',
  'Strategy',
  'Sports',
  'Racing',
  'Action',
  'Adventure',
  'Other'
];

const GAME_MODES = [
  'tournament',
  'classic',
  'private',
  'practise'
];

// Game schema
const gameSchema = new mongoose.Schema({
  // Unique game identifier (e.g., 'snake-ladder', 'rummy')
  gameId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
    match: /^[a-z0-9-]+$/,
    index: true
  },
  
  // Display name shown to users (e.g., 'Snake & Ladder', 'Rummy')
  name: {
    type: String,
    required: true,
    trim: true
  },
  
  // Game type (e.g., 'Card', 'Board', 'Puzzle')
  type: {
    type: String,
    required: true,
    enum: GAME_TYPES,
    index: true
  },
  
  // Game description
  description: {
    type: String,
    required: true,
    trim: true
  },
  
  // Available game modes
  modesAvailable: [{
    type: String,
    enum: GAME_MODES,
    required: true
  }],
  
  // Game rating (0-5)
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0
  },
  
  // Total number of plays
  totalPlays: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Number of active players
  activePlayers: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Game assets and URLs
  assets: {
    thumbnail: { 
      type: String, 
      required: true,
      trim: true,
      comment: 'Square game icon (recommended 512x512px)'
    },
    coverImage: {
      type: String,
      comment: 'Wide banner image for game header (recommended 1200x630px)'
    },
    // logo: String,  // Using thumbnail as the game icon instead
    
    // Game URL configuration
    gameUrl: { 
      // Base URL where the game is hosted (e.g., https://games.example.com/snake/)
      baseUrl: {
        type: String, 
        required: true,
        trim: true,
        match: /^https?:\/\//,
        set: (url) => {
          // Ensure the URL has a protocol and ends with a trailing slash
          let formattedUrl = url.trim();
          if (!formattedUrl.endsWith('/')) {
            formattedUrl += '/';
          }
          return formattedUrl;
        }
      },
      // Path where the game will be loaded in the iframe (e.g., /games/snake/)
      iframePath: {
        type: String,
        default: '/games/',
        trim: true,
        set: (path) => {
          // Ensure path starts and ends with a slash
          let formattedPath = path.trim();
          if (!formattedPath.startsWith('/')) {
            formattedPath = '/' + formattedPath;
          }
          if (!formattedPath.endsWith('/')) {
            formattedPath += '/';
          }
          return formattedPath;
        }
      },
      // Full URL constructed from baseUrl and iframePath
      fullUrl: {
        type: String,
        get: function() {
          if (!this.baseUrl) return '';
          try {
            const url = new URL(this.iframePath || '/', this.baseUrl);
            return url.toString();
          } catch (error) {
            console.error('Error constructing game URL:', error);
            return this.baseUrl;
          }
        },
        set: function() {
          // Setter is needed for Mongoose virtuals, but we'll handle it in the pre-save
          return this.fullUrl;
        }
      }
    },
    
    // Game communication settings
    communication: {
      // API endpoint for game server communication
      apiEndpoint: {
        type: String,
        trim: true,
        match: /^https?:\/\//
      },
      // Webhook URL for receiving game events
      webhookUrl: {
        type: String,
        trim: true,
        match: /^https?:\/\//
      },
      // Supported events and their handlers
      events: {
        type: [{
          name: { type: String, required: true },  // e.g., 'gameStarted', 'gameEnded', 'scoreUpdated'
          description: String,
          requiredData: [String],  // Required data fields for this event
          handler: {  // How to handle this event
            type: String,
            enum: ['webhook', 'polling', 'sse'],
            default: 'webhook'
          }
        }],
        default: [
          {
            name: 'gameStarted',
            description: 'When a game session starts',
            requiredData: ['sessionId', 'playerId', 'timestamp'],
            handler: 'webhook'
          },
          {
            name: 'gameEnded',
            description: 'When a game session ends',
            requiredData: ['sessionId', 'playerId', 'score', 'result', 'timestamp'],
            handler: 'webhook'
          },
          {
            name: 'scoreUpdated',
            description: 'When player score updates',
            requiredData: ['sessionId', 'playerId', 'score', 'timestamp'],
            handler: 'webhook'
          }
        ]
      },
      // Security settings for webhook verification
      security: {
        enabled: { type: Boolean, default: true },
        secretKey: String,  // For HMAC verification
        allowedIps: [String],  // IP whitelist
        rateLimit: {
          enabled: { type: Boolean, default: true },
          requests: { type: Number, default: 100 },
          window: { type: Number, default: 15 }  // minutes
        }
      },
      // Request/response format
      format: {
        request: {
          type: { type: String, default: 'json' },  // json, form-data, etc.
          timestampField: { type: String, default: 'timestamp' },
          signatureField: { type: String, default: 'signature' }
        },
        response: {
          successField: { type: String, default: 'success' },
          messageField: { type: String, default: 'message' },
          dataField: { type: String, default: 'data' }
        }
      }
    },
    
    // Game result schema (for storing completed game results)
    resultSchema: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {
        sessionId: { type: String, required: true },
        playerId: { type: String, required: true },
        gameId: { type: String, required: true },
        score: { type: Number, default: 0 },
        result: { type: String, enum: ['win', 'loss', 'draw', 'abandoned'] },
        stats: { type: Map, of: mongoose.Schema.Types.Mixed },
        metadata: { type: Map, of: mongoose.Schema.Types.Mixed },
        timestamp: { type: Date, default: Date.now }
      }
    }
  },
  
  // Game configuration
  config: {
    minPlayers: { type: Number, default: 1 },
    maxPlayers: { type: Number, default: 4 },
    hasTeams: { type: Boolean, default: false },
    isMultiplayer: { type: Boolean, default: true },
    isSinglePlayer: { type: Boolean, default: true },
    hasAI: { type: Boolean, default: false },
    hasLeaderboard: { type: Boolean, default: true },
    hasAchievements: { type: Boolean, default: true }
  },
  
  // Game rules and metadata
  rules: {
    objective: String,
    howToPlay: [String],
    winningConditions: [String],
    // Reference to related posts (tutorials, guides, etc.)
    relatedPosts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    }]
  },
  
  // Game creator/owner
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Game moderators/admins
  moderators: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    role: {
      type: String,
      enum: ['admin', 'moderator', 'tester'],
      default: 'moderator'
    },
    permissions: [String]
  }],
  
  // Related matches
  recentMatches: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Match',
    default: []
  }],
  
  // Chat rooms related to this game
  chatRooms: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Chat',
    default: []
  }],
  
  // Game community and social features
  community: {
    forumThreads: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    }],
    featuredContent: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Post'
    }],
    playerCount: {
      type: Number,
      default: 0
    },
    averageRating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0
    },
    reviews: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      rating: {
        type: Number,
        min: 1,
        max: 5,
        required: true
      },
      comment: String,
      likes: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }],
      createdAt: {
        type: Date,
        default: Date.now
      }
    }]
  },
  
  // Related models
  tournaments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament'
  }],
  
  leaderboard: [{
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: String,
    score: Number,
    rank: Number,
    lastPlayed: Date
  }],
  
  // Game statistics
  statistics: {
    totalMatches: { type: Number, default: 0 },
    totalPlayers: { type: Number, default: 0 },
    averagePlayTime: { type: Number, default: 0 }, // in minutes
    completionRate: { type: Number, default: 0 }, // percentage
    retentionRate: { type: Number, default: 0 } // percentage
  },
  
  // Game versions and updates
  version: {
    current: { type: String, default: '1.0.0' },
    changelog: [{
      version: String,
      date: { type: Date, default: Date.now },
      changes: [String]
    }]
  },
  
  // Game status
  status: {
    isActive: { type: Boolean, default: true },
    isFeatured: { type: Boolean, default: false },
    isUnderMaintenance: { type: Boolean, default: false },
    maintenanceMessage: String
  },
  
  // SEO and discovery
  metadata: {
    tags: [String],
    keywords: [String],
    slug: { type: String, unique: true, sparse: true }
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better query performance
gameSchema.index({ name: 1, type: 1 });
gameSchema.index({ 'status.isActive': 1, 'status.isFeatured': 1 });
gameSchema.index({ totalPlays: -1 });
gameSchema.index({ rating: -1 });

// Virtual for game URL
gameSchema.virtual('url').get(function() {
  return `/games/${this.name}`;
});

// Virtual for game thumbnail URL
gameSchema.virtual('thumbnailUrl').get(function() {
  return this.assets?.thumbnail || `/assets/games/${this.name}/thumbnail.jpg`;
});

// Method to update game statistics
gameSchema.methods.updateStats = async function() {
  const Match = mongoose.model('Match');
  const Tournament = mongoose.model('Tournament');
  
  const [matchCount, tournamentCount] = await Promise.all([
    Match.countDocuments({ gameId: this._id }),
    Tournament.countDocuments({ 'game.id': this._id })
  ]);
  
  this.totalPlays = matchCount;
  this.activePlayers = await mongoose.model('User').countDocuments({
    'gameLibrary.gameId': this._id,
    'lastActive': { $gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Active in last 24h
  });
  
  return this.save();
};

// Method to add a new version
gameSchema.methods.addVersion = function(version, changes) {
  this.version.changelog.push({
    version,
    changes: Array.isArray(changes) ? changes : [changes]
  });
  this.version.current = version;
  return this.save();
};

// Pre-save hook to generate slug
gameSchema.pre('save', function(next) {
  if (this.isModified('name') && (!this.metadata || !this.metadata.slug)) {
    if (!this.metadata) this.metadata = {};
    this.metadata.slug = this.name
      .toLowerCase()
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-')     // Replace spaces with -
      .replace(/-+/g, '-');     // Replace multiple - with single -
  }
  next();
});

// Create and export the model
const Game = mongoose.model('Game', gameSchema);

export { Game, GAME_TYPES, GAME_MODES };
