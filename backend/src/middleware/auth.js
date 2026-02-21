const jwt = require('jsonwebtoken');
const usersDb = require('../database/users');
const logger = require('../config/logger');
const { jwt: jwtConfig } = require('../config/security');

const JWT_SECRET = jwtConfig.secret;

function authMiddleware(req, res, next) {
  try {
    const authHeader = req.headers.authorization;

    // SECURITY: Only accept tokens via Authorization header (never query params)
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    // Verify user still exists and is active
    const user = usersDb.prepare('SELECT id, email, role, active FROM users WHERE id = ?').get(decoded.id);

    if (!user) {
      logger.securityEvent('invalid_token_user_not_found', { userId: decoded.id }, req);
      return res.status(401).json({ error: 'Usuário não encontrado' });
    }

    if (!user.active) {
      logger.securityEvent('inactive_user_access_attempt', { userId: user.id, email: user.email }, req);
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
      logger.securityEvent('invalid_jwt_token', { error: error.message }, req);
      return res.status(401).json({ error: 'Token inválido' });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    logger.error('Auth middleware error', { error: error.message });
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
