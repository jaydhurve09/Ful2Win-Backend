import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  createTournament,
  getTournaments,
  getTournamentById,
  updateTournament,
  deleteTournament,
  registerPlayer,
  getTournamentLeaderboard,
  updateStatus
} from '../controllers/tournamentController.js';
import { getCloudinaryStatus } from '../config/cloudinary.js';

const router = express.Router();

// Get directory name for file uploads
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import fs module for directory operations
import fs from 'fs';

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../uploads/tournaments');
fs.mkdirSync(uploadsDir, { recursive: true });

// Configure multer for file uploads
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: function (req, file, cb) {
    const filetypes = /jpeg|jpg|png|gif/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    
    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files are allowed (jpeg, jpg, png, gif)'));
  }
});

// Create a new tournament with optional banner image
router.post('/', 
  upload.single('bannerImage'),
  createTournament
);

// Get all tournaments (with optional filtering)
router.get('/', getTournaments);

// Get tournaments for the logged-in user (history)
import { protect } from '../middleware/authMiddleware.js';
import Tournament from '../models/Tournament.js';

router.get('/my', protect, async (req, res) => {
  try {
    console.log('DEBUG /api/tournaments/my req.user:', req.user);
    const userId = req.user?._id || req.user?.id;
    if (!userId) {
      console.error('No userId found on req.user:', req.user);
      return res.status(401).json({ message: 'User not authenticated' });
    }
    console.log('DEBUG /api/tournaments/my userId:', userId);
    // Fetch tournaments where currentPlayers array includes this user and populate game name
    const tournaments = await Tournament.find({ currentPlayers: userId })
      .populate('game', 'name');
    console.log('DEBUG /api/tournaments/my found tournaments:', tournaments.length);
    // Replace game field with its name for frontend simplicity
    const formatted = tournaments.map(t => {
      const obj = t.toObject();
      obj.game = t.game?.name || t.game; // ensure string
      return obj;
    });
    res.json({ data: formatted });
  } catch (error) {
    console.error('Error fetching user tournament history:', error.stack || error);
    res.status(500).json({ message: 'Failed to fetch tournament history', error: error.message });
  }
});

// Get tournament by ID
router.get('/:id', getTournamentById);

// Update tournament with optional banner image
router.put('/:id', 
  upload.single('bannerImage'),
  updateTournament
);

// Delete tournament
router.delete('/:id', deleteTournament);

// Register player for tournament
router.post('/:tournamentId/register', registerPlayer);
router.put('/:tournamentId/status', updateStatus);

// Get leaderboard for a tournament
router.get('/:tournamentId/leaderboard', getTournamentLeaderboard);

// Test route to check Cloudinary status
router.get('/test/cloudinary', (req, res) => {
  const isConfigured = getCloudinaryStatus();
  res.json({
    cloudinaryConfigured: isConfigured,
    environment: process.env.NODE_ENV || 'development',
    envVars: {
      CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME ? 'Set' : 'Not set',
      CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY ? 'Set' : 'Not set',
      CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET ? 'Set' : 'Not set',
      CLOUDINARY_SECRET_KEY: process.env.CLOUDINARY_SECRET_KEY ? 'Set' : 'Not set',
      CLOUDINARY_NAME: process.env.CLOUDINARY_NAME ? 'Set' : 'Not set',
      CLOUDINARY_KEY: process.env.CLOUDINARY_KEY ? 'Set' : 'Not set'
    }
  });
});

export default router;
