import mongoose from 'mongoose';

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/ful2win';
    console.log('=== MongoDB Connection ===');
    console.log('Connection URI:', mongoUri);
    
    // Enable debug mode for mongoose
    mongoose.set('debug', true);
    
    // Connection events
    mongoose.connection.on('connecting', () => {
      console.log('MongoDB: Connecting...');
    });

    mongoose.connection.on('connected', () => {
      console.log('MongoDB: Connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('MongoDB: Connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB: Disconnected');
    });

    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    });

    console.log('MongoDB: Connected to database:', mongoose.connection.name);
    
    // Test the connection
    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    const serverStatus = await admin.serverStatus();
    console.log('MongoDB Server Status:', {
      version: serverStatus.version,
      host: serverStatus.host,
      uptime: serverStatus.uptime,
      connections: serverStatus.connections
    });
    
  } catch (error) {
    console.error('MongoDB: Connection failed:', error.message);
    console.error('Error stack:', error.stack);
    process.exit(1);
  }
};

export default connectDB;
