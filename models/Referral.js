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
    default: false,
    index: true
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

// Compound index for common query patterns
referralSchema.index(
  { referrer: 1, rewardGiven: 1 },
  { name: 'referrer_rewardGiven' }
);

// No need for separate index on referredUser as it's already unique
// No need for compound index on {referrer, referredUser} as referredUser is already unique

const Referral = mongoose.model('Referral', referralSchema);

export default Referral;
