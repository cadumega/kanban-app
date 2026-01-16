const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const dataDir = path.join(__dirname, '../../data');

// Cache for open database connections
const dbCache = new Map();

// Get or create user database
function getUserDb(userEmail) {
  // Sanitize email for folder name
  const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  const userDir = path.join(dataDir, safeEmail);
  const dbPath = path.join(userDir, 'kanban.db');

  // Return cached connection if exists
  if (dbCache.has(userEmail)) {
    return dbCache.get(userEmail);
  }

  // Create user directory if not exists
  if (!fs.existsSync(userDir)) {
    fs.mkdirSync(userDir, { recursive: true });
    console.log(`Created user directory: ${userDir}`);
  }

  // Check if database exists
  const isNewDb = !fs.existsSync(dbPath);

  // Open/create database
  const db = new Database(dbPath);
  db.pragma('foreign_keys = ON');

  // Initialize schema if new database
  if (isNewDb) {
    initializeUserDb(db);
    console.log(`Created new database for user: ${userEmail}`);
  } else {
    // Run migrations for existing databases
    migrateUserDb(db);
  }

  // Create images directory
  const imagesDir = path.join(userDir, 'images');
  if (!fs.existsSync(imagesDir)) {
    fs.mkdirSync(imagesDir, { recursive: true });
  }

  // Cache the connection
  dbCache.set(userEmail, db);

  return db;
}

// Migrate existing databases (add new columns)
function migrateUserDb(db) {
  // Check if image_path column exists in contact_notes
  const tableInfo = db.prepare("PRAGMA table_info(contact_notes)").all();
  const hasImagePath = tableInfo.some(col => col.name === 'image_path');

  if (!hasImagePath) {
    db.exec('ALTER TABLE contact_notes ADD COLUMN image_path TEXT');
    console.log('Migration: Added image_path column to contact_notes');
  }

  // Make content nullable (SQLite doesn't support ALTER COLUMN, but new rows will work)
}

// Get user directory path
function getUserDir(userEmail) {
  const safeEmail = userEmail.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  return path.join(dataDir, safeEmail);
}

// Get user images directory path
function getUserImagesDir(userEmail) {
  return path.join(getUserDir(userEmail), 'images');
}

// Initialize user database with default schema
function initializeUserDb(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      color TEXT DEFAULT '#6366F1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366F1'
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT DEFAULT '',
      column_id TEXT NOT NULL,
      position INTEGER NOT NULL,
      priority TEXT DEFAULT 'media' CHECK(priority IN ('alta', 'media', 'baixa')),
      category_id TEXT,
      month TEXT,
      assignee TEXT,
      dependent TEXT,
      value REAL DEFAULT 0,
      points INTEGER DEFAULT 0,
      start_date TEXT,
      project TEXT,
      blocked INTEGER DEFAULT 0,
      blocked_by TEXT,
      blocked_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_month ON tasks(month);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      company TEXT,
      role TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS contact_notes (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      content TEXT,
      image_path TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id);

    CREATE TABLE IF NOT EXISTS task_checklist (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      text TEXT NOT NULL,
      completed INTEGER DEFAULT 0,
      position INTEGER NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_task_checklist_task ON task_checklist(task_id);

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      description TEXT DEFAULT '',
      color TEXT DEFAULT '#6366F1',
      status TEXT DEFAULT 'active' CHECK(status IN ('planning', 'active', 'paused', 'completed')),
      start_date TEXT,
      end_date TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
  `);

  // Seed default columns
  const defaultColumns = [
    { title: 'Backlog', color: '#71717A' },
    { title: 'A Fazer', color: '#6366F1' },
    { title: 'Em Progresso', color: '#F59E0B' },
    { title: 'Concluído', color: '#22C55E' },
    { title: 'Suporte', color: '#8B5CF6' }
  ];

  const insertColumn = db.prepare(
    'INSERT INTO columns (id, title, position, color) VALUES (?, ?, ?, ?)'
  );

  defaultColumns.forEach((col, index) => {
    insertColumn.run(uuidv4(), col.title, index, col.color);
  });

  // Seed default categories
  const defaultCategories = [
    { name: 'Bug', color: '#EF4444' },
    { name: 'Feature', color: '#6366F1' },
    { name: 'Melhoria', color: '#22C55E' },
    { name: 'Documentação', color: '#71717A' }
  ];

  const insertCategory = db.prepare(
    'INSERT INTO categories (id, name, color) VALUES (?, ?, ?)'
  );

  defaultCategories.forEach((cat) => {
    insertCategory.run(uuidv4(), cat.name, cat.color);
  });
}

// Migrate existing database for master user
function migrateMasterDb(masterEmail) {
  const oldDbPath = path.join(__dirname, '../../kanban.db');
  const safeEmail = masterEmail.toLowerCase().replace(/[^a-z0-9@._-]/g, '_');
  const userDir = path.join(dataDir, safeEmail);
  const newDbPath = path.join(userDir, 'kanban.db');

  if (fs.existsSync(oldDbPath) && !fs.existsSync(newDbPath)) {
    // Create user directory
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    // Copy database
    fs.copyFileSync(oldDbPath, newDbPath);
    console.log(`Migrated master database to: ${newDbPath}`);
    return true;
  }
  return false;
}

// Close all database connections
function closeAll() {
  for (const [email, db] of dbCache) {
    db.close();
  }
  dbCache.clear();
}

module.exports = {
  getUserDb,
  getUserDir,
  getUserImagesDir,
  migrateMasterDb,
  closeAll
};
