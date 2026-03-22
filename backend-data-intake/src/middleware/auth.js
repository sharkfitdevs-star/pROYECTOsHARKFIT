/*
Authentication model:
 - Users are owned by users-microservice.
 - backend-data-intake trusts JWT signature; tokens are issued only by auth service.
 - No local user lookup is performed; req.user is built from JWT claims.
 - Role-based restrictions are enforced via requireStaff or requireRole middleware.
*/

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { logger } = require('../utils/logger');

// ✅ VALIDACIÓN DEL SECRETO EN STARTUP
// single source of truth: JWT_ACCESS_SECRET (with fallbacks)
const ACCESS_TOKEN_SECRET =
  process.env.JWT_ACCESS_SECRET ||
  process.env.ACCESS_TOKEN_SECRET ||
  process.env.JWT_SECRET;

if (!ACCESS_TOKEN_SECRET) {
  throw new Error(
    '❌ FATAL: ningún secreto JWT configurado. ' +
    'Usar JWT_ACCESS_SECRET (o ACCESS_TOKEN_SECRET / JWT_SECRET)'
  );
}
if (process.env.NODE_ENV === 'production' && ACCESS_TOKEN_SECRET === 'change-me') {
  throw new Error('❌ FATAL: secreto JWT por defecto en producción');
}

const requireAuth = async (req, res, next) => {
  // [DEBUG-AUTH] Headers recibidos: ... (eliminado por seguridad)
  // if database isn't ready, avoid crashing deeper layers
  if (!mongoose.connection || mongoose.connection.readyState !== 1) {
    logger.warn('[auth] requireAuth failed', { reason: 'db_unavailable', readyState: mongoose.connection ? mongoose.connection.readyState : null });
    return res.status(503).json({ ok: false, error: 'DB_UNAVAILABLE' });
  }

  // 1. header presence and format
  // previously only `Authorization: Bearer <token>` was accepted. now we
  // also support `x-session-token: <token>`. authorization header has
  // priority when present, even if malformed it triggers a missing-token
  // response rather than falling back to the second header.
  const authHeader = req.headers.authorization;
  let token;

  if (authHeader !== undefined) {
    if (typeof authHeader === 'string' && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    } else {
      logger.warn('[auth] requireAuth failed', { reason: 'bad_auth_header', value: authHeader });
      res.set('X-Service', 'backend-data-intake');
      return res.status(401).json({ ok: false, error: 'MISSING_TOKEN' });
    }
  } else if (req.headers['x-session-token']) {
    token = req.headers['x-session-token'];
  }

  if (!token) {
    logger.warn('[auth] requireAuth failed', { reason: 'missing_token' });
    res.set('X-Service', 'backend-data-intake');
    return res.status(401).json({ ok: false, error: 'MISSING_TOKEN' });
  }

  let payload;
  try {
    payload = jwt.verify(token, ACCESS_TOKEN_SECRET);
    if (process.env.NODE_ENV !== 'production') {
      // show decoded contents for debugging without revealing the token
      const decoded = payload;
      console.debug('[auth] JWT ok', { sub: decoded.userId||decoded.id||decoded.sub, role: decoded.role });
      console.debug('[auth] decoded payload:', decoded);
      console.debug('[auth] payload type:', typeof decoded, 'keys:', Object.keys(decoded));
    }
  } catch (err) {
    // log detailed reason but always return INVALID_TOKEN per requirements
    let reason;
    if (err.name === 'TokenExpiredError') reason = 'expired';
    else if (err.name === 'JsonWebTokenError') reason = 'bad_signature_or_malformed';
    else if (err.name === 'NotBeforeError') reason = 'not_active_yet';
    else reason = 'unknown';

    logger.warn('[auth] JWT verify failed', {
      name: err.name,
      message: err.message,
      reason
    });

    res.set('X-Service', 'backend-data-intake');
    return res.status(401).json({ ok: false, error: 'INVALID_TOKEN' });
  }

  const uid = payload.userId || payload.id || payload.sub || payload?.user?.id;
  if (process.env.NODE_ENV !== 'production') {
    console.debug('[auth] user lookup id:', uid);
  }
  if (!uid) {
    logger.warn('[auth] requireAuth failed', { reason: 'no_claim', payload });
    res.set('X-Service', 'backend-data-intake');
    return res.status(401).json({ ok: false, error: 'TOKEN_PAYLOAD_INVALID' });
  }

  // build user object directly from JWT claims; we no longer depend on a
  // local user collection because users live in the auth microservice.
  const role = payload.role || null;
  const username = payload.username || payload.user?.username || null;
  const email = payload.email || null;

  req.user = {
    id: uid.toString(),
    role,
    username,
    email
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
  // do not bypass on test env: we want to validate role during automated tests
  if (!req.user) {
    return res.status(401).json({ ok: false, error: 'UNAUTHORIZED' });
  }
  const { role } = req.user;
  if (process.env.NODE_ENV !== 'production') {
    // debug output in development for easier troubleshooting
    console.debug('[auth] requireStaff check, role=', role);
  }
  // allowed roles
  if (role === 'staff' || role === 'owner') {
    return next();
  }
  // avoid logging sensitive data; just note missing privilege
  const { logger } = require('../utils/logger');
  logger.warn('[auth] requireStaff forbidden', { hasUser: !!req.user, role });
  return res.status(403).json({ ok: false, error: 'INSUFFICIENT_ROLE' });
}

module.exports = {
  requireAuth,
  requireRole,
  requireStaff
};
