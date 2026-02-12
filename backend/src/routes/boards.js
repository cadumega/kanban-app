const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Limite de boards por tipo de usuário
const BOARD_LIMIT_USER = 5;
const BOARD_LIMIT_MASTER = 999; // Praticamente ilimitado

// Get all boards
router.get('/', (req, res) => {
  const db = req.db;
  const boards = db.prepare(`
    SELECT b.*,
      (SELECT COUNT(*) FROM columns WHERE board_id = b.id) as columns_count,
      (SELECT COUNT(*) FROM tasks WHERE board_id = b.id) as tasks_count
    FROM boards b
    ORDER BY b.position ASC
  `).all();
  res.json(boards);
});

// Get single board with columns
router.get('/:id', (req, res) => {
  const db = req.db;
  const { id } = req.params;

  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  if (!board) {
    return res.status(404).json({ error: 'Board não encontrado' });
  }

  const columns = db.prepare(`
    SELECT * FROM columns WHERE board_id = ? ORDER BY position ASC
  `).all(id);

  res.json({ ...board, columns });
});

// Create board
router.post('/', (req, res) => {
  const db = req.db;
  const { name } = req.body;
  const userRole = req.user.role;

  if (!name?.trim()) {
    return res.status(400).json({ error: 'Nome é obrigatório' });
  }

  // Check board limit
  const boardCount = db.prepare('SELECT COUNT(*) as count FROM boards').get().count;
  const limit = userRole === 'master' ? BOARD_LIMIT_MASTER : BOARD_LIMIT_USER;

  if (boardCount >= limit) {
    return res.status(400).json({
      error: `Limite de ${limit} boards atingido`,
      limit: limit,
      current: boardCount
    });
  }

  // Get next position
  const maxPos = db.prepare('SELECT MAX(position) as max FROM boards').get();
  const position = (maxPos.max ?? -1) + 1;

  const id = uuidv4();
  db.prepare(`
    INSERT INTO boards (id, name, position) VALUES (?, ?, ?)
  `).run(id, name.trim(), position);

  // Create default columns for new board
  const defaultColumns = [
    { title: 'A Fazer', color: '#6366F1' },
    { title: 'Em Progresso', color: '#F59E0B' },
    { title: 'Concluído', color: '#22C55E' }
  ];

  const insertColumn = db.prepare(
    'INSERT INTO columns (id, board_id, title, position, color) VALUES (?, ?, ?, ?, ?)'
  );

  defaultColumns.forEach((col, index) => {
    insertColumn.run(uuidv4(), id, col.title, index, col.color);
  });

  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  res.status(201).json(board);
});

// Update board
router.put('/:id', (req, res) => {
  const db = req.db;
  const { id } = req.params;
  const { name } = req.body;

  const existing = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  if (!existing) {
    return res.status(404).json({ error: 'Board não encontrado' });
  }

  db.prepare(`
    UPDATE boards SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
  `).run(name?.trim() || existing.name, id);

  const board = db.prepare('SELECT * FROM boards WHERE id = ?').get(id);
  res.json(board);
});

// Reorder boards
router.put('/reorder/batch', (req, res) => {
  const db = req.db;
  const { boards } = req.body;

  if (!Array.isArray(boards)) {
    return res.status(400).json({ error: 'Lista de boards inválida' });
  }

  const updateStmt = db.prepare('UPDATE boards SET position = ? WHERE id = ?');

  db.transaction(() => {
    boards.forEach((board, index) => {
      updateStmt.run(index, board.id);
    });
  })();

  res.json({ success: true });
});

// Delete board
router.delete('/:id', (req, res) => {
  const db = req.db;
  const { id } = req.params;

  // Check if it's the only board
  const boardCount = db.prepare('SELECT COUNT(*) as count FROM boards').get().count;
  if (boardCount <= 1) {
    return res.status(400).json({ error: 'Não é possível excluir o único board' });
  }

  // Delete board (columns and tasks will cascade)
  db.prepare('DELETE FROM boards WHERE id = ?').run(id);
  res.status(204).send();
});

// Get board limit info
router.get('/limit/info', (req, res) => {
  const db = req.db;
  const userRole = req.user.role;

  const boardCount = db.prepare('SELECT COUNT(*) as count FROM boards').get().count;
  const limit = userRole === 'master' ? BOARD_LIMIT_MASTER : BOARD_LIMIT_USER;

  res.json({
    current: boardCount,
    limit: limit,
    canCreate: boardCount < limit,
    isMaster: userRole === 'master'
  });
});

module.exports = router;
