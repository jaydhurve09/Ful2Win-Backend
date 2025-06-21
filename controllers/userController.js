const User = require('../models/User');

// @desc    Register a new user
// @route   POST /api/users/register
// @access  Public
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

// @desc    Authenticate user & get token
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    // Check if body exists and is an object
    if (!req.body || typeof req.body !== 'object' || Object.keys(req.body).length === 0) {
      const error = new Error('Invalid request body');
      error.status = 400;
      throw error;
    }

    const { phoneNumber, password } = req.body;

    // Input validation
    if (!phoneNumber || !password) {
      console.error('Missing required fields:', { phoneNumber: !!phoneNumber, password: !!password });
      return res.status(400).json({ 
        success: false,
        message: 'Please provide both phone number and password',
        received: {
          phoneNumber: !!phoneNumber,
          password: !!password
        }
      });
    }

    // Phone number format validation
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phoneNumber)) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide a valid 10-digit phone number' 
      });
    }

    // Find user
    const user = await User.findOne({ phoneNumber }).select('+password');
    if (!user) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Check password
    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid credentials' 
      });
    }

    // Log welcome message
    console.log(`User logged in: Welcome ${user.fullName}! (ID: ${user._id})`);
    
    // Return user data (excluding password)
    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        phoneNumber: user.phoneNumber,
        balance: user.Balance
      }
    });

  } catch (error) {
    const statusCode = error.status || 500;
    const response = {
      success: false,
      message: error.message || 'Server error during login'
    };

    if (process.env.NODE_ENV === 'development') {
      response.error = error.message;
    }

    res.status(statusCode).json(response);
  }
};

export { registerUser, loginUser };
