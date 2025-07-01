import mongoose from 'mongoose';

const referralSchema = new mongoose.Schema({
  referrer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  referredUser: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  referralCode: {
    type: String,
    required: true
  },
  rewardGiven: {
    type: Boolean,
    default: false
  },
  rewardAmount: {
    type: Number,
    default: 50 // Default reward amount in coins
  },
  firstDepositAt: {
    type: Date,
    default: null
  }
}, {
  timestamps: true
});

// Index for faster queries
referralSchema.index({ referrer: 1, rewardGiven: 1 });
referralSchema.index({ referredUser: 1 }, { unique: true });

// Prevent duplicate referrals
referralSchema.index(
  { referrer: 1, referredUser: 1 },
  { unique: true }
);

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;
