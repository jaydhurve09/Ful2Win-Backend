// scripts/addGame.js
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createInterface } from 'readline';
import { promises as fs } from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { GameMetadata } from '../models/Game.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config({ path: path.join(__dirname, '..', '.env') });

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
});

// Create readline interface
const rl = createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise(resolve => rl.question(query, resolve));

const uploadImage = async (imagePath, folder = 'game-icons') => {
  try {
    const result = await cloudinary.uploader.upload(imagePath, {
      folder,
      use_filename: true,
      unique_filename: false,
      overwrite: true,
    });
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    throw error;
  }
};

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

const createGameFolder = async (gameName) => {
  const gamesDir = path.join(__dirname, '..', 'games');
  const gameDir = path.join(gamesDir, gameName);
  
  try {
    await fs.mkdir(gameDir, { recursive: true });
    console.log(`\n✅ Created game directory: ${gameDir}`);
    return gameDir;
  } catch (error) {
    if (error.code === 'EEXIST') {
      console.log(`\nℹ️  Game directory already exists: ${gameDir}`);
      return gameDir;
    }
    console.error('Error creating game directory:', error);
    throw error;
  }
};

const addGame = async () => {
  try {
    console.log('🎮 Add a New Game to the Platform\n');
    await connectDB();

    // Get game details
    const name = await question('Enter game name (URL-friendly, lowercase, no spaces): ');
    const displayName = await question('Enter display name: ');
    const description = await question('Enter game description: ');
    const category = await question('Enter game category: ');
    const tagsInput = await question('Enter tags (comma-separated): ');
    const tags = tagsInput.split(',').map(tag => tag.trim());
    
    // Create game folder
    const gameDir = await createGameFolder(name);
    
    // Handle game icon
    let iconUrl = '';
    while (true) {
      const iconPath = await question('\nEnter the full path to the game icon (or press Enter to skip): ');
      
      if (!iconPath || iconPath.trim() === '') {
        iconUrl = `/${name}/assets/icon.png`; // Default path
        console.log('ℹ️  Using default icon path. You can add an icon later.');
        break;
      }
      
      try {
        iconUrl = await uploadImage(iconPath.trim(), 'game-icons');
        console.log('✅ Icon uploaded successfully!');
        break;
      } catch (error) {
        console.error('❌ Error uploading image. Please try again or press Enter to skip.');
      }
    }

    const gameData = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      displayName: displayName || name,
      description: description || 'A fun game!',
      thumbnail: iconUrl,
      path: `/${name}`,
      category: category || 'uncategorized',
      tags: tags.length ? tags : ['game'],
      version: '1.0.0',
      config: {
        hasScores: true,
        supportsMultiplayer: false,
        requiresFullscreen: false
      },
      meta: {
        title: `${displayName || name} - Game`,
        description: description || 'A fun game to play!',
        keywords: [...tags, 'game', 'online']
      },
      creator: {
        name: 'Game Developer',
        url: 'https://example.com'
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

    console.log('\n=== 🎉 Game Added Successfully! ===');
    console.log('Game Name:', game.displayName);
    console.log('Game ID:', game._id);
    console.log('Game URL:', `http://localhost:${process.env.PORT || 5000}/games/${game.name}`);
    console.log('Game API URL:', `http://localhost:${process.env.PORT || 5000}${game.url}`);
    
    process.exit(0);
  } catch (error) {
    console.error('Error adding game:', error);
    process.exit(1);
  }
};