import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import * as reminderController from '../controllers/reminderController.js';

const router = express.Router();

// Create a reminder
router.post('/', authenticate, [
  body('title').trim().notEmpty(),
  body('type').isIn(['medication', 'check', 'meal']),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  body('enabled').isBoolean().optional(),
  body('daysOfWeek').isArray().optional(),
  body('medication').isObject().optional()
], reminderController.createReminder);

// Get all reminders for user
router.get('/', authenticate, reminderController.getAllReminders);

// Get reminder by ID
router.get('/:id', authenticate, reminderController.getReminderById);

// Update reminder
router.put('/:id', authenticate, [
  body('title').trim().optional(),
  body('type').isIn(['medication', 'check', 'meal']).optional(),
  body('time').matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  body('enabled').isBoolean().optional(),
  body('daysOfWeek').isArray().optional(),
  body('medication').isObject().optional()
], reminderController.updateReminder);

// Toggle reminder enabled/disabled
router.patch('/:id/toggle', authenticate, reminderController.toggleReminder);

// Delete reminder
router.delete('/:id', authenticate, reminderController.deleteReminder);

export default router;
