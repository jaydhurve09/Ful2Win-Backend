import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Use MONGODB_URI from environment variables or fallback to local
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ful2win';
    
    // Set mongoose options - removed deprecated options
    const options = {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    };
    
    // Connection events - only log errors and disconnections
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB: Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB: Disconnected');
    });

    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(mongoUri, options);
    
    // Verify connection by listing collections
    try {
      const collections = await mongoose.connection.db.listCollections().toArray();
      console.log(`MongoDB: Connected to database '${mongoose.connection.name}' (${collections.length} collections)`);
    } catch (listError) {
      console.log(`MongoDB: Connected to database '${mongoose.connection.name}' (new database)`);
    }
    
    return mongoose.connection;
    
  } catch (error) {
    console.error('MongoDB: Connection failed:', error.message);
    console.error('Error code:', error.codeName);
    console.error('Error stack:', error.stack);
    
    // Exit process with failure if we can't connect to DB
    process.exit(1);
    process.exit(1);
  }
};

export default connectDB;
