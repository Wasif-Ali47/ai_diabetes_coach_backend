import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import * as chatController from '../controllers/chatController.js';

const router = express.Router();

// Send a message and get AI response
router.post('/message', authenticate, [
  body('message').trim().notEmpty()
], chatController.sendMessage);

// Get chat history
router.get('/history', authenticate, chatController.getChatHistory);

// Clear chat history
router.delete('/history', authenticate, chatController.clearChatHistory);

export default router;
