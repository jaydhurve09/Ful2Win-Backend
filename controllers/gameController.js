import { Game, GAME_TYPES } from '../models/Game.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

// Get all games
const getAllGames = async (req, res) => {
  try {
    const { category, search, sortBy = 'name', sortOrder = 'asc' } = req.query;
    const filter = { isActive: true };
    if (category) filter.category = category;
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { displayName: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }
    const sort = {};
    sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
    const games = await GameMetadata.find(filter)
      .sort(sort)
      .select('-__v -createdAt -updatedAt');
    res.json({ success: true, count: games.length, data: games });
  } catch (error) {
    console.error('Error getting games:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get game by name or ID
const getGameInfo = async (req, res) => {
  try {
    const { nameOrId } = req.params;
    
    // Check if the parameter is a valid ObjectId (24 char hex string)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(nameOrId);
    
    let query;
    if (isObjectId) {
      query = { _id: nameOrId };
    } else {
      query = { name: nameOrId.toLowerCase() };
    }
    
    // First get the game without populating leaderboard
    const game = await Game.findOne({
      ...query,
      'status.isActive': true
    })
    .select('-__v -createdAt -updatedAt -moderators -community.forumThreads -chatRooms')
    .populate('creator', 'username avatar')
    .lean();
    
    // If you need to populate leaderboard later, you can do it here
    // For now, we'll skip it to avoid the schema error
    
    if (!game) {
      return res.status(404).json({ 
        success: false, 
        message: 'Game not found or inactive' 
      });
    }
    
    // Add full URL for thumbnail and cover image if they exist
    if (game.assets?.thumbnail && !game.assets.thumbnail.startsWith('http')) {
      game.assets.thumbnail = `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${game.assets.thumbnail}`;
    }
    
    if (game.assets?.coverImage && !game.assets.coverImage.startsWith('http')) {
      game.assets.coverImage = `${process.env.BASE_URL || 'http://localhost:5000'}/uploads/${game.assets.coverImage}`;
    }
    
    res.json({ 
      success: true, 
      data: game 
    });
    
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to fetch game information',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get game categories and types
const getGameCategories = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      data: {
        types: GAME_TYPES,
        // Add any other category/type data needed by the frontend
      }
    });
  } catch (error) {
    console.error('Error getting game categories:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

// Start a new game session
const startGameSession = async (req, res) => {
  try {
    const { gameName } = req.params;
    const { player = 'anonymous', duration = 60, data = {} } = req.body;
    const game = await GameMetadata.findOne({ name: gameName, isActive: true });
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    const session = new GameSession({
      game: game._id,
      player,
      duration,
      data,
      status: 'in-progress'
    });
    await session.save();
    await game.incrementPlays();
    res.status(201).json({
      success: true,
      message: 'Game session started',
      sessionId: session._id,
      game: { id: game._id, name: game.name, displayName: game.displayName }
    });
  } catch (error) {
    console.error('Error starting game session:', error);
    res.status(500).json({ success: false, error: 'Failed to start game session' });
  }
};

// End a game session and save score
const endGameSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { score, duration, data = {} } = req.body;
    const session = await GameSession.findOneAndUpdate(
      { _id: sessionId, status: 'in-progress' },
      {
        $set: {
          score: score || 0,
          duration: duration || 0,
          data: { ...session.data, ...data },
          status: 'completed',
          endedAt: new Date()
        }
      },
      { new: true }
    );
    if (!session) {
      return res.status(404).json({ success: false, error: 'Game session not found or already completed' });
    }
    res.json({
      success: true,
      message: 'Game session ended',
      sessionId: session._id,
      score: session.score,
      duration: session.duration
    });
  } catch (error) {
    console.error('Error ending game session:', error);
    res.status(500).json({ success: false, error: 'Failed to end game session' });
  }
};

// Get game session details
const getGameSession = async (req, res) => {
  try {
    const session = await GameSession.findById(req.params.sessionId)
      .populate('game', 'name displayName')
      .select('-__v -updatedAt');
    if (!session) {
      return res.status(404).json({ success: false, error: 'Game session not found' });
    }
    res.json({
      success: true,
      data: {
        sessionId: session._id,
        game: session.game,
        player: session.player,
        score: session.score,
        duration: session.duration,
        status: session.status,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        data: session.data
      }
    });
  } catch (error) {
    console.error('Error getting game session:', error);
    res.status(500).json({ success: false, error: 'Failed to get game session' });
  }
};

// Helper function to upload file to Cloudinary
const uploadToCloudinary = async (file) => {
  if (!file) return null;
  
  try {
    // Convert buffer to base64
    const b64 = Buffer.from(file.buffer).toString('base64');
    const dataURI = `data:${file.mimetype};base64,${b64}`;
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(dataURI, {
      folder: 'ful2win/games',
      resource_type: 'auto',
      quality: 'auto',
      fetch_format: 'auto'
    });
    
    return result.secure_url;
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return null;
  }
};

// Add or update a game (with file upload)
const addGame = async (req, res) => {
  try {
    // Upload files to Cloudinary
    const [thumbnailUrl, coverImageUrl] = await Promise.all([
      req.files?.thumbnail?.[0] ? uploadToCloudinary(req.files.thumbnail[0]) : null,
      req.files?.coverImage?.[0] ? uploadToCloudinary(req.files.coverImage[0]) : null
    ]);

    // Parse JSON fields
    const gameData = {
      ...req.body,
      assets: {
        ...(req.body.assets ? JSON.parse(req.body.assets) : {}),
        ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
        ...(coverImageUrl && { coverImage: coverImageUrl })
      },
      ...(req.body.config && { config: JSON.parse(req.body.config) }),
      ...(req.body.rules && { rules: JSON.parse(req.body.rules) }),
      ...(req.body.creator && { creator: JSON.parse(req.body.creator) })
    };

    const {
      name,
      displayName,
      description = '',
      type = 'Arcade',
      modesAvailable = [],
      assets = {},
      config = {},
      rules = {}
    } = gameData;

    // Required field validation
    if (!name || !displayName) {
      return res.status(400).json({ 
        success: false,
        message: 'Name and displayName are required' 
      });
    }

    // Create new game object
    const newGame = new Game({
      name,
      displayName,
      description,
      type,
      modesAvailable,
      assets: {
        ...assets,
        ...(thumbnailUrl && { thumbnail: thumbnailUrl }),
        ...(coverImageUrl && { coverImage: coverImageUrl }),
        gameUrl: {
          baseUrl: req.body.baseUrl || 'http://localhost:3000', // Default URL or from request
          iframePath: `/games/${name}`
        }
      },
      config: config || {},
      rules: rules || {},
      creator: req.user?.id || new mongoose.Types.ObjectId() // Use user ID or generate a new one
    });

    // Save the game to database
    const savedGame = await newGame.save();

    res.status(201).json({
      success: true,
      data: {
        game: savedGame
      }
    });
  } catch (error) {
    console.error('Error adding game:', error);
    
    // Handle duplicate key error
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'A game with this name already exists'
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(val => val.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        errors: messages
      });
    }

    // Handle other errors
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Submit score for match-based games (e.g. Subway Surfer, Whack A Mole)
const submitScore = async (req, res) => {
  try {
    const { match_id, player_id, player_name, score, game } = req.body;
    
    console.log('submitScore called with:', { match_id, player_id, player_name, score, game });
    
    // Validate required fields
    if (!match_id || !player_id || typeof score !== 'number') {
      const error = 'Missing required fields: ' + 
        (!match_id ? 'match_id ' : '') + 
        (!player_id ? 'player_id ' : '') + 
        (typeof score !== 'number' ? 'score' : '');
      
      console.error('Validation error:', error);
      return res.status(400).json({ 
        success: false, 
        error: error.trim() 
      });
    }
    
    // If player_name is not provided, try to get it from the database
    let finalPlayerName = player_name;
    if (!finalPlayerName) {
      try {
        const user = await User.findById(player_id).select('name username').lean();
        if (user) {
          finalPlayerName = user.name || user.username || `Player-${player_id.substring(0, 6)}`;
          console.log(`Fetched player name from database: ${finalPlayerName}`);
        } else {
          finalPlayerName = `Player-${player_id.substring(0, 6)}`;
          console.log(`Using generated player name: ${finalPlayerName}`);
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        finalPlayerName = `Player-${player_id.substring(0, 6)}`;
        console.log(`Fallback to generated player name: ${finalPlayerName}`);
      }
    }
    
    let match = await Match.findOne({ match_id });
    
    if (!match) {
      // If match doesn't exist, create it with player info
      match = new Match({
        match_id,
        game: game || 'unknown',
        entry_fee: 0,
        players: [{
          player_id: player_id,
          player_name: finalPlayerName,
          score: score
        }],
        status: 'waiting',
        winner: {
          player_id: null,
          player_name: null
        }
      });
      await match.save();
      return res.json({ 
        success: true, 
        message: 'Score submitted, waiting for opponent.',
        matchId: match_id
      });
    }
    
    // Update existing player score or add new player
    console.log('Current players in match:', match.players);
    
    // Convert both IDs to strings for comparison to avoid type mismatches
    const playerIdStr = String(player_id);
    const playerIndex = match.players.findIndex(p => String(p.player_id) === String(player_id));
    
    if (playerIndex !== -1) {
      // Update existing player's score
      match.players[playerIndex].score = score;
      // Update player name in case it was missing before
      if (!match.players[playerIndex].player_name) {
        match.players[playerIndex].player_name = finalPlayerName;
      }
      console.log(`Updated score for existing player ${player_id} to ${score}`);
    } else {
      // Add new player
      match.players.push({
        player_id: player_id,
        player_name: finalPlayerName,
        score: score
      });
      console.log(`Added new player ${player_id} with score ${score}`);
    }
    // If we have 2 players, mark as active
    if (match.players.length === 2) {
      match.status = 'active';
    }
    
    // If both players have submitted scores, determine winner
    if (match.players.length === 2 && match.players.every(p => typeof p.score === 'number')) {
      const [p1, p2] = match.players;
      let winner = null;
      
      if (p1.score > p2.score) {
        winner = { 
          player_id: p1.player_id, 
          player_name: p1.player_name 
        };
      } else if (p2.score > p1.score) {
        winner = { 
          player_id: p2.player_id, 
          player_name: p2.player_name 
        };
      }
      // else it's a tie, winner remains null
      
      match.winner = winner;
      match.status = 'completed';
      
      // Update winner's balance if there is a winner
      if (winner && winner.player_id) {
        const user = await User.findOne({ _id: winner.player_id });
        if (user) {
          user.Balance += match.entry_fee * 2; // Winner takes all
          await user.save();
        }
      }
      
      await match.save();
      
      // Prepare response with detailed winner information
      const currentPlayer = match.players.find(p => String(p.player_id) === String(player_id));
      const opponent = match.players.find(p => String(p.player_id) !== String(player_id));
      
      const response = {
        success: true,
        message: 'Match completed',
        isDraw: !winner,
        winner: winner ? {
          player_id: winner.player_id,
          player_name: winner.player_name,
          score: winner.player_id === match.players[0].player_id ? match.players[0].score : match.players[1].score
        } : null,
        currentPlayer: {
          score: currentPlayer.score,
          isWinner: winner ? String(winner.player_id) === String(player_id) : false
        },
        opponent: opponent ? {
          player_id: opponent.player_id,
          player_name: opponent.player_name,
          score: opponent.score
        } : null,
        match
      };
      
      return res.json(response);
    } else {
      await match.save();
      return res.json({ 
        success: true, 
        message: 'Score submitted, waiting for opponent.', 
        matchId: match_id 
      });
    }
  } catch (error) {
    console.error('Error in submitScore:', error);
    return res.status(500).json({ 
      success: false, 
      error: 'Failed to submit score', 
      details: error.message 
    });
  }
};

// Create a new match for Whack A Mole or any game
const createMatch = async (req, res) => {
  try {
    console.log('createMatch called with body:', req.body);
    console.log('Request body:', req.body);
    
    const { game, entry_fee, player1_id, player1_name } = req.body;
    
    console.log('Extracted fields:', { game, entry_fee, player1_id, player1_name });
    
    if (!game || typeof entry_fee === 'undefined' || !player1_id || !player1_name) {
      const error = 'Missing required fields: ' + 
        (!game ? 'game ' : '') + 
        (typeof entry_fee === 'undefined' ? 'entry_fee ' : '') + 
        (!player1_id ? 'player1_id ' : '') + 
        (!player1_name ? 'player1_name' : '');
      
      console.error('Validation error:', error);
      return res.status(400).json({ 
        success: false, 
        error: error.trim() 
      });
    }
    
    // Generate unique match_id
    const match_id = (game.substring(0,2).toUpperCase() || 'XX') + Date.now();
    
    // Create match with player info
    const matchData = {
      match_id,
      game,
      entry_fee,
      players: [{
        player_id: player1_id,
        player_name: player1_name,
        score: null
      }],
      status: 'waiting',
      winner: { 
        player_id: null, 
        player_name: null 
      }
    };
    
    console.log('Creating match with data:', JSON.stringify(matchData, null, 2));
    
    const match = await Match.create(matchData);
    console.log('Match created successfully:', match);
    
    console.log('Match created:', match);
    res.json({ success: true, match });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// Update an existing game
const updateGame = async (req, res) => {
  try {
    const { nameOrId } = req.params;
    const updateData = req.body;
    const files = req.files;

    // Check if the parameter is a valid ObjectId (24 char hex string)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(nameOrId);
    
    let query;
    if (isObjectId) {
      query = { _id: nameOrId };
    } else {
      query = { name: nameOrId.toLowerCase() };
    }

    // Find the existing game
    const existingGame = await Game.findOne(query);
    if (!existingGame) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Handle file uploads if any
    if (files) {
      if (files.thumbnail) {
        const thumbnailResult = await uploadToCloudinary(files.thumbnail[0]);
        updateData['assets.thumbnail'] = thumbnailResult.secure_url;
      }
      if (files.coverImage) {
        const coverImageResult = await uploadToCloudinary(files.coverImage[0]);
        updateData['assets.coverImage'] = coverImageResult.secure_url;
      }
    }

    // Update game data
    const updatedGame = await Game.findOneAndUpdate(
      query,
      { $set: updateData },
      { new: true, runValidators: true }
    )
    .select('-__v -createdAt -updatedAt -moderators -community.forumThreads -chatRooms')
    .populate('creator', 'username avatar');

    res.json({
      success: true,
      message: 'Game updated successfully',
      data: updatedGame
    });

  } catch (error) {
    console.error('Error updating game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update game',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete a game
const deleteGame = async (req, res) => {
  try {
    const { nameOrId } = req.params;

    // Check if the parameter is a valid ObjectId (24 char hex string)
    const isObjectId = /^[0-9a-fA-F]{24}$/.test(nameOrId);
    
    let query;
    if (isObjectId) {
      query = { _id: nameOrId };
    } else {
      query = { name: nameOrId.toLowerCase() };
    }

    // Find and delete the game
    const deletedGame = await Game.findOneAndDelete(query);
    
    if (!deletedGame) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // TODO: Optionally delete associated files from Cloudinary
    // if (deletedGame.assets?.thumbnail) {
    //   await deleteFromCloudinary(deletedGame.assets.thumbnail);
    // }
    // if (deletedGame.assets?.coverImage) {
    //   await deleteFromCloudinary(deletedGame.assets.coverImage);
    // }

    res.json({
      success: true,
      message: 'Game deleted successfully',
      data: {
        id: deletedGame._id,
        name: deletedGame.name,
        displayName: deletedGame.displayName
      }
    });

  } catch (error) {
    console.error('Error deleting game:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete game',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export {
  getAllGames,
  getGameInfo,
  getGameCategories,
  startGameSession,
  endGameSession,
  getGameSession,
  addGame,
  updateGame,
  deleteGame,
  submitScore,
  createMatch
};
