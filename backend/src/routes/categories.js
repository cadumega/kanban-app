const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');

const router = express.Router();

// Get all categories
router.get('/', (req, res) => {
  try {
    const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
    res.json(categories);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar categorias' });
  }
});

// Create category
router.post('/', (req, res) => {
  try {
    const { name, color = '#6366F1' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    // Check if category already exists
    const existing = db.prepare('SELECT * FROM categories WHERE name = ?').get(name);
    if (existing) {
      return res.status(400).json({ error: 'Categoria já existe' });
    }

    const id = uuidv4();
    db.prepare('INSERT INTO categories (id, name, color) VALUES (?, ?, ?)').run(id, name, color);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.status(201).json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar categoria' });
  }
});

// Update category
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, color } = req.body;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    db.prepare(`
      UPDATE categories SET
        name = COALESCE(?, name),
        color = COALESCE(?, color)
      WHERE id = ?
    `).run(name, color, id);

    const category = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    res.json(category);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar categoria' });
  }
});

// Delete category
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM categories WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Categoria não encontrada' });
    }

    db.prepare('DELETE FROM categories WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir categoria' });
  }
});

module.exports = router;
