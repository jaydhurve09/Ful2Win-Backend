import bcrypt from 'bcrypt';
import UserModel from '../models/User.js';
import jwt from 'jsonwebtoken';
import validator from 'validator';

// create token
const createToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '2d' });
};
// Register a new user
const registerUser = async (req, res) => {
  const { name,phoneNumber, password } = req.body;
 console.log(name,phoneNumber, password);
    // Check if phone number is provided
    // Validate input
    if (!name || !phoneNumber || !password) {
      return res.status(400).json({ message: 'All fields are required' });
    }
    // Validate phone number format (example: 10 digits)
    if(!validator.isMobilePhone(phoneNumber, 'any', { strictMode: false })) {
      return res.status(400).json({ message: 'Invalid phone number format' });
    }

  try {
    // Check if user already exists
    const existingUser = await UserModel.findOne({ phoneNumber });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = new UserModel({
      fullName: name,
      phoneNumber: phoneNumber,
      password: hashedPassword
    });

    await newUser.save();

    // Create token
    const token = createToken(newUser._id);

    res.status(201).json({ token,message:'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
// Login a user
const loginUser = async (req, res) => {
  const { phoneNumber, password } = req.body;

  try {
    // Check if user exists
    const user = await UserModel.findOne({ phoneNumber });
    if (!user) {
      return res.status(400).json({ message: 'User not found' });
    }
    // Check password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid password' });
    }

    // Create token
    const token = createToken(user._id);
    res.status(200).json({ token, message: 'User logged in successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const getUserProfile = async (req, res) => {
  const userId = req.user._id;

  try {
    // Find user by ID
    const user = await UserModel.findById(userId).select('-password');
    if (!user) {
        return res.status(404).json({ message: 'User not found' });
        }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
const updateUserProfile = async (req, res) => {
  const userId = req.body.userId;

  try {
    // Find user by ID
    const user = await UserModel.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update user fields
    user.fullName = req.body.fullName || user.fullName;
    user.email = req.body.email || user.email;
    user.Cash = req.body.Cash || user.Cash;
    user.Coin = req.body.Coin || user.Coin;
    


    await user.save();

    res.status(200).json({ message: 'User profile updated successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
export { registerUser, loginUser, getUserProfile, updateUserProfile };