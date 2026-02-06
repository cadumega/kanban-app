const express = require('express');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Get all tasks with filters
router.get('/', (req, res) => {
  try {
    const db = req.db;
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
    const db = req.db;
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
      start_date = null,
      project = null,
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
      INSERT INTO tasks (id, title, description, column_id, position, priority, category_id, month, assignee, dependent, value, points, start_date, project, blocked, blocked_by, blocked_reason)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, description, column_id, position, priority, category_id, month, assignee, dependent, value, points, start_date, project, blocked ? 1 : 0, blocked_by, blocked_reason);

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
    const db = req.db;
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
      start_date,
      project,
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
        start_date = ?,
        project = ?,
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
      start_date !== undefined ? start_date : existing.start_date,
      project !== undefined ? project : existing.project,
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
    const db = req.db;
    const { id } = req.params;
    const { column_id, position } = req.body;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    const targetColumnId = column_id || existing.column_id;

    // Check if target column is "Concluído" to set completed_at
    const targetColumn = db.prepare('SELECT title FROM columns WHERE id = ?').get(targetColumnId);
    const isCompletedColumn = targetColumn && targetColumn.title.toLowerCase().includes('conclu');
    const completedAt = isCompletedColumn && !existing.completed_at ? new Date().toISOString() : existing.completed_at;
    // If moving out of completed column, clear completed_at
    const finalCompletedAt = isCompletedColumn ? completedAt : null;

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

      // Update the task itself (including completed_at)
      db.prepare(`
        UPDATE tasks SET column_id = ?, position = ?, completed_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?
      `).run(targetColumnId, position, finalCompletedAt, id);
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
    const db = req.db;
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

// Toggle focus on task
router.put('/:id/focus', (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const { focus } = req.body;

    const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Tarefa não encontrada' });
    }

    db.prepare(`
      UPDATE tasks SET
        focus = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(focus ? 1 : 0, id);

    const task = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      WHERE t.id = ?
    `).get(id);

    res.json(task);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao alterar foco da tarefa' });
  }
});

