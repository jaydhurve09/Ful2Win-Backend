// scripts/WackAMole.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameMetadata } from '../models/Game.js';
import fetch from 'node-fetch';
// Removed Cloudinary upload import. Using static icon URL below.

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('MongoDB connected successfully');
    return true;
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};

const addWackAMole = async () => {
  try {
    await connectDB();

    // Use a static icon URL (local or already-uploaded Cloudinary URL)
    const iconUrl = '/Whack-A-Mole/assets/mole.svg';
    console.log('Using static icon URL:', iconUrl);

    const gameData = {
      name: 'wackamole',
      displayName: 'WackAMole',
      description: 'A fun arcade game where you wack moles as they pop up!',
      thumbnail: iconUrl, // Updated to use Cloudinary URL
      path: '/Whack-A-Mole',
      category: 'arcade',
      tags: ['arcade', 'fun', 'quick', 'singleplayer'],
      version: '1.0.0',
      config: {
        hasScores: true,
        supportsMultiplayer: true, // Changed to true to support multiplayer
        requiresFullscreen: false
      },
      meta: {
        title: 'WackAMole - Fun Arcade Game',
        description: 'Test your reflexes with this classic wack-a-mole game!',
        keywords: ['wack a mole', 'arcade', 'game', 'fun', 'multiplayer']
      },
      creator: {
        name: 'Your Name',
        url: 'https://your-website.com'
      }
    };

    // Check if game already exists
    let game = await GameMetadata.findOne({ name: gameData.name });
    
    if (game) {
      console.log('Updating existing WackAMole game...');
      // Update existing game
      game = await GameMetadata.findOneAndUpdate(
        { name: gameData.name },
        { $set: gameData },
        { new: true }
      );
    } else {
      console.log('Creating new WackAMole game...');
      // Create new game
      game = new GameMetadata(gameData);
      await game.save();
    }

    console.log('WackAMole game added/updated successfully!');
    console.log('Game ID:', game._id);
    console.log('Game URL:', `http://localhost:${process.env.PORT || 5000}/games/Whack-A-Mole/`);
    console.log('Game API URL:', `http://localhost:${process.env.PORT || 5000}${game.url}`);
    
    // Return a resolved promise to continue the chain
    return Promise.resolve();
  } catch (error) {
    console.error('Error adding WackAMole game:', error);
    return Promise.reject(error);
  }
};

// Utility to create a match via backend
import { exec } from 'child_process';

const createMatchAndOpenGame = async () => {
  try {
    const res = await fetch('http://localhost:5000/api/games/create-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        game: 'whackamole',
        entry_fee: 5,
        player1_id: 'TestPlayer1'
      })
    });
    const data = await res.json();
    if (data.success && data.match) {
      const matchId = data.match.match_id;
      const iframeUrl = `http://localhost:5000/games/Whack-A-Mole/?match_id=${matchId}&player_id=TestPlayer1`;
      
      // Enhanced output with match ID
      console.log('\n=== MATCH CREATED SUCCESSFULLY ===');
      console.log('Match ID:', matchId);
      console.log('Player 1 ID: TestPlayer1');
      console.log('\n=== PLAYER 1 ===');
      console.log(iframeUrl);
      
      // Generate Player 2 URL
      const player2Url = iframeUrl.replace('TestPlayer1', 'TestPlayer2');
      console.log('\n=== PLAYER 2 ===');
      console.log(player2Url);
      console.log('\nOpen these URLs in different browsers to test multiplayer!');
      
      // Try to open in default browser (works on Windows/macOS/Linux)
      const startCmd = process.platform === 'win32' 
        ? `start ${iframeUrl}` 
        : process.platform === 'darwin' 
          ? `open ${iframeUrl}` 
          : `xdg-open ${iframeUrl}`;
          
      exec(startCmd, (err) => {
        if (err) console.error('Could not open browser automatically:', err.message);
      });
      
      return matchId; // Return the match ID for potential further use
    } else {
      console.error('Failed to create match:', data.error || data);
      return null;
    }
  } catch (error) {
    console.error('Error creating match:', error.message);
    return null;
  }
};

// Run the script
addWackAMole()
  .then(() => {
    console.log("\nCreating match...");
    return createMatchAndOpenGame();
  })
  .then(matchId => {
    if (matchId) {
      console.log(`\nMatch created with ID: ${matchId}`);
    } else {
      console.error("\nFailed to create match");
    }
  })
  .catch(error => {
    console.error("Error in main execution:", error);
    process.exit(1);
  });