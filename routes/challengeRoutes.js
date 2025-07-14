import express from 'express';
import {
  createChallenge,
  getUserChallenges,
  acceptChallenge,
  rejectChallenge,
  cancelChallenge,
  getUsersForChallenge,
  getGamesForChallenge
} from '../controllers/challengeController.js';
import { protect } from '../middleware/authMiddleware.js';

const router = express.Router();

// All routes are protected
router.use(protect);

// Challenge management routes
router.post('/', createChallenge);
router.get('/', getUserChallenges);
router.put('/:id/accept', acceptChallenge);
router.put('/:id/reject', rejectChallenge);
router.put('/:id/cancel', cancelChallenge);

// Data fetching routes for challenge form
router.get('/users', getUsersForChallenge);
router.get('/games', getGamesForChallenge);

export default router; 