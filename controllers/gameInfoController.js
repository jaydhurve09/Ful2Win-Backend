import { GameInfo, GAME_CATEGORIES } from '../models/GameInfo.js';

/**
 * @desc    Get all active games
 * @route   GET /api/games
 * @access  Public
 */
const getAllGames = async (req, res) => {
  try {
    const { category, search, sortBy = 'name', sortOrder = 'asc' } = req.query;
    
    const filter = { isActive: true };
    
    if (category) {
      filter.category = category;
    }
    
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
    
    const games = await GameInfo.find(filter)
      .sort(sort)
      .select('-__v -createdAt -updatedAt');
      
    res.json({
      success: true,
      count: games.length,
      data: games
    });
  } catch (error) {
    console.error('Error getting games:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Get game by name
 * @route   GET /api/games/:name
 * @access  Public
 */
const getGameByName = async (req, res) => {
  try {
    const game = await GameInfo.findOne({
      name: req.params.name,
      isActive: true
    }).select('-__v -createdAt -updatedAt');
    
    if (!game) {
      return res.status(404).json({
        success: false,
        error: 'Game not found'
      });
    }
    
    // Increment play count
    await game.incrementPlays();
    
    res.json({
      success: true,
      data: game
    });
  } catch (error) {
    console.error('Error getting game:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

/**
 * @desc    Get game categories
 * @route   GET /api/games/categories
 * @access  Public
 */
const getGameCategories = async (req, res) => {
  try {
    res.json({
      success: true,
      data: GAME_CATEGORIES
    });
  } catch (error) {
    console.error('Error getting game categories:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

export { getAllGames, getGameByName, getGameCategories };
