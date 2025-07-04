import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { sendMessage, getMessages, conversationMessages } from '../controllers/messageController.js';
const router = express.Router();

router.post('/', protect, sendMessage);
// Add conversation route before the param route
router.get('/conversation', protect, conversationMessages);
router.get('/:otherUserId', protect, getMessages);

export default router;
