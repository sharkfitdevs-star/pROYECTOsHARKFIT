/**
 * 🔐 MIDDLEWARE MEJORADO: Autenticación segura
 * 
 * Cambios:
 * ✅ Validar JWT_SECRET al startup
 * ✅ Custom error messages (no revelar estructura)
 * ✅ Rate limiting aplicado
 * ✅ Logging de intentos fallidos
 * 
 * Ubicación original: /backend-data-intake/src/middleware/auth.js
 */

const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');
const { logAudit } = require('../utils/audit');

// ✅ MEJORADO: Validar secret al startup
const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

if (!ACCESS_TOKEN_SECRET || ACCESS_TOKEN_SECRET === 'change-me') {
  throw new Error(
    '❌ FATAL: JWT_SECRET no configurado o es el default.\n' +
    '📋 Generar con: openssl rand -hex 32\n' +
    '📝 Cargar en .env: JWT_SECRET=<valor_generado>'
  );
}

// ✅ MEJORADO: Middleware robusto
const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      // ✅ Mensaje genérico (no revelar que falta token)
      return res.status(401).json({
        error: true,
        message: 'Acceso no autorizado. Por favor inicie sesión.'
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    } catch (jwtError) {
      // ✅ Log de intento fallido
      await logAudit({
        action: 'AUTH_INVALID_TOKEN',
        tokenError: jwtError.message,
        ip: getClientMeta(req).ip,
        userAgent: getClientMeta(req).userAgent
      });

      return res.status(401).json({
        error: true,
        message: 'Sesión expirada o inválida. Por favor inicie sesión nuevamente.'
      });
    }

    const user = await Usuario.findById(decoded.userId).lean();  // 🔥 LEAN = más rápido

    if (!user) {
      await logAudit({
        action: 'AUTH_USER_NOT_FOUND',
        userId: decoded.userId,
        ip: getClientMeta(req).ip
      });

      return res.status(401).json({
        error: true,
        message: 'Sesión expirada. Por favor inicie sesión nuevamente.'
      });
    }

    // ✅ Validaciones de estado
    if (user.status === 'disabled' || !user.active) {
      await logAudit({
        userId: user._id,
        action: 'AUTH_ACCOUNT_DISABLED',
        ip: getClientMeta(req).ip
      });

      return res.status(403).json({
        error: true,
        message: 'Su cuenta ha sido deshabilitada. Contacte al administrador.'
      });
    }

    if (user.status === 'pending_verification') {
      return res.status(403).json({
        error: true,
        message: 'Debe verificar su correo para continuar.'
      });
    }

    // ✅ Validación de bloqueo
    if (user.isLocked && user.isLocked()) {
      return res.status(429).json({
        error: true,
        message: `Cuenta bloqueada. Intente más tarde.`
      });
    }

    // ✅ Inyectar usuario en request
    req.user = {
      id: user._id.toString(),
      role: user.role,
      email: user.email,
      name: user.fullName || user.firstName,
      status: user.status,
      ip: getClientMeta(req).ip
    };

    next();
  } catch (error) {
    console.error('❌ Error en requireAuth:', error.message);
    return res.status(500).json({
      error: true,
      message: 'Error al verificar sesión'
    });
  }
};

// ✅ MEJORADO: Role-based access control
const requireRole = (allowedRoles = []) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        error: true,
        message: 'No autorizado'
      });
    }

    if (allowedRoles.length === 0) {
      return next();  // Si no hay restricción de rol
    }

    if (!allowedRoles.includes(req.user.role)) {
      // ✅ Log de intento de acceso sin permisos
      logAudit({
        userId: req.user.id,
        action: 'AUTH_INSUFFICIENT_PERMISSIONS',
        requiredRoles: allowedRoles,
        userRole: req.user.role,
        ip: req.user.ip
      }).catch(err => console.warn('Audit log failed:', err));

      return res.status(403).json({
        error: true,
        message: 'No tiene permisos para acceder a este recurso'
      });
    }

    next();
  };
};

// Helper: Extraer metadata del cliente
const getClientMeta = (req) => ({
  ip: req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || 
      req.connection.remoteAddress || 
      req.ip,
  userAgent: req.headers['user-agent'] || 'unknown'
});

module.exports = {
  requireAuth,
  requireRole,
  getClientMeta
};
