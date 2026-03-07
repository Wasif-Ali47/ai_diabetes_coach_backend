import express from 'express';
import { body } from 'express-validator';
import { authenticate } from '../middleware/auth.js';
import * as userController from '../controllers/userController.js';

const router = express.Router();

// Get current user profile
router.get('/profile', authenticate, userController.getProfile);

// Update user profile (Personal Info)
router.put('/profile/personal', authenticate, [
  body('firstName').trim().optional(),
  body('lastName').trim().optional(),
  body('email').isEmail().normalizeEmail().optional(),
  body('dateOfBirth').isISO8601().optional(),
  body('biologicalSex').isIn(['Female', 'Male', 'Other']).optional()
], userController.updatePersonalInfo);

// Update body info
router.put('/profile/body', authenticate, [
  body('heightFeet').isInt({ min: 0, max: 8 }).optional(),
  body('heightInches').isInt({ min: 0, max: 11 }).optional(),
  body('weight').isNumeric().optional(),
  body('activityLevel').isIn(['Sedentary', 'Lightly Active', 'Moderately Active', 'Very Active', 'Extremely Active']).optional()
], userController.updateBodyInfo);

// Update health conditions
router.put('/profile/health', authenticate, [
  body('healthConditions').isArray().optional(),
  body('medications').isArray().optional()
], userController.updateHealthConditions);

// Update diet preferences
router.put('/profile/diet', authenticate, [
  body('dietPreferences').isObject().optional()
], userController.updateDietPreferences);

// Update settings
router.put('/settings', authenticate, [
  body('settings').isObject().optional()
], userController.updateSettings);

// Mark onboarding as complete
router.put('/onboarding/complete', authenticate, userController.completeOnboarding);

// Delete user account
router.delete('/account', authenticate, userController.deleteAccount);

export default router;
