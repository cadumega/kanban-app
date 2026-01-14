const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../database/init');

const router = express.Router();

// Get all tasks with filters
router.get('/', (req, res) => {
  try {
    const { category_id, priority, month, blocked } = req.query;

    let query = `
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE 1=1
    `;
    const params = [];

    if (category_id) {
      query += ' AND t.category_id = ?';
      params.push(category_id);
    }
    if (priority) {
      query += ' AND t.priority = ?';
      params.push(priority);
    }
    if (month) {
      query += ' AND t.month = ?';
      params.push(month);
    }
    if (blocked !== undefined) {
      query += ' AND t.blocked = ?';
      params.push(blocked === 'true' ? 1 : 0);
    }

    query += ' ORDER BY t.position ASC';

    const tasks = db.prepare(query).all(...params);
    res.json(tasks);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
});

// Create task
router.post('/', (req, res) => {
  try {
    const {
      title,
      description = '',
      column_id,
      priority = 'media',
      category_id = null,
      month = null,
      assignee = null,
      dependent = null,
      value = 0,
      points = 0,
      blocked = false,
      blocked_by = null,
      blocked_reason = null
    } = req.body;

    if (!title || !column_id) {
      return res.status(400).json({ error: 'Título e coluna são obrigatórios' });
    }

    // Get max position in column
    const maxPos = db.prepare(
      'SELECT MAX(position) as max FROM tasks WHERE column_id = ?'
    ).get(column_id);
    const position = (maxPos.max ?? -1) + 1;

    const id = uuidv4();
    db.prepare(`
      INSERT INTO tasks (id, title, description, column_id, position, priority, category_id, month, assignee, dependent, value, points, blocked, blocked_by, blocked_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, column_id, position, priority, category_id, month, assignee, dependent, value, points, blocked ? 1 : 0, blocked_by, blocked_reason);

    const task = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    res.status(201).json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao criar tarefa' });
  }
});

// Update task
router.put('/:id', (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      description,
      priority,
      category_id,
      month,
      assignee,
      dependent,
      value,
      points,
      blocked,
      blocked_by,
      blocked_reason
    } = req.body;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    db.prepare(`
      UPDATE tasks SET
        title = COALESCE(?, title),
        description = COALESCE(?, description),
        priority = COALESCE(?, priority),
        category_id = ?,
        month = ?,
        assignee = ?,
        dependent = ?,
        value = ?,
        points = ?,
        blocked = COALESCE(?, blocked),
        blocked_by = ?,
        blocked_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      title,
      description,
      priority,
      category_id !== undefined ? category_id : existing.category_id,
      month !== undefined ? month : existing.month,
      assignee !== undefined ? assignee : existing.assignee,
      dependent !== undefined ? dependent : existing.dependent,
      value !== undefined ? value : existing.value,
      points !== undefined ? points : existing.points,
      blocked !== undefined ? (blocked ? 1 : 0) : null,
      blocked_by !== undefined ? blocked_by : existing.blocked_by,
      blocked_reason !== undefined ? blocked_reason : existing.blocked_reason,
      id
    );

    const task = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar tarefa' });
  }
});

// Move task (change column and/or position)
router.put('/:id/move', (req, res) => {
  try {
    const { id } = req.params;
    const { column_id, position } = req.body;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    const targetColumnId = column_id || existing.column_id;

    // Update positions in target column
    const transaction = db.transaction(() => {
      // If moving to different column, shift positions in both columns
      if (column_id && column_id !== existing.column_id) {
        // Decrease positions in old column
        db.prepare(`
          UPDATE tasks SET position = position - 1
          WHERE column_id = ? AND position > ?
        `).run(existing.column_id, existing.position);

        // Increase positions in new column to make room
        db.prepare(`
          UPDATE tasks SET position = position + 1
          WHERE column_id = ? AND position >= ?
        `).run(column_id, position);
      } else {
        // Moving within same column
        if (position < existing.position) {
          db.prepare(`
            UPDATE tasks SET position = position + 1
            WHERE column_id = ? AND position >= ? AND position < ?
          `).run(targetColumnId, position, existing.position);
        } else if (position > existing.position) {
          db.prepare(`
            UPDATE tasks SET position = position - 1
            WHERE column_id = ? AND position > ? AND position <= ?
          `).run(targetColumnId, existing.position, position);
        }
      }

      // Update the task itself
      db.prepare(`
        UPDATE tasks SET column_id = ?, position = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(targetColumnId, position, id);
    });

    transaction();

    const task = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao mover tarefa' });
  }
});

// Toggle block status
router.put('/:id/block', (req, res) => {
  try {
    const { id } = req.params;
    const { blocked, blocked_by, blocked_reason } = req.body;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    db.prepare(`
      UPDATE tasks SET
        blocked = ?,
        blocked_by = ?,
        blocked_reason = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(blocked ? 1 : 0, blocked ? blocked_by : null, blocked ? blocked_reason : null, id);

    const task = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao bloquear/desbloquear tarefa' });
  }
});

// Delete task
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    db.prepare('DELETE FROM tasks WHERE id = ?').run(id);

    // Reorder remaining tasks in column
    db.prepare(`
      UPDATE tasks SET position = position - 1
      WHERE column_id = ? AND position > ?
    `).run(existing.column_id, existing.position);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir tarefa' });
  }
});

// Export tasks as JSON
router.get('/export/json', (req, res) => {
  try {
    const columns = db.prepare('SELECT * FROM columns ORDER BY position ASC').all();
    const tasks = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, col.title as column_title
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN columns col ON t.column_id = col.id
      ORDER BY col.position ASC, t.position ASC
    `).all();
    const categories = db.prepare('SELECT * FROM categories').all();

    res.json({
      exported_at: new Date().toISOString(),
      columns,
      categories,
      tasks
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

// Export tasks as CSV
router.get('/export/csv', (req, res) => {
  try {
    const tasks = db.prepare(`
      SELECT
        t.title,
        t.description,
        col.title as coluna,
        t.priority as prioridade,
        c.name as categoria,
        t.month as mes,
        t.assignee as responsavel,
        t.dependent as dependente,
        t.value as valor,
        t.points as pontos,
        CASE WHEN t.blocked = 1 THEN 'Sim' ELSE 'Não' END as bloqueado,
        t.blocked_by as bloqueado_por,
        t.blocked_reason as motivo_bloqueio,
        t.created_at as criado_em,
        t.updated_at as atualizado_em
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN columns col ON t.column_id = col.id
      ORDER BY col.position ASC, t.position ASC
    `).all();

    const headers = ['Título', 'Descrição', 'Coluna', 'Prioridade', 'Categoria', 'Mês', 'Responsável', 'Dependente', 'Valor', 'Pontos', 'Bloqueado', 'Bloqueado Por', 'Motivo Bloqueio', 'Criado Em', 'Atualizado Em'];
    const csvRows = [headers.join(',')];

    tasks.forEach(task => {
      const row = [
        `"${(task.title || '').replace(/"/g, '""')}"`,
        `"${(task.description || '').replace(/"/g, '""')}"`,
        `"${task.coluna || ''}"`,
        task.prioridade || '',
        `"${task.categoria || ''}"`,
        task.mes || '',
        `"${task.responsavel || ''}"`,
        `"${task.dependente || ''}"`,
        task.valor || 0,
        task.pontos || 0,
        task.bloqueado,
        `"${task.bloqueado_por || ''}"`,
        `"${task.motivo_bloqueio || ''}"`,
        task.criado_em || '',
        task.atualizado_em || ''
      ];
      csvRows.push(row.join(','));
    });

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename=kanban-export.csv');
    res.send('\uFEFF' + csvRows.join('\n')); // BOM for Excel UTF-8
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao exportar CSV' });
  }
});

