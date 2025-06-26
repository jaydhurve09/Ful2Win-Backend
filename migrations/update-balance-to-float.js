import mongoose from 'mongoose';
import User from '../models/User.js';

// Get MongoDB URI from command line argument or use default
const mongoUri = process.argv[2];

if (!mongoUri) {
  console.error('Please provide MongoDB URI as a command-line argument');
  console.log('Example: node migrations/update-balance-to-float.js "mongodb://localhost:27017/your_database"');
  process.exit(1);
}

async function updateUserBalances() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    // Find all users with their current balance
    const users = await User.find({}).select('fullName balance');
    console.log(`Found ${users.length} users to check`);

    // Update each user's balance to ensure it's a float with exactly 2 decimal places
    let updatedCount = 0;
    for (const user of users) {
      const originalBalance = user.balance;
      const formattedBalance = parseFloat(parseFloat(originalBalance || 0).toFixed(2));
      
      console.log(`User: ${user.fullName} (${user._id})`);
      console.log(`- Current balance: ${originalBalance} (type: ${typeof originalBalance})`);
      console.log(`- Formatted balance: ${formattedBalance} (type: ${typeof formattedBalance})`);
      
      // Only update if the formatted value is different from the original
      if (originalBalance !== formattedBalance) {
        console.log('  -> Needs update!');
        await User.updateOne(
          { _id: user._id },
          { $set: { balance: formattedBalance } }
        );
        updatedCount++;
      } else {
        console.log('  -> Already properly formatted');
      }
      console.log('---');
    }

    console.log(`Successfully updated ${updatedCount} user balances`);
    process.exit(0);
  } catch (error) {
    console.error('Error updating user balances:', error);
    process.exit(1);
  }
}

updateUserBalances();
