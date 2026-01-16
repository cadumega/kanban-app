const express = require('express');
const router = express.Router();
const { v4: uuidv4 } = require('uuid');

// GET all projects with task counts
router.get('/', (req, res) => {
  try {
    const db = req.db;
    const projects = db.prepare(`
      SELECT
        p.*,
        COUNT(DISTINCT t.id) as task_count,
        SUM(CASE WHEN c.title LIKE '%conclu%' THEN 1 ELSE 0 END) as completed_tasks,
        SUM(COALESCE(t.value, 0)) as total_value,
        SUM(COALESCE(t.points, 0)) as total_points,
        MIN(t.start_date) as earliest_start,
        MAX(DATE(t.start_date, '+' || t.points || ' days')) as latest_end
      FROM projects p
      LEFT JOIN tasks t ON t.project = p.name
      LEFT JOIN columns c ON t.column_id = c.id
      GROUP BY p.id
      ORDER BY p.start_date ASC, p.name ASC
    `).all();

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET project by ID with all tasks
router.get('/:id', (req, res) => {
  try {
    const db = req.db;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);

    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    // Get tasks for this project
    const tasks = db.prepare(`
      SELECT
        t.*,
        cat.name as category_name,
        cat.color as category_color,
        c.title as column_title
      FROM tasks t
      LEFT JOIN categories cat ON t.category_id = cat.id
      LEFT JOIN columns c ON t.column_id = c.id
      WHERE t.project = ?
      ORDER BY t.start_date ASC, t.position ASC
    `).all(project.name);

    res.json({ ...project, tasks });
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET roadmap data - tasks grouped by project for timeline
router.get('/roadmap/timeline', (req, res) => {
  try {
    const db = req.db;
    // Get all tasks that have a project and start_date, grouped by project
    const tasks = db.prepare(`
      SELECT
        t.id,
        t.title,
        t.project,
        t.start_date,
        t.points,
        t.priority,
        t.updated_at,
        c.title as column_title,
        CASE WHEN c.title LIKE '%conclu%' THEN 1 ELSE 0 END as is_completed,
        CASE WHEN c.title LIKE '%conclu%' THEN DATE(t.updated_at) ELSE NULL END as completed_date,
        cat.name as category_name,
        cat.color as category_color
      FROM tasks t
      LEFT JOIN columns c ON t.column_id = c.id
      LEFT JOIN categories cat ON t.category_id = cat.id
      WHERE t.project IS NOT NULL
        AND t.project != ''
        AND t.start_date IS NOT NULL
      ORDER BY t.project ASC, t.start_date ASC
    `).all();

    // Group tasks by project
    const projectsMap = {};
    tasks.forEach(task => {
      if (!projectsMap[task.project]) {
        projectsMap[task.project] = {
          name: task.project,
          tasks: [],
          task_count: 0,
          completed_tasks: 0
        };
      }
      projectsMap[task.project].tasks.push(task);
      projectsMap[task.project].task_count++;
      if (task.is_completed) {
        projectsMap[task.project].completed_tasks++;
      }
    });

    // Convert to array and calculate project date ranges
    const projects = Object.values(projectsMap).map(project => {
      const projectTasks = project.tasks;
      const startDates = projectTasks.map(t => t.start_date).filter(Boolean);
      const endDates = projectTasks.map(t => {
        if (t.is_completed && t.completed_date) {
          return t.completed_date;
        }
        // If not completed, use start_date + points as deadline
        if (t.start_date && t.points > 0) {
          const start = new Date(t.start_date);
          start.setDate(start.getDate() + t.points);
          return start.toISOString().split('T')[0];
        }
        return t.start_date;
      }).filter(Boolean);

      return {
        ...project,
        start_date: startDates.length > 0 ? startDates.sort()[0] : null,
        end_date: endDates.length > 0 ? endDates.sort().reverse()[0] : null,
        color: '#8B5CF6' // Default project color
      };
    });

    res.json({ projects });
  } catch (error) {
    console.error('Error fetching roadmap:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST create project
router.post('/', (req, res) => {
  try {
    const db = req.db;
    const { name, description, color, status, start_date, end_date } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório' });
    }

    const id = uuidv4();

    db.prepare(`
      INSERT INTO projects (id, name, description, color, status, start_date, end_date)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      name.trim(),
      description || '',
      color || '#6366F1',
      status || 'active',
      start_date || null,
      end_date || null
    );

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.status(201).json(project);
  } catch (error) {
    console.error('Error creating project:', error);
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Já existe um projeto com este nome' });
    }
    res.status(500).json({ error: error.message });
  }
});

// PUT update project
router.put('/:id', (req, res) => {
  try {
    const db = req.db;
    const { name, description, color, status, start_date, end_date } = req.body;
    const { id } = req.params;

    const existing = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    if (!existing) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    // If name is changing, update tasks with old project name
    if (name && name !== existing.name) {
      db.prepare('UPDATE tasks SET project = ? WHERE project = ?').run(name.trim(), existing.name);
    }

    db.prepare(`
      UPDATE projects
      SET name = ?, description = ?, color = ?, status = ?, start_date = ?, end_date = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(
      name?.trim() || existing.name,
      description ?? existing.description,
      color || existing.color,
      status || existing.status,
      start_date !== undefined ? start_date : existing.start_date,
      end_date !== undefined ? end_date : existing.end_date,
      id
    );

    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(id);
    res.json(project);
  } catch (error) {
    console.error('Error updating project:', error);
    if (error.message.includes('UNIQUE constraint')) {
      return res.status(400).json({ error: 'Já existe um projeto com este nome' });
    }
    res.status(500).json({ error: error.message });
  }
});

// DELETE project
router.delete('/:id', (req, res) => {
  try {
    const db = req.db;
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Projeto não encontrado' });
    }

    // Clear project field from tasks (don't delete tasks)
    db.prepare('UPDATE tasks SET project = NULL WHERE project = ?').run(project.name);

    // Delete project
    db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);

    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
