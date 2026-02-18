/**
 * Security Configuration
 * Centralized security settings for the application
 */

// Validate required environment variables in production
const isProduction = process.env.NODE_ENV === 'production';

// JWT Configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (isProduction && !JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is required in production!');
  process.exit(1);
}

// Master User Configuration
const MASTER_EMAIL = process.env.MASTER_EMAIL;
const MASTER_PASSWORD = process.env.MASTER_PASSWORD;
const MASTER_NAME = process.env.MASTER_NAME || 'Admin';

if (isProduction && (!MASTER_EMAIL || !MASTER_PASSWORD)) {
  console.error('FATAL: MASTER_EMAIL and MASTER_PASSWORD are required in production!');
  process.exit(1);
}

// CORS Configuration
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
  : ['http://localhost:5173', 'http://localhost:3000'];

// Rate Limiting Configuration
const RATE_LIMIT_WINDOW_MS = parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000; // 15 minutes
const RATE_LIMIT_MAX_REQUESTS = parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100;
const LOGIN_RATE_LIMIT_MAX = parseInt(process.env.LOGIN_RATE_LIMIT_MAX) || 5; // 5 attempts per window

module.exports = {
  jwt: {
    secret: JWT_SECRET || 'dev-only-secret-change-in-production',
    expiresIn: JWT_EXPIRES_IN
  },
  master: {
    email: MASTER_EMAIL,
    password: MASTER_PASSWORD,
    name: MASTER_NAME
  },
  cors: {
    allowedOrigins: ALLOWED_ORIGINS
  },
  rateLimit: {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxRequests: RATE_LIMIT_MAX_REQUESTS,
    loginMaxAttempts: LOGIN_RATE_LIMIT_MAX
  },
  isProduction
};
