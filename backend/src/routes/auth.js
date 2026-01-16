const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const usersDb = require('../database/users');

const JWT_SECRET = process.env.JWT_SECRET || 'kanban-secret-key-2026';
const JWT_EXPIRES_IN = '7d';

// POST /api/auth/login
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const user = usersDb.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());

    if (!user) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    if (!user.active) {
      return res.status(401).json({ error: 'Usuário desativado. Contate o administrador.' });
    }

    const validPassword = bcrypt.compareSync(password, user.password_hash);
    if (!validPassword) {
      return res.status(401).json({ error: 'Email ou senha incorretos' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Erro ao fazer login' });
  }
});

// GET /api/auth/me - Get current user
router.get('/me', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = usersDb.prepare('SELECT id, email, name, role, active FROM users WHERE id = ?').get(decoded.id);

    if (!user || !user.active) {
      return res.status(401).json({ error: 'Usuário não encontrado ou desativado' });
    }

    res.json(user);
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
    res.status(500).json({ error: 'Erro ao verificar usuário' });
  }
});

// GET /api/auth/users - List all users (master only)
router.get('/users', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'master') {
      return res.status(403).json({ error: 'Acesso negado. Apenas master.' });
    }

    const users = usersDb.prepare(`
      SELECT id, email, name, role, active, created_at
      FROM users
      ORDER BY created_at DESC
    `).all();

    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao listar usuários' });
  }
});

// POST /api/auth/users - Create user (master only)
router.post('/users', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'master') {
      return res.status(403).json({ error: 'Acesso negado. Apenas master.' });
    }

    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    const exists = usersDb.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    usersDb.prepare(`
      INSERT INTO users (id, email, password_hash, name, role)
      VALUES (?, ?, ?, ?, 'user')
    `).run(id, email.toLowerCase(), passwordHash, name || '');

    res.status(201).json({
      id,
      email: email.toLowerCase(),
      name: name || '',
      role: 'user',
      active: 1
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ error: 'Erro ao criar usuário' });
  }
});

// PUT /api/auth/users/:id - Update user (master only)
router.put('/users/:id', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'master') {
      return res.status(403).json({ error: 'Acesso negado. Apenas master.' });
    }

    const { id } = req.params;
    const { name, password, active } = req.body;

    const user = usersDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    // Prevent deactivating master
    if (user.role === 'master' && active === 0) {
      return res.status(400).json({ error: 'Não é possível desativar o usuário master' });
    }

    let query = 'UPDATE users SET updated_at = CURRENT_TIMESTAMP';
    const params = [];

    if (name !== undefined) {
      query += ', name = ?';
      params.push(name);
    }
    if (password) {
      query += ', password_hash = ?';
      params.push(bcrypt.hashSync(password, 10));
    }
    if (active !== undefined) {
      query += ', active = ?';
      params.push(active ? 1 : 0);
    }

    query += ' WHERE id = ?';
    params.push(id);

    usersDb.prepare(query).run(...params);

    const updated = usersDb.prepare('SELECT id, email, name, role, active FROM users WHERE id = ?').get(id);
    res.json(updated);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Erro ao atualizar usuário' });
  }
});

// DELETE /api/auth/users/:id - Delete user (master only)
router.delete('/users/:id', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'master') {
      return res.status(403).json({ error: 'Acesso negado. Apenas master.' });
    }

    const { id } = req.params;

    const user = usersDb.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado' });
    }

    if (user.role === 'master') {
      return res.status(400).json({ error: 'Não é possível excluir o usuário master' });
    }

    usersDb.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Erro ao excluir usuário' });
  }
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
