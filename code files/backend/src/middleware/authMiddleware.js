import jwt from 'jsonwebtoken';

// --------------------------------------------------
// Authentication Middleware
// --------------------------------------------------
//
// Reads the JWT from the HttpOnly hydroToken cookie,
// verifies it, and attaches the authenticated user's
// ID to req.userId.
//
// Protected routes can then use req.userId instead of
// trusting a userId sent by the frontend.
// --------------------------------------------------

const authMiddleware = (req, res, next) => {
  try {
    // Read JWT from HttpOnly cookie
    const token = req.cookies?.hydroToken;

    // No authentication cookie
    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.'
      });
    }

    // Make sure JWT secret exists
    if (!process.env.JWT_SECRET) {
      console.error('JWT_SECRET is not configured.');

      return res.status(500).json({
        success: false,
        message: 'Server configuration error.'
      });
    }

    // Verify token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET
    );

    // Make sure the token contains a valid userId
    if (
      !decoded ||
      typeof decoded !== 'object' ||
      typeof decoded.userId !== 'number'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.'
      });
    }

    // Attach authenticated user's ID to request
    req.userId = decoded.userId;

    // Allow request to continue
    next();
  } catch (error) {
    // Invalid, modified, or expired JWT
    if (
      error.name === 'JsonWebTokenError' ||
      error.name === 'TokenExpiredError' ||
      error.name === 'NotBeforeError'
    ) {
      return res.status(401).json({
        success: false,
        message: 'Invalid or expired authentication token.'
      });
    }

    console.error('Authentication middleware error:', error);

    return res.status(500).json({
      success: false,
      message: 'Authentication failed.'
    });
  }
};

export default authMiddleware;