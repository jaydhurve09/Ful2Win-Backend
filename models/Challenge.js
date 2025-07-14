import mongoose from 'mongoose';

const challengeSchema = new mongoose.Schema({
  // Challenge creator
  challenger: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Challenge recipient
  challenged: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  
  // Game being challenged
  game: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Game',
    required: true
  },
  
  // Challenge status
  status: {
    type: String,
    enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
    default: 'pending'
  },
  
  // Challenge message (optional)
  message: {
    type: String,
    maxlength: 200,
    default: ''
  },
  
  // Challenge result (when completed)
  result: {
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    score: {
      challenger: { type: Number, default: 0 },
      challenged: { type: Number, default: 0 }
    },
    completedAt: Date
  },
  
  // Timestamps
  expiresAt: {
    type: Date,
    default: function() {
      // Challenge expires in 7 days
      return new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: true
});

// Indexes for better query performance
challengeSchema.index({ challenger: 1, status: 1 });
challengeSchema.index({ challenged: 1, status: 1 });
challengeSchema.index({ game: 1, status: 1 });
challengeSchema.index({ status: 1, createdAt: -1 });

// Virtual for checking if challenge is expired
challengeSchema.virtual('isExpired').get(function() {
  return this.expiresAt && new Date() > this.expiresAt;
});

// Pre-save middleware to handle expired challenges
challengeSchema.pre('save', function(next) {
  if (this.isExpired && this.status === 'pending') {
    this.status = 'cancelled';
  }
  next();
});

// Static method to get challenges for a user
challengeSchema.statics.getUserChallenges = function(userId) {
  return this.find({
    $or: [{ challenger: userId }, { challenged: userId }]
  })
  .populate('challenger', 'fullName profilePicture')
  .populate('challenged', 'fullName profilePicture')
  .populate('game', 'displayName name thumbnail')
  .sort({ createdAt: -1 });
};

// Static method to get incoming challenges for a user
challengeSchema.statics.getIncomingChallenges = function(userId) {
  return this.find({
    challenged: userId,
    status: 'pending'
  })
  .populate('challenger', 'fullName profilePicture')
  .populate('game', 'displayName name thumbnail')
  .sort({ createdAt: -1 });
};

// Static method to get outgoing challenges for a user
challengeSchema.statics.getOutgoingChallenges = function(userId) {
  return this.find({
    challenger: userId,
    status: 'pending'
  })
  .populate('challenged', 'fullName profilePicture')
  .populate('game', 'displayName name thumbnail')
  .sort({ createdAt: -1 });
};

const Challenge = mongoose.model('Challenge', challengeSchema);

export default Challenge; 