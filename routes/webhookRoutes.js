import express from 'express';
import { handleWebhook } from '../controllers/webhookController.js';

const router = express.Router();

// Middleware to get raw body for signature verification
const rawBodySaver = (req, res, buf, encoding) => {
  if (buf && buf.length) {
    req.rawBody = buf.toString(encoding || 'utf8');
  }
};

// Apply body parser specifically for webhooks to get raw body
router.post(
  '/razorpay',
  express.json({
    verify: rawBodySaver,
    strict: false // Allow any JSON payload, not just objects and arrays
  }),
  express.raw({
    type: 'application/json',
    verify: rawBodySaver
  }),
  handleWebhook
);

export default router;
