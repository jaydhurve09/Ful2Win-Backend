import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from '../models/User.js';

// Load environment variables
dotenv.config();

// MongoDB connection URL
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ful2win';

// Parse command line arguments
const args = process.argv.slice(2);
const userId = args[0];
const coins = parseInt(args[1], 10);

if (!userId || isNaN(coins)) {
  console.error('Usage: node scripts/updateUserCoins.js <userId> <coins>');
  console.error('Example: node scripts/updateUserCoins.js 60d21b4667d0d8992e610c85 1000');
  process.exit(1);
}

async function updateUserCoins() {
  try {
    // Connect to MongoDB
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log(`Updating coins for user ${userId} to ${coins}...`);
    
    // Update the user's coins
    const updatedUser = await User.findByIdAndUpdate(
      userId,
      { $set: { coins } },
      { new: true, runValidators: true }
    );

    if (!updatedUser) {
      throw new Error(`User with ID ${userId} not found`);
    }

    console.log('User updated successfully:');
    console.log(`- Name: ${updatedUser.fullName}`);
    console.log(`- Email: ${updatedUser.email || 'N/A'}`);
    console.log(`- Phone: ${updatedUser.phoneNumber || 'N/A'}`);
    console.log(`- New Coins: ${updatedUser.coins}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating user coins:', error.message);
    process.exit(1);
  } finally {
    // Close the connection
    await mongoose.connection.close();
  }
}

// Run the function
updateUserCoins();
