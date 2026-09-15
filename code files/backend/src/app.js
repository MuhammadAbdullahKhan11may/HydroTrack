import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import hydrationRoutes from './routes/hydrationRoutes.js';
import settingsRoutes from './routes/settingsRoutes.js';


import { db } from '../dist/src/prisma/db.js';
import authRoutes from './routes/authRoutes.js';

const app = express();
// --------------------------------------------------
// Frontend path
// --------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const frontendPath = path.join(__dirname, '../../frontend');
// Security headers
app.use(helmet());

// Parse JSON request bodies
app.use(express.json({ limit: '10kb' }));

// Parse cookies
app.use(cookieParser());

// Basic API health check
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'HydroTrack API is running'
  });
});

// Database health check
app.get('/api/health/db', async (req, res) => {
  try {
    await db.orm.public.User.all();

    res.status(200).json({
      success: true,
      message: 'HydroTrack database connection is working'
    });
  } catch (error) {
    console.error('Database health check failed:', error);

    res.status(500).json({
      success: false,
      message: 'Database connection failed'
    });
  }
});

// Authentication routes
app.use('/api/auth', authRoutes);
app.use('/api/hydration', hydrationRoutes);
app.use('/api/settings', settingsRoutes);
// --------------------------------------------------
// Serve HydroTrack frontend
// --------------------------------------------------

// --------------------------------------------------
// API 404 handler
// --------------------------------------------------
// Any request that reaches this point under /api
// does not match a valid HydroTrack API endpoint.

app.use('/api', (req, res) => {
  return res.status(404).json({
    success: false,
    message: 'API endpoint not found.'
  });
});

// --------------------------------------------------
// Serve HydroTrack frontend
// --------------------------------------------------

app.use(express.static(frontendPath));

// --------------------------------------------------
// Global error handler
// --------------------------------------------------
// Handles unexpected Express/server errors without
// exposing internal implementation details.

app.use((error, req, res, next) => {
  console.error('Unhandled server error:', error);

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    success: false,
    message: 'An unexpected server error occurred.'
  });
});

export default app;