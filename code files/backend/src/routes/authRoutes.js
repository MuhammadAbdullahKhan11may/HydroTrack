import rateLimit from 'express-rate-limit';
import express from 'express';

import {
  register,
  login,
  getMe,
  logout
} from '../controllers/authController.js';

import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many authentication attempts. Please try again later.'
  }
});

// POST /api/auth/register
router.post('/register', authLimiter, register);

// POST /api/auth/login
router.post('/login', authLimiter, login);

// GET /api/auth/me
// Protected route - requires valid authentication cookie
router.get('/me', authMiddleware, getMe);

// POST /api/auth/logout
// Protected route - requires valid authentication cookie
router.post('/logout', authMiddleware, logout);

export default router;