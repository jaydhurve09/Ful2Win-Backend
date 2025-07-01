import Tournament from '../models/Tournament.js';
import User from '../models/User.js';
import { Game } from '../models/Game.js';
import { v4 as uuidv4 } from 'uuid';
import { uploadToCloudinary, deleteFromCloudinary, getCloudinaryStatus } from '../config/cloudinary.js';

// Check Cloudinary status
const isCloudinaryAvailable = getCloudinaryStatus();

// Create a new tournament
const createTournament = async (req, res) => {
  try {
    const {
      name,
      type,
      tournamentType = 'coin',
      playerType = 'solo',
      description = '',
      entryFee = 0,
      prizePool = 0,
      startTime,
      endTime,
      maxPlayers = 100,
      gameId,
      modesAvailable = ['Classic'],
      status = 'upcoming'
    } = req.body;

    // Handle banner image upload if present
    let bannerImage = '';
    if (req.file) {
      console.log('File received for upload:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer ? 'Buffer exists' : 'No buffer'
      });

      if (isCloudinaryAvailable) {
        console.log('Cloudinary is available, attempting upload...');
        try {
          // Upload the file buffer directly to Cloudinary
          const result = await uploadToCloudinary(req.file.buffer, 'tournament-banners');
          
          if (!result || (!result.secure_url && !result.url)) {
            throw new Error('Invalid response from Cloudinary: No URL returned');
          }
          
          bannerImage = result.secure_url || result.url;
          console.log('Successfully uploaded to Cloudinary:', bannerImage);
        } catch (uploadError) {
          console.error('Error uploading to Cloudinary:', {
            error: uploadError.message,
            stack: uploadError.stack
          });
          return res.status(500).json({
            success: false,
            message: 'Failed to upload banner image to Cloudinary',
            error: process.env.NODE_ENV === 'development' ? uploadError.message : undefined,
            details: process.env.NODE_ENV === 'development' ? {
              error: uploadError.message,
              stack: uploadError.stack
            } : undefined
          });
        }
      } else {
        console.warn('Cloudinary is not available, using placeholder image');
        bannerImage = 'https://via.placeholder.com/800x300?text=No+Banner+Available';
      }
    }

    // Validate required fields
    if (!name || !type || !startTime || !gameId || !tournamentType || !playerType) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, type, tournamentType, playerType, startTime, and gameId are required'
      });
    }

    // Validate tournament type
    if (!['cash', 'coin'].includes(tournamentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament type. Must be either "cash" or "coin"'
      });
    }

    // Validate player type
    if (!['solo', 'multiplayer', 'teams'].includes(playerType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid player type. Must be one of: "solo", "multiplayer", or "teams"'
      });
    }

    // Check if game exists
    const game = await Game.findById(gameId);
    if (!game) {
      return res.status(404).json({
        success: false,
        message: 'Game not found'
      });
    }

    // Create tournament code
    const tournamentCode = `TN-${uuidv4().substring(0, 8).toUpperCase()}`;

    const tournament = new Tournament({
      name,
      type,
      tournamentType,
      playerType,
      description,
      entryFee,
      prizePool,
      startTime: new Date(startTime),
      endTime: endTime ? new Date(endTime) : null,
      maxPlayers,
      bannerImage,
      game: gameId,
      modesAvailable,
      tournamentCode,
      status,
      currentPlayers: [],
      leaderboard: []
    });

    await tournament.save();

    // Add tournament to game's tournaments array
    game.tournaments.push(tournament._id);
    await game.save();

    res.status(201).json({
      success: true,
      message: 'Tournament created successfully',
      data: tournament
    });

  } catch (error) {
    console.error('Error creating tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create tournament',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get all tournaments with optional filtering
const getTournaments = async (req, res) => {
  try {
    const { status, gameId, type } = req.query;
    const filter = {};

    if (status) filter.status = status;
    if (gameId) filter.game = gameId;
    if (type) filter.type = type;

    const tournaments = await Tournament.find(filter)
      .populate('game', 'name displayName assets.thumbnail')
      .sort({ startTime: 1 });

    res.json({
      success: true,
      count: tournaments.length,
      data: tournaments
    });
  } catch (error) {
    console.error('Error fetching tournaments:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tournaments',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get tournament by ID
const getTournamentById = async (req, res) => {
  try {
    const tournament = await Tournament.findById(req.params.id)
      .populate('game', 'name displayName assets.thumbnail')
      .populate('currentPlayers', 'username avatar')
      .populate('winners.playerId', 'username avatar');

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.json({
      success: true,
      data: tournament
    });
  } catch (error) {
    console.error('Error fetching tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch tournament',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Update tournament
const updateTournament = async (req, res) => {
  try {
    const { id } = req.params;
    let updateData = { ...req.body };

    // Handle banner image upload if present
    if (req.file) {
      console.log('File received for upload:', {
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        buffer: req.file.buffer ? 'Buffer exists' : 'No buffer'
      });

      if (isCloudinaryAvailable) {
        console.log('Cloudinary is available, attempting upload...');
        try {
          // Upload the file buffer directly to Cloudinary
          const result = await uploadToCloudinary(req.file.buffer, 'tournament-banners');
          
          if (!result || (!result.secure_url && !result.url)) {
            throw new Error('Invalid response from Cloudinary: No URL returned');
          }
          
          updateData.bannerImage = result.secure_url || result.url;
          console.log('Successfully uploaded to Cloudinary:', updateData.bannerImage);
        } catch (uploadError) {
          console.error('Error uploading to Cloudinary:', {
            error: uploadError.message,
            stack: uploadError.stack
          });
          return res.status(500).json({
            success: false,
            message: 'Failed to upload banner image to Cloudinary',
            error: process.env.NODE_ENV === 'development' ? uploadError.message : undefined,
            details: process.env.NODE_ENV === 'development' ? {
              error: uploadError.message,
              stack: uploadError.stack
            } : undefined
          });
        }
      } else {
        console.warn('Cloudinary is not available, using placeholder image');
        updateData.bannerImage = 'https://via.placeholder.com/800x300?text=No+Banner+Available';
      }
    }

    // Validate tournament type if being updated
    if (updateData.tournamentType && !['cash', 'coin'].includes(updateData.tournamentType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid tournament type. Must be either "cash" or "coin"'
      });
    }

    // Validate player type if being updated
    if (updateData.playerType && !['solo', 'multiplayer', 'teams'].includes(updateData.playerType)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid player type. Must be one of: "solo", "multiplayer", or "teams"'
      });
    }

    // Remove fields that shouldn't be updated
    const { _id, __v, tournamentCode, ...validUpdate } = updateData;

    // If startTime is being updated, ensure it's a valid date
    if (validUpdate.startTime) {
      validUpdate.startTime = new Date(validUpdate.startTime);
    }
    
    // If endTime is being updated, ensure it's a valid date
    if (validUpdate.endTime) {
      validUpdate.endTime = new Date(validUpdate.endTime);
    }

    const tournament = await Tournament.findByIdAndUpdate(
      id,
      { $set: validUpdate },
      { new: true, runValidators: true }
    );

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    res.json({
      success: true,
      message: 'Tournament updated successfully',
      data: tournament
    });
  } catch (error) {
    console.error('Error updating tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update tournament',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Delete tournament
const deleteTournament = async (req, res) => {
  try {
    const { id } = req.params;

    const tournament = await Tournament.findById(id);

    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Delete banner image from Cloudinary if it exists and Cloudinary is available
    if (isCloudinaryAvailable && tournament.bannerImage && tournament.bannerImage.publicId) {
      try {
        await deleteFromCloudinary(tournament.bannerImage.publicId);
      } catch (error) {
        console.error('Error deleting banner from Cloudinary:', error);
        // Continue with tournament deletion even if image deletion fails
      }
    }

    // Now delete the tournament
    await Tournament.findByIdAndDelete(id);

    // Remove tournament from game's tournaments array
    await Game.updateOne(
      { _id: tournament.game },
      { $pull: { tournaments: tournament._id } }
    );

    res.json({
      success: true,
      message: 'Tournament deleted successfully',
      data: { id: tournament._id, name: tournament.name }
    });
  } catch (error) {
    console.error('Error deleting tournament:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete tournament',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Register player for tournamen// Make sure path is correct

const registerPlayer = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { playerId } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }

    // Only allow registration if tournament is 'upcoming'
    

    // Check if already registered
    if (tournament.currentPlayers.includes(playerId)) {
      return res.status(400).json({ success: false, message: 'Player already registered' });
    }

    // Check if full
    if (tournament.currentPlayers.length >= tournament.maxPlayers) {
      return res.status(400).json({ success: false, message: 'Tournament is full' });
    }

    // Get the player/user
    const user = await User.findById(playerId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if user has enough balance
    if (user.balance < tournament.entryFee) {
      return res.status(400).json({ success: false, message: 'Insufficient balance' });
    }

    // Deduct entry fee
    user.balance -= tournament.entryFee;
    tournament.currentPlayers.push(playerId);

    // Save both
    await Promise.all([user.save(), tournament.save()]);

    return res.json({
      success: true,
      message: 'Player registered successfully',
      data: {
        tournamentId: tournament._id,
        playerId,
        registeredAt: new Date(),
        remainingBalance: user.balance
      }
    });
  } catch (error) {
    console.error('Register player error:', error);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
};

// Get leaderboard for a tournament
const getTournamentLeaderboard = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const tournament = await Tournament.findById(tournamentId);
    if (!tournament) {
      return res.status(404).json({ success: false, message: 'Tournament not found' });
    }
    // Leaderboard is an array of { playerId, username, totalWins, totalGames, winRate, totalCoinsEarned, rank }
    const leaderboard = tournament.leaderboard || [];
    let currentUserRank = null;
    let userId = null;
    if (req.user) {
      userId = req.user._id?.toString() || req.user.id || null;
      if (userId) {
        const index = leaderboard.findIndex(item => (item.playerId?.toString?.() || item.playerId) === userId);
        if (index !== -1) {
          currentUserRank = {
            rank: leaderboard[index].rank || index + 1,
            ...leaderboard[index]
          };
        }
      }
    }
    res.json({
      success: true,
      leaderboard,
      currentUserRank,
      tournamentName: tournament.name,
      bannerImageUrl: tournament.bannerImage || null
    });
  } catch (error) {
    console.error('Error fetching tournament leaderboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch leaderboard', error: error.message });
  }
};

export {
  createTournament,
  getTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  registerPlayer,
  getTournamentLeaderboard
};
