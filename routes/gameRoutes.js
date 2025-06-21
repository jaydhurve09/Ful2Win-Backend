import express from 'express';
import { 
  getAllGames,
  getGameByName,
  getGameCategories,
  startGameSession,
  endGameSession,
  getGameSession,
  addGame,
  submitScore,
  createMatch
} from '../controllers/gameController.js';

const router = express.Router();

router.use(express.urlencoded({ extended: true }));

// Admin routes
router.post('/', addGame);

// Get all games (with optional filtering)
router.get('/', getAllGames);
// Get game categories
router.get('/categories', getGameCategories);
// Get game by name
router.get('/:name', getGameByName);
// Start a new game session for a specific game
router.post('/:gameName/start', startGameSession);

// Game session routes
const sessionRouter = express.Router();
// End a game session and save score
sessionRouter.post('/:sessionId/end', endGameSession);
// Get game session details
sessionRouter.get('/:sessionId', getGameSession);
// Mount session routes
router.use('/sessions', sessionRouter);

// Submit score for match-based games
router.post('/submit-score', submitScore);

// Create a new match for a game
router.post('/create-match', createMatch);

export default router;
