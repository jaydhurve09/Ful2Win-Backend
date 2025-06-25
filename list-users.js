import mongoose from 'mongoose';
import User from './models/User.js';

async function listUsers() {
  try {
    const mongoUri = 'mongodb://localhost:27017/ful2win';
    console.log('Connecting to MongoDB...');
    
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('Connected to MongoDB');
    
    // Find all users
    const users = await User.find({}).select('-password').lean();
    
    console.log('\n=== Users in Database ===');
    console.log('Total users:', users.length);
    
    if (users.length > 0) {
      console.log('\nUser List:');
      users.forEach((user, index) => {
        console.log(`\nUser ${index + 1}:`);
        console.log('ID:', user._id);
        console.log('Full Name:', user.fullName);
        console.log('Phone:', user.phoneNumber);
        console.log('Balance:', user.Balance);
        console.log('Created At:', user.createdAt);
        console.log('Updated At:', user.updatedAt);
      });
    } else {
      console.log('No users found in the database.');
    }
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\nConnection closed');
  }
}

listUsers();
