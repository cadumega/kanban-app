const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cookieParser = require('cookie-parser');
const path = require('path');

const authRouter = require('./routes/auth');
const boardsRouter = require('./routes/boards');
const columnsRouter = require('./routes/columns');
const tasksRouter = require('./routes/tasks');
const categoriesRouter = require('./routes/categories');
const contactsRouter = require('./routes/contacts');
const projectsRouter = require('./routes/projects');
const { authMiddleware } = require('./middleware/auth');
const { getUserDb, migrateMasterDb } = require('./database/userDb');
const logger = require('./config/logger');
const { cors: corsConfig, rateLimit: rateLimitConfig, master: masterConfig, isProduction } = require('./config/security');

const app = express();
const PORT = process.env.PORT || 3001;

// Migrate master user's database on startup (use env var or default for dev)
const masterEmail = masterConfig.email || (isProduction ? null : 'admin@localhost');
if (masterEmail) {
  migrateMasterDb(masterEmail);
}

// Security middleware
app.use(helmet({
  contentSecurityPolicy: isProduction ? undefined : false, // Disable CSP in dev for hot reload
  crossOriginEmbedderPolicy: false // Allow embedding images
}));

// CORS configuration
app.use(cors({
  origin: isProduction ? corsConfig.allowedOrigins : true, // Allow all in dev
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Global rate limiting (all routes)
const globalLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.maxRequests,
  message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

// Cookie parsing (for httpOnly JWT cookies)
app.use(cookieParser());

// Body parsing
app.use(express.json({ limit: '10mb' }));

// Request logging
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (req.path !== '/api/health') { // Don't log health checks
      logger.info(`${req.method} ${req.path}`, {
        status: res.statusCode,
        duration: `${duration}ms`,
        ip: req.ip
      });
    }
  });
  next();
});

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware to inject user's database for protected routes (with delegation support)
const injectUserDb = (req, res, next) => {
  try {
    const usersDb = require('./database/users');

    // Check if user is delegated to another master's workspace
    const user = usersDb.prepare(
      'SELECT delegated_to, name FROM users WHERE id = ?'
    ).get(req.user.id);

    // Use delegated workspace or own workspace
    const workspaceEmail = user?.delegated_to || req.user.email;
    req.db = getUserDb(workspaceEmail);

    // Store acting user info for audit logging
    req.actingUser = {
      id: req.user.id,
      email: req.user.email,
      name: user?.name || req.user.email
    };
    req.workspaceOwner = workspaceEmail;

    next();
  } catch (error) {
    console.error('Error getting user database:', error);
    res.status(500).json({ error: 'Erro ao acessar banco de dados' });
  }
};

// Protected routes (require auth)
app.use('/api/boards', authMiddleware, injectUserDb, boardsRouter);
app.use('/api/columns', authMiddleware, injectUserDb, columnsRouter);
app.use('/api/tasks', authMiddleware, injectUserDb, tasksRouter);
app.use('/api/categories', authMiddleware, injectUserDb, categoriesRouter);
app.use('/api/contacts', authMiddleware, injectUserDb, contactsRouter);
app.use('/api/projects', authMiddleware, injectUserDb, projectsRouter);

// Error handling for API routes
app.use('/api', (err, req, res, next) => {
  logger.error('Unhandled error', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });
  res.status(500).json({ error: 'Algo deu errado!' });
});

// Serve static files in production
if (isProduction) {
  const publicPath = path.join(__dirname, '../public');
  app.use(express.static(publicPath));

  // Handle client-side routing - serve index.html for all non-API routes
  app.get('*', (req, res) => {
    res.sendFile(path.join(publicPath, 'index.html'));
  });
}

app.listen(PORT, () => {
  logger.info(`Server started on port ${PORT}`, {
    environment: isProduction ? 'production' : 'development',
    nodeVersion: process.version
  });
});
