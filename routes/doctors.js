import express from 'express';
import { authenticate, optionalAuth } from '../middleware/auth.js';
import * as doctorController from '../controllers/doctorController.js';

const router = express.Router();

// Get all doctors with optional filters
router.get('/', optionalAuth, doctorController.getAllDoctors);

// Get doctor by ID
router.get('/:id', optionalAuth, doctorController.getDoctorById);

// Search doctors
router.get('/search/:query', optionalAuth, doctorController.searchDoctors);

// Admin: Create doctor (for seeding database)
router.post('/', authenticate, doctorController.createDoctor);

// Seed sample doctors (for development)
router.post('/seed', doctorController.seedDoctors);

export default router;
