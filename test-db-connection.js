import mongoose from 'mongoose';

async function testConnection() {
  try {
    const mongoUri = 'mongodb://localhost:27017/ful2win';
    console.log('Testing MongoDB connection to:', mongoUri);
    
    // Set mongoose debug mode
    mongoose.set('debug', true);
    
    // Connect to MongoDB
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    
    console.log('Successfully connected to MongoDB');
    
    // Test the connection with a simple query
    const admin = new mongoose.mongo.Admin(mongoose.connection.db);
    const collections = await admin.listDatabases();
    console.log('Available databases:', collections.databases.map(db => db.name));
    
    // Check if our database exists
    const dbExists = collections.databases.some(db => db.name === 'ful2win');
    console.log('Database "ful2win" exists:', dbExists);
    
    // Close the connection
    await mongoose.connection.close();
    console.log('Connection closed');
    
  } catch (error) {
    console.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
}

testConnection();
