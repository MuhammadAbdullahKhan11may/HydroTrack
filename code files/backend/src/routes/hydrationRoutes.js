import express from 'express';

import {
  getTodayHydration,
  saveHydration,
  getHydrationHistory,
  deleteTodayHydration
} from '../controllers/hydrationController.js';

import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/* =========================================================
   Hydration Routes
   ========================================================= */

// Get hydration intake for a specific local date
router.get('/today', authMiddleware, getTodayHydration);

// Get authenticated user's hydration history
router.get('/', authMiddleware, getHydrationHistory);

// Save or update hydration intake
router.post('/', authMiddleware, saveHydration);

// Reset hydration for a specific local date
router.delete('/today', authMiddleware, deleteTodayHydration);

export default router;