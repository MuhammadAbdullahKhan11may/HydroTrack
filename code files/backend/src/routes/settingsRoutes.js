import express from 'express';

import {
  getSettings,
  updateSettings
} from '../controllers/settingsController.js';

import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

/* =========================================================
   Settings Routes
   ========================================================= */

// Get authenticated user's settings
router.get('/', authMiddleware, getSettings);
// Update authenticated user's settings
router.put('/', authMiddleware, updateSettings);

export default router;