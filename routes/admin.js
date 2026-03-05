import express from 'express';
import { verifyAdmin } from '../middleware/adminAuth.js';
import {
  getUsers,
  toggleUserActive,
  getAllMealPlans,
  broadcastNotification,
} from '../controllers/adminController.js';

const router = express.Router();

// All routes below require admin auth
router.use(verifyAdmin);

router.get('/users', getUsers);
router.patch('/users/:id/toggle', toggleUserActive);

router.get('/meal-plans', getAllMealPlans);

router.post('/notifications/broadcast', broadcastNotification);

export default router;

