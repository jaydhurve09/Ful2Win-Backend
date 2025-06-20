const User = require('../models/User');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
const registerUser = async (req, res) => {
  try {
    const { fullName, phoneNumber, password } = req.body;

    // Check if user already exists
    const userExists = await User.findOne({ phoneNumber });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this phone number' });
    }

    // Create new user
    const user = await User.create({
      fullName,
      phoneNumber,
      password, // Password will be hashed by the pre-save hook in the User model
      Balance: 0,
      followers: [],
      following: []
    });

    // Return user data (excluding password)
    res.status(201).json({
      _id: user._id,
      fullName: user.fullName,
      phoneNumber: user.phoneNumber,
      Balance: user.Balance
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
};

module.exports = {
  registerUser
};
