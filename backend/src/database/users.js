const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const { master: masterConfig, isProduction } = require('../config/security');

const dbPath = path.join(__dirname, '../../data/users.db');
const db = new Database(dbPath);

// Create users table
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT,
    role TEXT DEFAULT 'user' CHECK(role IN ('master', 'user')),
    active INTEGER DEFAULT 1,
    delegated_to TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

// Migration: Add delegated_to column if not exists
try {
  const tableInfo = db.prepare("PRAGMA table_info(users)").all();
  const hasDelegatedTo = tableInfo.some(col => col.name === 'delegated_to');
  if (!hasDelegatedTo) {
    db.exec('ALTER TABLE users ADD COLUMN delegated_to TEXT DEFAULT NULL');
    logger.info('Migration: Added delegated_to column to users table');
  }
} catch (err) {
  // Column might already exist
}

// Create master user if not exists (using environment variables)
const createMasterUser = () => {
  // In production, require environment variables
  if (isProduction && (!masterConfig.email || !masterConfig.password)) {
    logger.error('Master user credentials not configured. Set MASTER_EMAIL and MASTER_PASSWORD.');
    return;
  }

  // Use environment variables or fallback for development only
  const masterEmail = masterConfig.email || (isProduction ? null : 'admin@localhost');
  const masterPassword = masterConfig.password || (isProduction ? null : 'change-me-immediately');
  const masterName = masterConfig.name || 'Admin';

  if (!masterEmail || !masterPassword) {
    logger.warn('Skipping master user creation - no credentials provided');
    return;
  }

  const masterExists = db.prepare('SELECT id FROM users WHERE email = ?').get(masterEmail);

  if (!masterExists) {
    const passwordHash = bcrypt.hashSync(masterPassword, 10);
    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, ?)
    `).run(uuidv4(), masterEmail, passwordHash, masterName, 'master');
    logger.info('Master user created', { email: masterEmail });

    if (!isProduction) {
      logger.warn('Using default master credentials - CHANGE IMMEDIATELY in production!');
    }
  }
};

createMasterUser();

module.exports = db;
