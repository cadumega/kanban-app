const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// Use DATA_DIR env var for Fly.io volume, fallback to local
const dataDir = process.env.DATA_DIR || path.join(__dirname, '../../data');

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

// Migrate existing databases (add new columns/tables)
function migrateUserDb(db) {
  // Check if image_path column exists in contact_notes
  const tableInfo = db.prepare("PRAGMA table_info(contact_notes)").all();
  const hasImagePath = tableInfo.some(col => col.name === 'image_path');

  if (!hasImagePath) {
    db.exec('ALTER TABLE contact_notes ADD COLUMN image_path TEXT');
    console.log('Migration: Added image_path column to contact_notes');
  }

  // Check if tag column exists in contacts
  const contactsInfo = db.prepare("PRAGMA table_info(contacts)").all();
  const hasTag = contactsInfo.some(col => col.name === 'tag');
  if (!hasTag) {
    db.exec('ALTER TABLE contacts ADD COLUMN tag TEXT DEFAULT NULL');
    console.log('Migration: Added tag column to contacts');
  }

  // Check if focus column exists in tasks
  const tasksInfo = db.prepare("PRAGMA table_info(tasks)").all();
  const hasFocus = tasksInfo.some(col => col.name === 'focus');
  if (!hasFocus) {
    db.exec('ALTER TABLE tasks ADD COLUMN focus INTEGER DEFAULT 0');
    console.log('Migration: Added focus column to tasks');
  }

  // Check if completed_at column exists in tasks
  const tasksInfoCompleted = db.prepare("PRAGMA table_info(tasks)").all();
  const hasCompletedAt = tasksInfoCompleted.some(col => col.name === 'completed_at');
  if (!hasCompletedAt) {
    db.exec('ALTER TABLE tasks ADD COLUMN completed_at DATETIME');
    console.log('Migration: Added completed_at column to tasks');
  }

  // Check if city column exists in contacts
  const contactsInfoCity = db.prepare("PRAGMA table_info(contacts)").all();
  const hasCity = contactsInfoCity.some(col => col.name === 'city');
  if (!hasCity) {
    db.exec('ALTER TABLE contacts ADD COLUMN city TEXT DEFAULT NULL');
    console.log('Migration: Added city column to contacts');
  }

  // Check if new contact fields exist (phone_robot, whatsapp_redirect, valores, is_robot)
  const contactsInfoNew = db.prepare("PRAGMA table_info(contacts)").all();
  const hasPhoneRobot = contactsInfoNew.some(col => col.name === 'phone_robot');
  if (!hasPhoneRobot) {
    db.exec('ALTER TABLE contacts ADD COLUMN phone_robot TEXT');
    db.exec('ALTER TABLE contacts ADD COLUMN whatsapp_redirect TEXT');
    db.exec('ALTER TABLE contacts ADD COLUMN valor_implementacao REAL DEFAULT 0');
    db.exec('ALTER TABLE contacts ADD COLUMN valor_mensal REAL DEFAULT 0');
    db.exec('ALTER TABLE contacts ADD COLUMN is_robot INTEGER DEFAULT 0');
    console.log('Migration: Added phone_robot, whatsapp_redirect, valor_implementacao, valor_mensal, is_robot columns to contacts');
  }

  // Check if segments column exists in contacts
  const contactsInfoSegments = db.prepare("PRAGMA table_info(contacts)").all();
  const hasSegments = contactsInfoSegments.some(col => col.name === 'segments');
  if (!hasSegments) {
    db.exec('ALTER TABLE contacts ADD COLUMN segments TEXT DEFAULT NULL');
    console.log('Migration: Added segments column to contacts');
  }

  // Check if boards table exists (new multi-board feature)
  const boardsTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='boards'").get();
  if (!boardsTable) {
    // Create boards table
    db.exec(`
      CREATE TABLE IF NOT EXISTS boards (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        position INTEGER NOT NULL DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create default board
    const defaultBoardId = uuidv4();
    db.prepare('INSERT INTO boards (id, name, position) VALUES (?, ?, ?)').run(defaultBoardId, 'Principal', 0);

    // Add board_id to columns
    db.exec('ALTER TABLE columns ADD COLUMN board_id TEXT');
    db.exec(`UPDATE columns SET board_id = '${defaultBoardId}'`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id)');

    // Add board_id to tasks
    db.exec('ALTER TABLE tasks ADD COLUMN board_id TEXT');
    db.exec(`UPDATE tasks SET board_id = '${defaultBoardId}'`);
    db.exec('CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id)');

    console.log('Migration: Created boards table and migrated existing data');
  }

  // Check if contact_followups table exists
  const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contact_followups'").get();
  if (!tables) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_followups (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        date TEXT NOT NULL,
        description TEXT DEFAULT '',
        completed INTEGER DEFAULT 0,
        completed_at DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_contact_followups_contact ON contact_followups(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_followups_date ON contact_followups(date);
      CREATE INDEX IF NOT EXISTS idx_contact_followups_completed ON contact_followups(completed);
    `);
    console.log('Migration: Created contact_followups table');
  }

  // Check if contact_tag_history table exists (for pipeline velocity tracking)
  const tagHistoryTable = db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='contact_tag_history'").get();
  if (!tagHistoryTable) {
    db.exec(`
      CREATE TABLE IF NOT EXISTS contact_tag_history (
        id TEXT PRIMARY KEY,
        contact_id TEXT NOT NULL,
        old_tag TEXT,
        new_tag TEXT,
        changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
      );

      CREATE INDEX IF NOT EXISTS idx_contact_tag_history_contact ON contact_tag_history(contact_id);
      CREATE INDEX IF NOT EXISTS idx_contact_tag_history_date ON contact_tag_history(changed_at);
    `);
    console.log('Migration: Created contact_tag_history table');
  }
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
    CREATE TABLE IF NOT EXISTS boards (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      position INTEGER NOT NULL DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS columns (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
      title TEXT NOT NULL,
      position INTEGER NOT NULL,
      color TEXT DEFAULT '#6366F1',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_columns_board ON columns(board_id);

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE,
      color TEXT DEFAULT '#6366F1'
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      board_id TEXT NOT NULL,
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
      focus INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
      FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
    );

    CREATE INDEX IF NOT EXISTS idx_tasks_board ON tasks(board_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_column ON tasks(column_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_category ON tasks(category_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_month ON tasks(month);
    CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project);

    CREATE TABLE IF NOT EXISTS contacts (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      phone_robot TEXT,
      whatsapp_redirect TEXT,
      company TEXT,
      role TEXT,
      tag TEXT DEFAULT NULL,
      city TEXT DEFAULT NULL,
      segments TEXT DEFAULT NULL,
      valor_implementacao REAL DEFAULT 0,
      valor_mensal REAL DEFAULT 0,
      is_robot INTEGER DEFAULT 0,
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

    CREATE TABLE IF NOT EXISTS contact_followups (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      date TEXT NOT NULL,
      description TEXT DEFAULT '',
      completed INTEGER DEFAULT 0,
      completed_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contact_followups_contact ON contact_followups(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_followups_date ON contact_followups(date);
    CREATE INDEX IF NOT EXISTS idx_contact_followups_completed ON contact_followups(completed);

    CREATE TABLE IF NOT EXISTS contact_tag_history (
      id TEXT PRIMARY KEY,
      contact_id TEXT NOT NULL,
      old_tag TEXT,
      new_tag TEXT,
      changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (contact_id) REFERENCES contacts(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_contact_tag_history_contact ON contact_tag_history(contact_id);
    CREATE INDEX IF NOT EXISTS idx_contact_tag_history_date ON contact_tag_history(changed_at);

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

  // Seed default board
  const defaultBoardId = uuidv4();
  db.prepare('INSERT INTO boards (id, name, position) VALUES (?, ?, ?)').run(defaultBoardId, 'Principal', 0);

  // Seed default columns
  const defaultColumns = [
    { title: 'Backlog', color: '#71717A' },
    { title: 'A Fazer', color: '#6366F1' },
    { title: 'Em Progresso', color: '#F59E0B' },
    { title: 'Concluído', color: '#22C55E' },
    { title: 'Suporte', color: '#8B5CF6' }
  ];

  const insertColumn = db.prepare(
    'INSERT INTO columns (id, board_id, title, position, color) VALUES (?, ?, ?, ?, ?)'
  );

  defaultColumns.forEach((col, index) => {
    insertColumn.run(uuidv4(), defaultBoardId, col.title, index, col.color);
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
