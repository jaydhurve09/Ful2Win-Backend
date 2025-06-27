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
  registerPlayer
} from '../controllers/tournamentController.js';

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

export default router;
