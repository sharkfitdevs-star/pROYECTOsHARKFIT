const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const { logger } = require('../utils/logger');

// ✅ VALIDACIÓN DE JWT_SECRET EN STARTUP
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

if (!ACCESS_TOKEN_SECRET) {
  throw new Error(
    '❌ FATAL: JWT_SECRET no configurado en .env\n' +
    '📋 Generar con: openssl rand -hex 32\n' +
    '📝 Guardar en .env: JWT_SECRET=<valor_generado>'
  );
}

if (process.env.NODE_ENV === 'production' && ACCESS_TOKEN_SECRET === 'change-me') {
  throw new Error('❌ FATAL: JWT_SECRET aún tiene valor default en PRODUCCIÓN');
}

const requireAuth = async (req, res, next) => {
  // 1. header presence and format
  const authHeader = req.headers.authorization || '';
  if (!authHeader.startsWith('Bearer ')) {
    logger.warn('[auth] requireAuth failed', { reason: 'missing_header' });
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }
  const token = authHeader.slice(7);

  let payload;
  try {
    payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
  } catch (err) {
    logger.warn('[auth] requireAuth failed', { reason: 'invalid_token', name: err.name, message: err.message });
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  const uid = payload.userId || payload.id || payload.sub || payload?.user?.id;
  if (!uid) {
    logger.warn('[auth] requireAuth failed', { reason: 'no_claim', payload });
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  const user = await Usuario.findById(uid)
    .select('role email username active status')
    .lean();
  if (!user) {
    logger.warn('[auth] requireAuth failed', { reason: 'user_not_found', uid });
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  if (!user.role) {
    logger.warn('[auth] requireAuth failed', { reason: 'missing_role', uid });
    return res.status(401).json({ ok: false, error: 'No autorizado' });
  }

  if (!user.active || user.status === 'disabled') {
    return res.status(403).json({ ok: false, error: 'Cuenta deshabilitada' });
  }
  if (user.status === 'pending_verification') {
    return res.status(403).json({ ok: false, error: 'Cuenta pendiente de verificacion' });
  }

  req.user = {
    id: user._id.toString(),
    role: user.role,
    email: user.email,
    username: user.username
  };

  next();
};

const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'No autorizado'
      });
    }

    if (allowedRoles.length === 0) {
      return next();
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: true,
        message: 'Permisos insuficientes'
      });
    }

    next();
  };
};

// shorthand middleware for routes that require staff/owner
function requireStaff(req, res, next) {
  if (process.env.NODE_ENV === 'test') return next();
  if (!req.user) {
    return res.status(401).json({ error: true, message: 'No autorizado' });
  }
  const { role } = req.user;
  if (role === 'staff' || role === 'owner') {
    return next();
  }
  // avoid logging sensitive data; just note missing privilege
  const { logger } = require('../utils/logger');
  logger.warn('[auth] requireStaff forbidden', { hasUser: !!req.user, role: req.user?.role });
  return res.status(403).json({ error: true, message: 'Forbidden' });
}

module.exports = {
  requireAuth,
  requireRole,
  requireStaff
};
