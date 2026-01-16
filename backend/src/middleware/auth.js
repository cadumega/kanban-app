const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../routes/auth');
const usersDb = require('../database/users');

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists and is active
    const user = usersDb.prepare('SELECT id, email, role, active FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (!user.active) {
      return res.status(401).json({ error: 'Usuário desativado' });
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      role: user.role
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Erro de autenticação' });
  }
}

function masterOnly(req, res, next) {
  if (req.user.role !== 'master') {
    return res.status(403).json({ error: 'Acesso negado. Apenas master.' });
  }
  next();
}

module.exports = { authMiddleware, masterOnly };
