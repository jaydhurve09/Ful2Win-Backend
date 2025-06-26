import mongoose from 'mongoose';

// Get MongoDB URI from command line argument
const mongoUri = process.argv[2];
const userId = process.argv[3];
const newBalance = parseFloat(process.argv[4]);

if (!mongoUri || !userId || isNaN(newBalance)) {
  console.error('Usage: node scripts/update-user-balance.js <mongo_uri> <user_id> <new_balance>');
  console.error('Example: node scripts/update-user-balance.js "mongodb+srv://..." 685c330ab7e0f4d7def7171b 101.05');
  process.exit(1);
}

async function updateUserBalance() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Import the User model
    const User = (await import('../models/User.js')).default;

    // Update the user's balance
    const result = await User.findByIdAndUpdate(
      userId,
      { $set: { balance: newBalance } },
      { new: true }
    );

    if (!result) {
      throw new Error(`User with ID ${userId} not found`);
    }

    console.log('Successfully updated user balance:');
    console.log(`User: ${result.fullName} (${result._id})`);
    console.log(`New balance: ${result.balance} (type: ${typeof result.balance})`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error updating user balance:', error);
    process.exit(1);
  }
}

// Create scripts directory if it doesn't exist
import { mkdir } from 'fs/promises';
import { dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const scriptsDir = `${__dirname}/../scripts`;

try {
  await mkdir(scriptsDir, { recursive: true });
  updateUserBalance();
} catch (err) {
  console.error('Error creating scripts directory:', err);
  process.exit(1);
}
