import mongoose from 'mongoose';

const playerSchema = new mongoose.Schema({
  playerId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'user',
    required: true 
  },
  username: { 
    type: String, 
    required: true 
  },
  score: { 
    type: Number, 
    default: 0 
  },
  isWinner: {
    type: Boolean,
    default: false
  }
}, { _id: false });

const matchSchema = new mongoose.Schema({
  tournamentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tournament',
    sparse: true
  },
  gameId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  roomId: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    uppercase: true
  },
  roundNumber: {
    type: Number,
    min: 1,
    default: 1
  },
  matchNumber: {
    type: Number,
    min: 1
  },
  players: {
    type: [playerSchema],
    validate: {
      validator: function(players) {
        return players.length > 0; // At least one player required
      },
      message: 'At least one player is required'
    }
  },
  status: {
    type: String,
    enum: ['Waiting', 'Ongoing', 'Completed'],
    default: 'Waiting',
    index: true
  },
  winnerIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user'
  }],
  // Keep old fields for backward compatibility
  entry_fee: {
    type: Number,
    default: 0
  },
  // Add match configuration if needed
  config: {
    maxPlayers: {
      type: Number,
      default: 2
    },
    // Add other match-specific configurations
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for faster queries
matchSchema.index({ tournamentId: 1, roundNumber: 1, matchNumber: 1 }, { unique: true, sparse: true });

// Virtual for checking if match is full
matchSchema.virtual('isFull').get(function() {
  return this.players.length >= (this.config?.maxPlayers || 2);
});

// Pre-save hook to generate roomId if not provided
matchSchema.pre('save', async function(next) {
  if (!this.roomId) {
    // Generate a random 6-character alphanumeric code
    this.roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  }
  next();
});

// Method to add a player to the match
matchSchema.methods.addPlayer = function(player) {
  if (this.isFull) {
    throw new Error('Match is full');
  }
  
  this.players.push({
    playerId: player._id,
    username: player.username,
    score: 0,
    isWinner: false
  });
  
  return this.save();
};

// Method to update player score
matchSchema.methods.updateScore = function(playerId, score) {
  const player = this.players.find(p => p.playerId.equals(playerId));
  if (player) {
    player.score = score;
    return this.save();
  }
  throw new Error('Player not found in this match');
};

// Method to complete the match and determine winners
matchSchema.methods.completeMatch = function(winnerIds) {
  if (this.status === 'Completed') {
    throw new Error('Match is already completed');
  }
  
  this.status = 'Completed';
  this.winnerIds = winnerIds;
  
  // Update isWinner flag for players
  this.players.forEach(player => {
    player.isWinner = winnerIds.some(id => id.equals(player.playerId));
  });
  
  return this.save();
};

const Match = mongoose.model('Match', matchSchema);
export default Match;
