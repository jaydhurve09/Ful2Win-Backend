import express from 'express';
const router = express.Router();
import { 
  gameScore, 
  MyScore, 
  getScore, 
  PlayedTournaments 
} from '../controllers/gameScoreController.js';

// Submit a new score or update existing score
router.post('/submit-score', gameScore);

// Get user's score
router.post('/myscore', MyScore);

// Get scores for a specific room/game
router.get('/get-score', getScore);

// Get played tournaments
router.post('/display', PlayedTournaments);

// 404 handler for /api/score/*
router.use((req, res) => {
  console.log(' Unhandled Score Route:', {
    method: req.method,
    url: req.originalUrl,
    path: req.path,
    query: req.query
  });
  res.status(404).json({ 
    success: false, 
    message: 'Route not found',
    path: req.originalUrl 
  });
});

export default router;