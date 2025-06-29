import mongoose from 'mongoose';

const leaderboardEntrySchema = new mongoose.Schema({
  playerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User',
    required: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  totalWins: { 
    type: Number, 
    default: 0 
  },
  totalGames: { 
    type: Number, 
    default: 0 
  },
  winRate: { 
    type: Number, 
    default: 0 
  },
  totalCoinsEarned: { 
    type: Number, 
    default: 0 
  },
  rank: { 
    type: Number, 
    default: 0 
  }
});

// Function to generate tournament ID from name
const generateTournamentId = (name) => {
  if (!name) return '';
  // Get first letters of each word and convert to uppercase
  const letters = name.match(/\b\w/g) || [];
  const prefix = letters.join('').toUpperCase();
  // Add a random 4-digit number
  const randomNum = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}${randomNum}`;
};

const tournamentSchema = new mongoose.Schema({
  tournamentId: {
    type: String,
    unique: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  tournamentType: {
    type: String,
    enum: ['cash', 'coin'],
    required: true,
    default: 'coin'
  },
  playerType: {
    type: String,
    enum: ['solo', 'multiplayer', 'teams'],
    required: true,
    default: 'solo'
  },
  bannerImage: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    default: ''
  },
  modesAvailable: [{
    type: String,
    enum: ['tournament', 'classic', 'private', 'practise'],
    default: ['classic']
  }],
  rating: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },
  totalPlays: {
    type: Number,
    default: 0
  },
  activePlayers: {
    type: Number,
    default: 0
  },
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  leaderboard: [leaderboardEntrySchema],
  entryFee: {
    type: Number,
    default: 0
  },
  prizePool: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['upcoming', 'live', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date
  },
  maxPlayers: {
    type: Number,
    default: 100
  },
  currentPlayers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }],
  winners: [{
    position: Number,
    playerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'user'
    },
    username: String,
    prize: Number
  }]
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Calculate win rate before saving
leaderboardEntrySchema.pre('save', function(next) {
  if (this.totalGames > 0) {
    this.winRate = (this.totalWins / this.totalGames) * 100;
  }
  next();
});

// Add a virtual for available spots
// tournamentSchema.virtual('availableSpots').get(function() {
//   return this.maxPlayers - this.currentPlayers.length;
// });

// Add text index for search
// tournamentSchema.index({ 
//   name: 'text', 
//   description: 'text',
//   type: 'text' 
// });

// Pre-save hook to generate tournamentId
const Tournament = tournamentSchema;

tournamentSchema.pre('save', function(next) {
  if (!this.tournamentId) {
    this.tournamentId = generateTournamentId(this.name);
  }
  next();
});

export default mongoose.model('Tournament', tournamentSchema);
