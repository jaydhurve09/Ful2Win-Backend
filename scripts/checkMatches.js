import mongoose from 'mongoose';
import Match from '../models/Match.js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file in the project root
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// MongoDB connection options
const mongoOptions = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
  socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
};

async function checkMatches() {
  try {
    console.log('Connecting to MongoDB...');
    console.log('Connection string:', process.env.MONGO_URI ? 'Found' : 'Missing');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI, mongoOptions);
    console.log('✅ Successfully connected to MongoDB');
    
    // Find all matches
    const matches = await Match.find({}).sort({ createdAt: -1 }).limit(5);
    
    if (matches.length === 0) {
      console.log('No matches found in the database.');
      return;
    }
    
    console.log(`\nFound ${matches.length} matches. Most recent first:\n`);
    
    // Display match details
    matches.forEach((match, index) => {
      console.log(`Match ${index + 1}:`);
      console.log(`  ID: ${match.match_id}`);
      console.log(`  Game: ${match.game}`);
      console.log(`  Status: ${match.status}`);
      console.log(`  Entry Fee: ${match.entry_fee}`);
      console.log('  Players:');
      
      match.players.forEach((player, idx) => {
        console.log(`    Player ${idx + 1}:`);
        console.log(`      ID: ${player.player_id}`);
        console.log(`      Name: ${player.player_name}`);
        console.log(`      Score: ${player.score}`);
      });
      
      if (match.winner && match.winner.player_id) {
        console.log(`  Winner: ${match.winner.player_name} (ID: ${match.winner.player_id})`);
      } else {
        console.log('  Winner: None (match in progress or draw)');
      }
      
      console.log(`  Created: ${match.createdAt}`);
      console.log('----------------------------------------');
    });
    
  } catch (error) {
    console.error('Error checking matches:', error);
  } finally {
    // Close the connection
    await mongoose.connection.close();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run the script
checkMatches();
