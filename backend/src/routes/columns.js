const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');

const router = express.Router();

// Get all columns with their tasks
router.get('/', (req, res) => {
  try {
    const columns = db.prepare(`
      SELECT * FROM columns ORDER BY position ASC
    `).all();

    const tasks = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      ORDER BY t.position ASC
    `).all();

    const columnsWithTasks = columns.map(col => ({
      ...col,
      tasks: tasks.filter(task => task.column_id === col.id)
    }));

    res.json(columnsWithTasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar colunas' });
  }
});

// Create column
router.post('/', (req, res) => {
  try {
    const { title, color = '#6366F1' } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Título é obrigatório' });
    }

    const maxPosition = db.prepare('SELECT MAX(position) as max FROM columns').get();
    const position = (maxPosition.max ?? -1) + 1;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO columns (id, title, position, color) VALUES (?, ?, ?, ?)
    `).run(id, title, position, color);

    const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
    res.status(201).json({ ...column, tasks: [] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar coluna' });
  }
});

// Update column
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { title, color } = req.body;

    const existing = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Coluna não encontrada' });
    }

    db.prepare(`
      UPDATE columns SET
        title = COALESCE(?, title),
        color = COALESCE(?, color)
      WHERE id = ?
    `).run(title, color, id);

    const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
    res.json(column);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar coluna' });
  }
});

// Reorder columns
router.put('/reorder/batch', (req, res) => {
  try {
    const { columns } = req.body;

    if (!Array.isArray(columns)) {
      return res.status(400).json({ error: 'Lista de colunas inválida' });
    }

    const updatePosition = db.prepare('UPDATE columns SET position = ? WHERE id = ?');

    const transaction = db.transaction(() => {
      columns.forEach((col, index) => {
        updatePosition.run(index, col.id);
      });
    });

    transaction();
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao reordenar colunas' });
  }
});

// Delete column
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM columns WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Coluna não encontrada' });
    }

    db.prepare('DELETE FROM columns WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir coluna' });
  }
});

module.exports = router;
