const express = require('express');
const cors = require('cors');
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

const app = express();
const PORT = process.env.PORT || 3001;
const isProduction = process.env.NODE_ENV === 'production';

// Migrate master user's database on startup
migrateMasterDb('cadumega@outlook.com');

// Middleware
app.use(cors());
app.use(express.json());

// Public routes (no auth required)
app.use('/api/auth', authRouter);

// Health check (public)
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Middleware to inject user's database for protected routes
const injectUserDb = (req, res, next) => {
  try {
    req.db = getUserDb(req.user.email);
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
  console.error(err.stack);
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
  console.log(`Server running on http://localhost:${PORT}`);
  if (isProduction) {
    console.log('Running in production mode with static file serving');
  }
});
