const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const rateLimit = require('express-rate-limit');
const usersDb = require('../database/users');
const { getUserDb } = require('../database/userDb');
const logger = require('../config/logger');
const { jwt: jwtConfig, rateLimit: rateLimitConfig } = require('../config/security');

const JWT_SECRET = jwtConfig.secret;
const JWT_EXPIRES_IN = jwtConfig.expiresIn;

// Rate limiter for login attempts (prevents brute force)
const loginLimiter = rateLimit({
  windowMs: rateLimitConfig.windowMs,
  max: rateLimitConfig.loginMaxAttempts,
  message: { error: 'Muitas tentativas de login. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res, next, options) => {
    logger.securityEvent('rate_limit_exceeded', {
      type: 'login',
      email: req.body?.email
    }, req);
    res.status(429).json(options.message);
  }
});

// POST /api/auth/login
router.post('/login', loginLimiter, (req, res) => {
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

    logger.authEvent('login_success', user.id, user.email, true);

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
    logger.error('Login error', { error: error.message });
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
      SELECT id, email, name, role, active, delegated_to, created_at
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

    const { email, password, name, share_workspace } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email e senha são obrigatórios' });
    }

    // Password strength validation
    if (password.length < 8) {
      return res.status(400).json({ error: 'Senha deve ter no mínimo 8 caracteres' });
    }
    if (!/[A-Z]/.test(password)) {
      return res.status(400).json({ error: 'Senha deve conter pelo menos uma letra maiúscula' });
    }
    if (!/[0-9]/.test(password)) {
      return res.status(400).json({ error: 'Senha deve conter pelo menos um número' });
    }

    // Email format validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Formato de email inválido' });
    }

    const exists = usersDb.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
    if (exists) {
      return res.status(400).json({ error: 'Email já cadastrado' });
    }

    const id = uuidv4();
    const passwordHash = bcrypt.hashSync(password, 10);

    // If share_workspace is true, delegate to the master who is creating
    const delegatedTo = share_workspace ? decoded.email : null;

    usersDb.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, delegated_to)
      VALUES (?, ?, ?, ?, 'user', ?)
    `).run(id, email.toLowerCase(), passwordHash, name || '', delegatedTo);

    res.status(201).json({
      id,
      email: email.toLowerCase(),
      name: name || '',
      role: 'user',
      active: 1,
      delegated_to: delegatedTo
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
    const { name, password, active, share_workspace } = req.body;

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

    // Handle share_workspace changes
    if (share_workspace !== undefined) {
      // If was delegated and now removing delegation, deactivate user
      if (user.delegated_to && !share_workspace) {
        query += ', delegated_to = NULL, active = 0';
      } else if (share_workspace) {
        // Set delegation to the master making the request
        query += ', delegated_to = ?';
        params.push(decoded.email);
      } else {
        query += ', delegated_to = NULL';
      }
    }

    query += ' WHERE id = ?';
    params.push(id);

    usersDb.prepare(query).run(...params);

    const updated = usersDb.prepare('SELECT id, email, name, role, active, delegated_to FROM users WHERE id = ?').get(id);
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

// GET /api/auth/audit-logs - Get audit logs (master only)
router.get('/audit-logs', (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Não autorizado' });

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'master') {
      return res.status(403).json({ error: 'Acesso negado. Apenas master.' });
    }

    const { limit = 50, offset = 0, user, entity_type } = req.query;
    const db = getUserDb(decoded.email); // Master's workspace

    let query = 'SELECT * FROM audit_logs WHERE 1=1';
    const params = [];

    if (user) {
      query += ' AND user_email = ?';
      params.push(user);
    }
    if (entity_type) {
      query += ' AND entity_type = ?';
      params.push(entity_type);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));

    const logs = db.prepare(query).all(...params);

    // Get total count for pagination
    let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
    const countParams = [];
    if (user) {
      countQuery += ' AND user_email = ?';
      countParams.push(user);
    }
    if (entity_type) {
      countQuery += ' AND entity_type = ?';
      countParams.push(entity_type);
    }
    const { total } = db.prepare(countQuery).get(...countParams);

    // Get list of users who have activity in audit logs
    const users = db.prepare('SELECT DISTINCT user_email, user_name FROM audit_logs ORDER BY user_email').all();

    res.json({
      logs,
      total,
      users,
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
  } catch (error) {
    console.error('Audit logs error:', error);
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token inválido ou expirado' });
    }
    res.status(500).json({ error: 'Erro ao buscar histórico de atividades' });
  }
});

module.exports = router;
module.exports.JWT_SECRET = JWT_SECRET;