// Get report/summary
router.get('/report', (req, res) => {
  try {
    const columns = db.prepare('SELECT * FROM columns ORDER BY position ASC').all();

    // Tasks per column with totals
    const tasksByColumn = columns.map(col => {
      const stats = db.prepare(`
        SELECT
          COUNT(*) as total_tasks,
          SUM(value) as total_value,
          SUM(points) as total_points,
          SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) as blocked_count
        FROM tasks WHERE column_id = ?
      `).get(col.id);

      return {
        column_id: col.id,
        column_title: col.title,
        ...stats
      };
    });

    // Overall totals
    const totals = db.prepare(`
      SELECT
        COUNT(*) as total_tasks,
        SUM(value) as total_value,
        SUM(points) as total_points,
        SUM(CASE WHEN blocked = 1 THEN 1 ELSE 0 END) as blocked_count
      FROM tasks
    `).get();

    // By priority
    const byPriority = db.prepare(`
      SELECT
        priority,
        COUNT(*) as count,
        SUM(value) as total_value,
        SUM(points) as total_points
      FROM tasks GROUP BY priority
    `).all();

    // By category
    const byCategory = db.prepare(`
      SELECT
        c.name as category,
        COUNT(*) as count,
        SUM(t.value) as total_value,
        SUM(t.points) as total_points
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      GROUP BY t.category_id
    `).all();

    // By month
    const byMonth = db.prepare(`
      SELECT
        month,
        COUNT(*) as count,
        SUM(value) as total_value,
        SUM(points) as total_points
      FROM tasks
      WHERE month IS NOT NULL AND month != ''
      GROUP BY month
      ORDER BY month DESC
    `).all();

    // By assignee
    const byAssignee = db.prepare(`
      SELECT
        assignee,
        COUNT(*) as count,
        SUM(value) as total_value,
        SUM(points) as total_points
      FROM tasks
      WHERE assignee IS NOT NULL AND assignee != ''
      GROUP BY assignee
      ORDER BY count DESC
    `).all();

    res.json({
      generated_at: new Date().toISOString(),
      totals,
      by_column: tasksByColumn,
      by_priority: byPriority,
      by_category: byCategory,
      by_month: byMonth,
      by_assignee: byAssignee
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao gerar relatório' });
  }
});

module.exports = router;
