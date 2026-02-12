const jwt = require('jsonwebtoken');
const { Usuario } = require('../models');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'change-me';

const requireAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(401).json({
        error: true,
        message: 'No autorizado'
      });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    const user = await Usuario.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: true,
        message: 'No autorizado'
      });
    }

    if (!user.active || user.status === 'disabled') {
      return res.status(403).json({
        error: true,
        message: 'Cuenta deshabilitada'
      });
    }

    if (user.status === 'pending_verification') {
      return res.status(403).json({
        error: true,
        message: 'Cuenta pendiente de verificacion'
      });
    }

    req.user = {
      id: user._id,
      role: user.role,
      email: user.email,
      name: user.fullName || user.firstName,
      status: user.status
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: true,
      message: 'Token invalido o expirado'
    });
  }
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

module.exports = {
  requireAuth,
  requireRole
};
