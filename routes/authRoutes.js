import express from 'express';
import { forgotPassword, resetPassword } from '../controllers/userController.js';

const router = express.Router();

// Public routes
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);

export default router;
