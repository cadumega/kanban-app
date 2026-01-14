const express = require('express');
const cors = require('cors');
const db = require('./database/init');

const columnsRouter = require('./routes/columns');
const tasksRouter = require('./routes/tasks');
const categoriesRouter = require('./routes/categories');
const contactsRouter = require('./routes/contacts');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/columns', columnsRouter);
app.use('/api/tasks', tasksRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/contacts', contactsRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Algo deu errado!' });
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
