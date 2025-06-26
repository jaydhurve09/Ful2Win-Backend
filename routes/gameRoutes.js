import express from 'express';
import { 
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
} from '../controllers/gameController.js';
import { upload, handleMulterError } from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.use(express.urlencoded({ extended: true }));

// Configure multer for file uploads
const uploadFields = [
  { name: 'thumbnail', maxCount: 1 },
  { name: 'coverImage', maxCount: 1 }
];

// Admin routes - Add new game with file uploads
router.post('/', 
  upload.fields(uploadFields),
  handleMulterError,
  addGame
);

// Update an existing game
router.put('/:nameOrId', 
  upload.fields(uploadFields),
  handleMulterError,
  updateGame
);

// Delete a game
router.delete('/:nameOrId', deleteGame);

// Get all games (with optional filtering)
router.get('/', getAllGames);
// Get game categories
router.get('/categories', getGameCategories);
// Get game by name or ID
router.get('/:nameOrId', getGameInfo);
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