// Delete task
router.delete('/:id', (req, res) => {
  try {
    const db = req.db;
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

// Export tasks as JSON (complete backup)
router.get('/export/json', (req, res) => {
  try {
    const db = req.db;
    const columns = db.prepare('SELECT * FROM columns ORDER BY position ASC').all();
    const tasks = db.prepare(`
      SELECT t.*, c.name as category_name, c.color as category_color, col.title as column_title
      FROM tasks t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN columns col ON t.column_id = col.id
      ORDER BY col.position ASC, t.position ASC
    `).all();
    const categories = db.prepare('SELECT * FROM categories').all();
    const checklists = db.prepare('SELECT * FROM task_checklist ORDER BY task_id, position ASC').all();
    const projects = db.prepare('SELECT * FROM projects').all();

    res.json({
      exported_at: new Date().toISOString(),
      version: '2.0',
      columns,
      categories,
      tasks,
      checklists,
      projects
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao exportar dados' });
  }
});

// Import tasks from JSON (restore backup)
router.post('/import/json', (req, res) => {
  try {
    const db = req.db;
    const { columns, categories, tasks, checklists, projects } = req.body;

    if (!columns || !tasks) {
      return res.status(400).json({ error: 'Arquivo inválido. Deve conter columns e tasks.' });
    }

    // Use transaction for safety
    const importData = db.transaction(() => {
      // Clear existing data (in reverse order of dependencies)
      db.prepare('DELETE FROM task_checklist').run();
      db.prepare('DELETE FROM tasks').run();
      db.prepare('DELETE FROM categories').run();
      db.prepare('DELETE FROM columns').run();
      if (projects) {
        db.prepare('DELETE FROM projects').run();
      }

      // Import columns
      const insertColumn = db.prepare(
        'INSERT INTO columns (id, title, position, color, created_at) VALUES (?, ?, ?, ?, ?)'
      );
      for (const col of columns) {
        insertColumn.run(col.id, col.title, col.position, col.color, col.created_at || new Date().toISOString());
      }

      // Import categories
      if (categories && categories.length > 0) {
        const insertCategory = db.prepare(
          'INSERT INTO categories (id, name, color) VALUES (?, ?, ?)'
        );
        for (const cat of categories) {
          insertCategory.run(cat.id, cat.name, cat.color);
        }
      }

      // Import projects
      if (projects && projects.length > 0) {
        const insertProject = db.prepare(
          'INSERT INTO projects (id, name, description, color, status, start_date, end_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)'
        );
        for (const proj of projects) {
          insertProject.run(
            proj.id, proj.name, proj.description || '', proj.color || '#6366F1',
            proj.status || 'active', proj.start_date, proj.end_date,
            proj.created_at || new Date().toISOString(),
            proj.updated_at || new Date().toISOString()
          );
        }
      }

      // Import tasks
      const insertTask = db.prepare(`
        INSERT INTO tasks (id, title, description, column_id, position, priority, category_id, month, assignee, dependent, value, points, start_date, project, blocked, blocked_by, blocked_reason, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      for (const task of tasks) {
        insertTask.run(
          task.id, task.title, task.description || '', task.column_id, task.position,
          task.priority || 'media', task.category_id, task.month,
          task.assignee, task.dependent, task.value || 0, task.points || 0,
          task.start_date, task.project, task.blocked || 0,
          task.blocked_by, task.blocked_reason,
          task.created_at || new Date().toISOString(),
          task.updated_at || new Date().toISOString()
        );
      }

      // Import checklists
      if (checklists && checklists.length > 0) {
        const insertChecklist = db.prepare(
          'INSERT INTO task_checklist (id, task_id, text, completed, position, created_at) VALUES (?, ?, ?, ?, ?, ?)'
        );
        for (const item of checklists) {
          insertChecklist.run(
            item.id, item.task_id, item.text, item.completed || 0, item.position,
            item.created_at || new Date().toISOString()
          );
        }
      }

      return {
        columns: columns.length,
        categories: categories?.length || 0,
        tasks: tasks.length,
        checklists: checklists?.length || 0,
        projects: projects?.length || 0
      };
    });

    const result = importData();
    res.json({
      success: true,
      message: 'Dados importados com sucesso!',
      imported: result
    });
  } catch (error) {
    console.error('Erro ao importar:', error);
    res.status(500).json({ error: 'Erro ao importar dados: ' + error.message });
  }
});

// Export tasks as CSV
router.get('/export/csv', (req, res) => {
  try {
    const db = req.db;
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
    const db = req.db;
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

// ==================== CHECKLIST (Subtarefas) ====================

// Get checklist items for a task
router.get('/:id/checklist', (req, res) => {
  try {
    const db = req.db;
    const { id } = req.params;
    const items = db.prepare(
      'SELECT * FROM task_checklist WHERE task_id = ? ORDER BY position ASC'
    ).all(id);
    res.json(items);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao buscar checklist' });
  }
});

// Add checklist item
router.post('/:id/checklist', (req, res) => {
  try {
    const db = req.db;
    const { id: taskId } = req.params;
    const { text } = req.body;

    if (!text?.trim()) {
      return res.status(400).json({ error: 'Texto é obrigatório' });
    }

    // Get max position
    const maxPos = db.prepare(
      'SELECT MAX(position) as max FROM task_checklist WHERE task_id = ?'
    ).get(taskId);
    const position = (maxPos.max ?? -1) + 1;

    const id = uuidv4();
    db.prepare(
      'INSERT INTO task_checklist (id, task_id, text, position) VALUES (?, ?, ?, ?)'
    ).run(id, taskId, text.trim(), position);

    const item = db.prepare('SELECT * FROM task_checklist WHERE id = ?').get(id);
    res.status(201).json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao adicionar item' });
  }
});

// Toggle checklist item
router.put('/:taskId/checklist/:itemId', (req, res) => {
  try {
    const db = req.db;
    const { itemId } = req.params;
    const { completed, text } = req.body;

    const existing = db.prepare('SELECT * FROM task_checklist WHERE id = ?').get(itemId);
    if (!existing) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    if (completed !== undefined) {
      db.prepare('UPDATE task_checklist SET completed = ? WHERE id = ?')
        .run(completed ? 1 : 0, itemId);
    }

    if (text !== undefined) {
      db.prepare('UPDATE task_checklist SET text = ? WHERE id = ?')
        .run(text.trim(), itemId);
    }

    const item = db.prepare('SELECT * FROM task_checklist WHERE id = ?').get(itemId);
    res.json(item);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao atualizar item' });
  }
});

// Delete checklist item
router.delete('/:taskId/checklist/:itemId', (req, res) => {
  try {
    const db = req.db;
    const { itemId } = req.params;

    const existing = db.prepare('SELECT * FROM task_checklist WHERE id = ?').get(itemId);
    if (!existing) {
      return res.status(404).json({ error: 'Item não encontrado' });
    }

    db.prepare('DELETE FROM task_checklist WHERE id = ?').run(itemId);

    // Reorder remaining items
    db.prepare(`
      UPDATE task_checklist SET position = position - 1
      WHERE task_id = ? AND position > ?
    `).run(existing.task_id, existing.position);

    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao excluir item' });
  }
});

module.exports = router;
