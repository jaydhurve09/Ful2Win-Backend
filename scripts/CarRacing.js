// scripts/CarRacing.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { GameMetadata } from '../models/Game.js';
import fetch from 'node-fetch';

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

const addCarRacing = async () => {
  try {
    await connectDB();

    // Use a static icon URL (you should upload an icon and update this path)
    const iconUrl = '/2d-car-racing/assets/icon.png';
    console.log('Using static icon URL:', iconUrl);

    const gameData = {
      name: '2d-car-racing',
      displayName: '2D Car Racing',
      description: 'A fun 2D car racing game where you dodge obstacles and race against time',
      thumbnail: iconUrl,
      path: '/2d-car-racing',
      category: 'racing',
      tags: ['racing', 'car', '2d', 'action'],
      version: '1.0.0',
      config: {
        hasScores: true,
        supportsMultiplayer: false, // Set to true if you want to enable multiplayer
        requiresFullscreen: true
      },
      meta: {
        title: '2D Car Racing - Race Against Time',
        description: 'Dodge obstacles and set the best time in this exciting 2D racing game!',
        keywords: ['racing', 'car', '2d', 'game', 'obstacles']
      },
      creator: {
        name: 'Your Name',
        url: 'https://yourwebsite.com'
      }
    };

    // Check if game already exists
    let game = await GameMetadata.findOne({ name: gameData.name });
    
    if (game) {
      console.log('\n🔄 Updating existing game...');
      game = await GameMetadata.findOneAndUpdate(
        { name: gameData.name },
        { $set: gameData },
        { new: true }
      );
    } else {
      console.log('\n✨ Creating new game...');
      game = new GameMetadata(gameData);
      await game.save();
    }

    console.log('\n=== 🎉 2D Car Racing Game Added Successfully! ===');
    console.log('Game Name:', game.displayName);
    console.log('Game ID:', game._id);
    console.log('Game URL:', `http://localhost:${process.env.PORT || 5000}/games/${game.name}`);
    
    return game;
  } catch (error) {
    console.error('Error adding 2D Car Racing game:', error);
    process.exit(1);
  }
};

// Run the script
addCarRacing()
  .then(() => {
    console.log("\n2D Car Racing game setup complete!");
    console.log("You can now access the game at: http://localhost:5000/games/2d-car-racing");
    process.exit(0);
  })
  .catch(error => {
    console.error("Error setting up 2D Car Racing game:", error);
    process.exit(1);
  });
