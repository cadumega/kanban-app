const Database = require('better-sqlite3');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

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
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`);

// Create master user if not exists
const masterEmail = 'cadumega@outlook.com';
const masterExists = db.prepare('SELECT id FROM users WHERE email = ?').get(masterEmail);

if (!masterExists) {
  const passwordHash = bcrypt.hashSync('cadu@2026', 10);
  db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role)
    VALUES (?, ?, ?, ?, ?)
  `).run(uuidv4(), masterEmail, passwordHash, 'Carlos', 'master');
  console.log('Master user created: cadumega@outlook.com');
}

module.exports = db;
