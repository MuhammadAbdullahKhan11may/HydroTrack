import bcrypt from 'bcrypt';

import { db } from '../../dist/src/prisma/db.js';

import generateToken from '../utils/generateToken.js';

// --------------------------------------------------
// Helpers
// --------------------------------------------------

const NAME_REGEX = /^[A-Za-z\s'-]+$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PASSWORD_UPPERCASE_REGEX = /[A-Z]/;
const PASSWORD_LOWERCASE_REGEX = /[a-z]/;
const PASSWORD_NUMBER_REGEX = /[0-9]/;
const PASSWORD_SPECIAL_REGEX = /[^A-Za-z0-9]/;

const setAuthCookie = (res, token) => {
  res.cookie('hydroToken', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000
  });
};

// --------------------------------------------------
// Register
// POST /api/auth/register
// --------------------------------------------------

export const register = async (req, res) => {
  try {
    let { name, email, password } = req.body;

    // Make sure all fields exist
    if (
      typeof name !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.'
      });
    }

    // Clean input
    name = name.trim();
    email = email.trim().toLowerCase();

    // -------------------------
    // Name validation
    // -------------------------

    if (name.length < 2 || name.length > 50) {
      return res.status(400).json({
        success: false,
        field: 'name',
        message: 'Name must be between 2 and 50 characters.'
      });
    }

    if (!NAME_REGEX.test(name)) {
      return res.status(400).json({
        success: false,
        field: 'name',
        message:
          'Name can only contain letters, spaces, hyphens, and apostrophes.'
      });
    }

    // -------------------------
    // Email validation
    // -------------------------

    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        field: 'email',
        message: 'Please enter a valid email address.'
      });
    }

    // -------------------------
    // Password validation
    // -------------------------

    if (password.length < 8 || password.length > 64) {
      return res.status(400).json({
        success: false,
        field: 'password',
        message: 'Password must be between 8 and 64 characters.'
      });
    }

    if (/\s/.test(password)) {
      return res.status(400).json({
        success: false,
        field: 'password',
        message: 'Password cannot contain spaces.'
      });
    }

    if (!PASSWORD_UPPERCASE_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        field: 'password',
        message: 'Password must contain at least one uppercase letter.'
      });
    }

    if (!PASSWORD_LOWERCASE_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        field: 'password',
        message: 'Password must contain at least one lowercase letter.'
      });
    }

    if (!PASSWORD_NUMBER_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        field: 'password',
        message: 'Password must contain at least one number.'
      });
    }

    if (!PASSWORD_SPECIAL_REGEX.test(password)) {
      return res.status(400).json({
        success: false,
        field: 'password',
        message: 'Password must contain at least one special character.'
      });
    }

    // -------------------------
    // Duplicate email check
    // -------------------------

    const existingUser = await db.orm.public.User
      .where({ email })
      .first();

    if (existingUser) {
      return res.status(409).json({
        success: false,
        field: 'email',
        message: 'An account with this email already exists.'
      });
    }

    // -------------------------
    // Hash password
    // -------------------------

    const passwordHash = await bcrypt.hash(password, 12);

    // -------------------------
    // Create user + settings
    // -------------------------

    const user = await db.transaction(async (tx) => {
      const newUser = await tx.orm.public.User.create({
        name,
        email,
        passwordHash
      });

      await tx.orm.public.UserSettings.create({
        userId: newUser.id,
        dailyGoal: 2500,
        servingSize: 250,
        measurementUnit: 'ml'
      });

      return newUser;
    });

    // -------------------------
    // Generate JWT
    // -------------------------

    const token = generateToken(user.id);

    setAuthCookie(res, token);

    // -------------------------
    // Safe response
    // -------------------------

    return res.status(201).json({
      success: true,
      message: 'Account created successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Registration error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to create account. Please try again.'
    });
  }
};

// --------------------------------------------------
// Login
// POST /api/auth/login
// --------------------------------------------------

export const login = async (req, res) => {
  try {
    let { email, password } = req.body;

    // Make sure both fields exist
    if (
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required.'
      });
    }

    // Clean email
    email = email.trim().toLowerCase();

    // Basic validation
    if (!EMAIL_REGEX.test(email)) {
      return res.status(400).json({
        success: false,
        field: 'email',
        message: 'Please enter a valid email address.'
      });
    }

    if (password.length === 0) {
      return res.status(400).json({
        success: false,
        field: 'password',
        message: 'Password is required.'
      });
    }

    // -------------------------
    // Find user
    // -------------------------

    const user = await db.orm.public.User
      .where({ email })
      .first();

    // Generic error so we don't reveal
    // whether an email is registered
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password.'
      });
    }

    // -------------------------
    // Compare password
    // -------------------------

    const passwordMatches = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: 'Incorrect email or password.'
      });
    }

    // -------------------------
    // Generate JWT
    // -------------------------

    const token = generateToken(user.id);

    setAuthCookie(res, token);

    // -------------------------
    // Safe response
    // -------------------------

    return res.status(200).json({
      success: true,
      message: 'Signed in successfully.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });

  } catch (error) {
    console.error('Login error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to sign in. Please try again.'
    });
  }
};

// --------------------------------------------------
// Get Current User
// GET /api/auth/me
// --------------------------------------------------

export const getMe = async (req, res) => {
  try {
    // userId comes from authMiddleware,
    // not from the frontend.
    const userId = req.userId;

    // Find authenticated user
    const user = await db.orm.public.User
      .where({ id: userId })
      .first();

    // Token may belong to a user that no longer exists
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.'
      });
    }

    // Never return passwordHash
    return res.status(200).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        createdAt: user.createdAt
      }
    });

  } catch (error) {
    console.error('Get current user error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to retrieve user information.'
    });
  }
};

// --------------------------------------------------
// Logout
// POST /api/auth/logout
// --------------------------------------------------

export const logout = async (req, res) => {
  try {
    // Match the cookie attributes used when creating the cookie.
    res.clearCookie('hydroToken', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/'
    });

    return res.status(200).json({
      success: true,
      message: 'Signed out successfully.'
    });

  } catch (error) {
    console.error('Logout error:', error);

    return res.status(500).json({
      success: false,
      message: 'Unable to sign out. Please try again.'
    });
  }
};