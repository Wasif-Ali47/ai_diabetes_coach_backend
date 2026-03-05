import express from 'express';
import { body } from 'express-validator';
import * as authController from '../controllers/authController.js';

const router = express.Router();

// Register new user
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }).optional(),
  body('firstName').trim().optional(),
  body('lastName').trim().optional()
], authController.register);

// Login user
router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty()
], authController.login);

// Guest login
router.post('/guest', authController.guestLogin);

// Verify token
router.get('/verify', authController.verifyToken);

export default router;
