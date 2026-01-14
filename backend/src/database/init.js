const Database = require('better-sqlite3');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const dbPath = path.join(__dirname, '../../kanban.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
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
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_contact_notes_contact ON contact_notes(contact_id);
`);

// Migration: Add new columns if they don't exist
try {
  db.exec(`ALTER TABLE tasks ADD COLUMN assignee TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN dependent TEXT`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN value REAL DEFAULT 0`);
} catch (e) { /* Column already exists */ }

try {
  db.exec(`ALTER TABLE tasks ADD COLUMN points INTEGER DEFAULT 0`);
} catch (e) { /* Column already exists */ }

// Seed default columns if empty
const columnCount = db.prepare('SELECT COUNT(*) as count FROM columns').get();
if (columnCount.count === 0) {
  const defaultColumns = [
    { title: 'Backlog', color: '#71717A' },
    { title: 'A Fazer', color: '#6366F1' },
    { title: 'Em Progresso', color: '#F59E0B' },
    { title: 'Concluído', color: '#22C55E' }
  ];

  const insertColumn = db.prepare(
    'INSERT INTO columns (id, title, position, color) VALUES (?, ?, ?, ?)'
  );

  defaultColumns.forEach((col, index) => {
    insertColumn.run(uuidv4(), col.title, index, col.color);
  });

  console.log('Default columns created');
}

// Seed default categories if empty
const categoryCount = db.prepare('SELECT COUNT(*) as count FROM categories').get();
if (categoryCount.count === 0) {
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

  console.log('Default categories created');
}

module.exports = db;
