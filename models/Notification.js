import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: [
      // Existing types
      'follow', 
      'challenge', 
      'profile_update', 
      'tournament_reminder', 
      'level_up', 
      'achievement',
      // New types
      'new_game',
      'tournament_announcement',
      'game_update',
      'tournament_results',
      'announcement',
      'test',
      'custom'
    ]
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  read: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Index for frequently accessed queries
notificationSchema.index({ user: 1, read: 1, createdAt: -1 });

const Notification = mongoose.model('Notification', notificationSchema);

export default Notification;
