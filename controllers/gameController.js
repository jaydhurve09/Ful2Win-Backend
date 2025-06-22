import { GameMetadata, GameSession, GAME_CATEGORIES } from '../models/Game.js';
import Match from '../models/Match.js';
import User from '../models/User.js';
import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'url';

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

// Get game by name
const getGameByName = async (req, res) => {
  try {
    const game = await GameMetadata.findOne({
      name: req.params.name,
      isActive: true
    }).select('-__v -createdAt -updatedAt');
    if (!game) {
      return res.status(404).json({ success: false, error: 'Game not found' });
    }
    await game.incrementPlays();
    res.json({ success: true, data: game });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({ success: false, error: 'Server error' });
  }
};

// Get game categories
const getGameCategories = async (req, res) => {
  try {
    res.json({ success: true, data: GAME_CATEGORIES });
  } catch (error) {
    console.error('Error getting game categories:', error);
    res.status(500).json({ success: false, error: 'Server error' });
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

// Add or update a game (with file upload)
const addGame = async (req, res) => {
  try {
    console.log('req.body:', req.body);
    console.log('req.files:', req.files);
    console.log('req.headers:', req.headers);

    // Defensive destructuring
    const {
      name,
      displayName,
      description = '',
      category = 'uncategorized',
      tags = '[]',
      version = '1.0.0',
      config = '{}',
      meta = '{}',
      creator = '{}'
    } = req.body || {};

    // Required field validation
    if (!name || !displayName) {
      return res.status(400).json({ error: 'Name and displayName are required in form-data.' });
    }

    // Parse JSON strings
    let tagsArray;
    let configObj;
    let metaObj;
    let creatorObj;
    try {
      tagsArray = JSON.parse(tags);
      configObj = JSON.parse(config);
      metaObj = JSON.parse(meta);
      creatorObj = JSON.parse(creator);
    } catch (parseError) {
      console.error('Error parsing JSON fields:', parseError);
      return res.status(400).json({ error: 'Invalid JSON in one of the fields', details: parseError.message });
    }
    // Handle file uploads
    let thumbnailUrl = '';
    if (req.files?.icon) {
      const iconFile = req.files.icon;
      try {
        const uploadResult = await cloudinary.uploader.upload(iconFile.tempFilePath, {
          folder: 'game-icons'
        });
        thumbnailUrl = uploadResult.secure_url;
      } catch (uploadError) {
        console.error('Error uploading icon:', uploadError);
        return res.status(500).json({ error: 'Failed to upload game icon', details: uploadError.message });
      }
    }
    // Handle game folder upload
    let gamePath = '';
    if (req.files?.gameFolder) {
      const gameFolder = req.files.gameFolder;
      const gameDir = path.join(__dirname, '..', 'games', name);
      await fs.mkdir(gameDir, { recursive: true });
      const targetPath = path.join(gameDir, gameFolder.name);
      await fs.rename(gameFolder.tempFilePath, targetPath);
      // If it's a zip file, you might want to extract it here
      // For now, we'll assume it's already the game files
      gamePath = `/${name}`;
    }
    // Create game data
    const gameData = {
      name: name.toLowerCase().replace(/\s+/g, '-'),
      displayName,
      description: description || 'A fun game!',
      thumbnail: thumbnailUrl || `/${name}/assets/icon.png`,
      path: gamePath || `/${name}`,
      category: category || 'uncategorized',
      tags: Array.isArray(tagsArray) ? tagsArray : [tagsArray],
      version,
      config: {
        hasScores: true,
        supportsMultiplayer: false,
        requiresFullscreen: false,
        ...configObj
      },
      meta: {
        title: metaObj.title || `${displayName} - Game`,
        description: metaObj.description || 'A fun game to play!',
        keywords: metaObj.keywords || ['game', 'online'],
        ...metaObj
      },
      creator: {
        name: creatorObj.name || 'Game Developer',
        url: creatorObj.url || 'https://example.com',
        ...creatorObj
      }
    };
    // Check if game exists
    let game = await GameMetadata.findOne({ name: gameData.name });
    if (game) {
      // Update existing game
      game = await GameMetadata.findOneAndUpdate(
        { name: gameData.name },
        { $set: gameData },
        { new: true }
      );
      return res.status(200).json({ message: 'Game updated successfully', game });
    } else {
      // Create new game
      game = new GameMetadata(gameData);
      await game.save();
      return res.status(201).json({ message: 'Game created successfully', game });
    }
  } catch (error) {
    console.error('Error adding/updating game:', error);
    return res.status(500).json({ error: 'Failed to add/update game', details: error.message });
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
      return res.json({ 
        success: true, 
        message: 'Match completed', 
        winner: winner ? winner.name : 'Draw',
        match 
      });
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

export {
  getAllGames,
  getGameByName,
  getGameCategories,
  startGameSession,
  endGameSession,
  getGameSession,
  addGame,
  submitScore,
  createMatch
};
