import express from 'express';
import { authenticate } from '../middleware/auth.js';
import * as mealPlanController from '../controllers/mealPlanController.js';

const router = express.Router();

// Generate a 7-day meal plan
router.post('/generate', authenticate, mealPlanController.generateMealPlan);

// "Can I eat this?" food checker
router.post('/check-food', authenticate, mealPlanController.checkFood);

// Sugar-safe food swaps
router.post('/swap', authenticate, mealPlanController.foodSwaps);

// Weekly grocery list
router.get('/grocery-list', authenticate, mealPlanController.groceryList);

// Get current active meal plan
router.get('/current', authenticate, mealPlanController.getCurrentMealPlan);

// Get meal plan by ID
router.get('/:id', authenticate, mealPlanController.getMealPlanById);

// Get all meal plans for user
router.get('/', authenticate, mealPlanController.getAllMealPlans);

// Update meal plan day
router.put('/:id/days/:dayNumber', authenticate, mealPlanController.updateMealPlanDay);

export default router;
