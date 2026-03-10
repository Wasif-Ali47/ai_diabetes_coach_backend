import express from 'express';
import { verifyAdmin } from '../middleware/adminAuth.js';
import {
  getUsers,
  toggleUserActive,
  getAllMealPlans,
  broadcastNotification,
} from '../controllers/adminController.js';

const router = express.Router();

// Debug middleware to log all admin route requests
router.use((req, res, next) => {
  console.log(`[Admin Routes] ${req.method} ${req.path} - Headers:`, {
    authorization: req.headers.authorization ? 'present' : 'missing',
  });
  next();
});

// Test route without auth to verify routing works
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Admin routes are working',
    path: req.path,
    method: req.method,
  });
});

// All routes below require admin auth
router.use(verifyAdmin);

router.get('/users', getUsers);
router.patch('/users/:id/toggle', toggleUserActive);

router.get('/meal-plans', getAllMealPlans);

// Broadcast notification route
router.post('/notifications/broadcast', broadcastNotification);

// Catch-all for debugging - should never reach here if routes are correct
router.use('*', (req, res) => {
  console.log(`[Admin Routes] Unmatched route: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: `Admin route not found: ${req.method} ${req.originalUrl}`,
    availableRoutes: [
      'GET /api/admin/test',
      'GET /api/admin/users',
      'GET /api/admin/meal-plans',
      'POST /api/admin/notifications/broadcast',
    ],
  });
});

export default router;

