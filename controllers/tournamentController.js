import Tournament from '../models/Tournament.js';
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
      modesAvailable = ['Classic']
    } = req.body;

    // Handle banner image upload if present
    let bannerImage = {};
    if (req.file) {
      if (isCloudinaryAvailable) {
        try {
          // Upload the file buffer directly to Cloudinary
          const result = await uploadToCloudinary(req.file.buffer, 'tournament-banners');
          bannerImage = {
            url: result.url,
            publicId: result.publicId
          };
        } catch (error) {
          console.error('Error uploading banner to Cloudinary:', error);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload banner image',
            error: process.env.NODE_ENV === 'development' ? error.message : undefined
          });
        }
      } else {
        // If Cloudinary is not available, store a message or use a placeholder
        bannerImage = {
          url: 'https://via.placeholder.com/800x300?text=No+Banner+Available',
          publicId: 'no-banner-available',
          note: 'Cloudinary service not available'
        };
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
      status: 'upcoming',
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
      // First get the current tournament to delete old image if exists
      const currentTournament = await Tournament.findById(id);
      
      if (isCloudinaryAvailable) {
        try {
          // Upload the file buffer directly to Cloudinary
          const result = await uploadToCloudinary(req.file.buffer, 'tournament-banners');
          
          // Delete old image from Cloudinary if it exists
          if (currentTournament.bannerImage && currentTournament.bannerImage.publicId) {
            try {
              await deleteFromCloudinary(currentTournament.bannerImage.publicId);
            } catch (deleteError) {
              console.error('Error deleting old banner from Cloudinary:', deleteError);
              // Continue with the update even if deletion fails
            }
          }
          
          updateData.bannerImage = {
            url: result.url,
            publicId: result.publicId
          };
        } catch (uploadError) {
          console.error('Error uploading new banner to Cloudinary:', uploadError);
          return res.status(500).json({
            success: false,
            message: 'Failed to upload banner image',
            error: process.env.NODE_ENV === 'development' ? uploadError.message : undefined
          });
        }
      } else {
        // If Cloudinary is not available, use a placeholder
        updateData.bannerImage = {
          url: 'https://via.placeholder.com/800x300?text=No+Banner+Available',
          publicId: 'no-banner-available',
          note: 'Cloudinary service not available'
        };
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

// Register player for tournament
const registerPlayer = async (req, res) => {
  try {
    const { tournamentId } = req.params;
    const { playerId } = req.body;

    const tournament = await Tournament.findById(tournamentId);
    
    if (!tournament) {
      return res.status(404).json({
        success: false,
        message: 'Tournament not found'
      });
    }

    // Check if tournament is open for registration
    if (tournament.status !== 'upcoming') {
      return res.status(400).json({
        success: false,
        message: 'Tournament is not open for registration'
      });
    }

    // Check if player is already registered
    if (tournament.currentPlayers.includes(playerId)) {
      return res.status(400).json({
        success: false,
        message: 'Player already registered for this tournament'
      });
    }

    // Check if tournament is full
    if (tournament.currentPlayers.length >= tournament.maxPlayers) {
      return res.status(400).json({
        success: false,
        message: 'Tournament is full'
      });
    }

    // Add player to tournament
    tournament.currentPlayers.push(playerId);
    await tournament.save();

    res.json({
      success: true,
      message: 'Player registered successfully',
      data: {
        tournamentId: tournament._id,
        playerId,
        registeredAt: new Date()
      }
    });
  } catch (error) {
    console.error('Error registering player:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to register player',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export {
  createTournament,
  getTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  registerPlayer
};
