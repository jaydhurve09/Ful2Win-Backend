import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: true,
    trim: true
  },
  email:{
    type: String,
    match: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
  },
  phoneNumber: {
    type: String,
    require: true,
    unique: true,
    match: /^[0-9]{10}$/, // Adjust according to your region
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  profilePicture: {
    type: String,
    default: '' // Replace with your default image URL
  },
  Cash: {
    type: Number,
    default: 0
  },
  Coin:{
    type: Number,
    default: 0
  },
  gamesWon: {
  type: Number,
  default: 0
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
  }]
});
const UserModel = mongoose.models.User || mongoose.model('User', userSchema);

export default UserModel;
