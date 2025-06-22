import { MongoClient } from 'mongodb';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Configure environment variables
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkMatches() {
  let client;
  
  try {
    console.log('Connecting to MongoDB...');
    
    if (!process.env.MONGO_URI) {
      throw new Error('MONGO_URI environment variable is not set');
    }
    
    // Create a new MongoClient
    client = new MongoClient(process.env.MONGO_URI);
    
    // Connect to the MongoDB server
    await client.connect();
    console.log('✅ Successfully connected to MongoDB');
    
    // Get the database and collection
    const db = client.db('ful2win');
    const matches = db.collection('matches');
    
    // Find the most recent matches
    const recentMatches = await matches.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray();
    
    if (recentMatches.length === 0) {
      console.log('No matches found in the database.');
      return;
    }
    
    console.log(`\nFound ${recentMatches.length} matches. Most recent first:\n`);
    
    // Display match details
    recentMatches.forEach((match, index) => {
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
    if (client) {
      await client.close();
      console.log('\nDisconnected from MongoDB');
    }
  }
}

// Run the script
checkMatches();
