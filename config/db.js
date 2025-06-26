import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    // Use MONGODB_URI from environment variables or fallback to local
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ful2win';
    
    // Don't log the full connection string for security
    console.log('=== MongoDB Connection ===');
    console.log('Connecting to MongoDB...');
    
    // Set mongoose options
    const options = {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      family: 4, // Use IPv4, skip trying IPv6
    };
    
    // Connection events
    mongoose.connection.on('connecting', () => {
      console.log('MongoDB: Connecting...');
    });

    mongoose.connection.on('connected', () => {
      console.log('MongoDB: Connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB: Connection error:', err.message);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB: Disconnected');
    });

    // Connect to MongoDB
    await mongoose.connect(mongoUri, options);
    
    console.log('MongoDB: Connected to database:', mongoose.connection.name);
    
    // Simple ping to verify connection
    await mongoose.connection.db.admin().ping();
    console.log('MongoDB: Pinged successfully');
    
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
