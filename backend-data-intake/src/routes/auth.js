/**
 * ROUTES: Auth (Staff)
 * Autenticacion completa con access + refresh tokens
 */

const express = require('express');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const router = express.Router();

const { Usuario, Session, EmailToken } = require('../models');
const { requireAuth } = require('../middleware/auth');
const { authLoginRateLimiter, authPasswordRateLimiter } = require('../middleware/rateLimiter');
const { signAccessToken, generateRefreshToken, hashToken } = require('../utils/authTokens');
const { logAudit } = require('../utils/audit');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');

const ACCESS_TOKEN_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET || 'change-me';
const REFRESH_COOKIE_NAME = process.env.JWT_REFRESH_COOKIE || 'refreshToken';
const REQUIRE_EMAIL_VERIFICATION = process.env.REQUIRE_EMAIL_VERIFICATION === 'true';
const ALLOW_PUBLIC_REGISTER = process.env.ALLOW_PUBLIC_REGISTER === 'true';
const MAX_FAILED_LOGINS = parseInt(process.env.MAX_FAILED_LOGINS || '5', 10);
const LOCK_MINUTES = parseInt(process.env.LOCK_MINUTES || '15', 10);

const getClientMeta = (req) => ({
  ip: req.headers['x-forwarded-for']?.toString().split(',')[0]?.trim() || req.ip,
  userAgent: req.headers['user-agent'] || 'unknown'
});

const setRefreshCookie = (res, token, maxAgeMs) => {
  // ✅ Validar sameSite: solo valores permitidos
  const sameSiteRaw = (process.env.COOKIE_SAMESITE || 'lax').toLowerCase();
  const sameSite = ['lax', 'strict', 'none'].includes(sameSiteRaw) ? sameSiteRaw : 'lax';

  // ✅ Evaluación estricta: secure depende SOLO de COOKIE_SECURE (nunca auto-activado)
  const secure = String(process.env.COOKIE_SECURE).toLowerCase() === 'true';

  // ✅ Validación: SameSite=none REQUIERE Secure=true (estándar navegadores)
  if (sameSite === 'none' && !secure) {
    const msg = 
      'Configuración inválida: COOKIE_SAMESITE=none requiere COOKIE_SECURE=true. ' +
      'Los navegadores modernos ignoran cookies SameSite=None sin el flag Secure. ' +
      'Cambia COOKIE_SECURE=true en .env o usa COOKIE_SAMESITE=lax';
    
    if (process.env.NODE_ENV === 'production') {
      throw new Error(msg);
    }
    console.warn('[AUTH COOKIE WARNING]', msg);
  }

  const cookieMaxAge = maxAgeMs || Number(process.env.REFRESH_COOKIE_MAX_AGE_MS || 1000 * 60 * 60 * 24 * 7);

  res.cookie(REFRESH_COOKIE_NAME, token, {
    httpOnly: true,
    secure,
    sameSite,
    path: '/api/auth',
    maxAge: cookieMaxAge
  });
};

const clearRefreshCookie = (res) => {
  res.clearCookie(REFRESH_COOKIE_NAME, { path: '/api/auth' });
};

const createEmailToken = async (userId, type, expiresMinutes) => {
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + expiresMinutes * 60 * 1000);

  await EmailToken.create({
    userId,
    type,
    tokenHash,
    expiresAt
  });

  return rawToken;
};

const requireAdminOrOwner = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return res.status(403).json({
        error: true,
        message: 'Registro deshabilitado'
      });
    }

    const decoded = jwt.verify(token, ACCESS_TOKEN_SECRET);
    const user = await Usuario.findById(decoded.userId);

    if (!user || !['owner', 'admin'].includes(user.role)) {
      return res.status(403).json({
        error: true,
        message: 'Registro solo para administradores'
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
    return res.status(403).json({
      error: true,
      message: 'Registro solo para administradores'
    });
  }
};

/**
 * POST /api/auth/register
 * Registrar staff (solo admin/owner si no es publico)
 */
router.post('/register', async (req, res, next) => {
  const { username, email, password, firstName, lastName, role } = req.body;

  if (!username || !email || !password || !firstName || !lastName) {
    return res.status(400).json({
      error: true,
      message: 'Todos los campos son requeridos'
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      error: true,
      message: 'La contraseña debe tener al menos 8 caracteres'
    });
  }

  const existingUsers = await Usuario.countDocuments();
  if (existingUsers > 0 && !ALLOW_PUBLIC_REGISTER) {
    return requireAdminOrOwner(req, res, next);
  }

  next();
}, async (req, res) => {
  try {
    const { username, email, password, firstName, lastName, role } = req.body;

    const existingUser = await Usuario.findOne({
      $or: [{ username: username.toLowerCase() }, { email: email.toLowerCase() }]
    });

    if (existingUser) {
      return res.status(409).json({
        error: true,
        message: 'Username o email ya registrado'
      });
    }

    const isFirstUser = (await Usuario.countDocuments()) === 0;
    const normalizedRole = isFirstUser ? 'owner' : (role || 'staff');

    const nuevoUsuario = new Usuario({
      username,
      email,
      password,
      firstName,
      lastName,
      fullName: `${firstName} ${lastName}`,
      role: normalizedRole,
      active: true,
      status: REQUIRE_EMAIL_VERIFICATION ? 'pending_verification' : 'active'
    });

    await nuevoUsuario.save();

    if (REQUIRE_EMAIL_VERIFICATION) {
      const token = await createEmailToken(nuevoUsuario._id, 'verify_email', 60 * 24);
      await logAudit({
        userId: nuevoUsuario._id,
        action: 'REGISTER_PENDING_VERIFICATION',
        ...getClientMeta(req)
      });

      // Enviar email de verificación
      try {
        await sendVerificationEmail(nuevoUsuario, token);
      } catch (emailError) {
        console.error('Error enviando email de verificación:', emailError);
        // No fallar el registro si el email falla
      }
    }

    await logAudit({
      userId: nuevoUsuario._id,
      action: 'REGISTER_SUCCESS',
      ...getClientMeta(req)
    });

    if (REQUIRE_EMAIL_VERIFICATION) {
      return res.status(201).json({
        success: true,
        message: 'Cuenta creada. Revisa tu email para verificar.'
      });
    }

    const accessToken = signAccessToken(nuevoUsuario);
    const refresh = generateRefreshToken();

    await Session.create({
      userId: nuevoUsuario._id,
      refreshTokenHash: refresh.tokenHash,
      userAgent: req.headers['user-agent'],
      ip: getClientMeta(req).ip,
      expiresAt: refresh.expiresAt
    });

    setRefreshCookie(res, refresh.token, refresh.expiresAt.getTime() - Date.now());

    res.status(201).json({
      success: true,
      accessToken,
      user: nuevoUsuario.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al registrar usuario'
    });
  }
});

/**
 * POST /api/auth/login
 */
router.post('/login', authLoginRateLimiter, async (req, res) => {
  try {
    const { email, username, password } = req.body;

    if (!password || (!email && !username)) {
      return res.status(400).json({
        error: true,
        message: 'Email/usuario y password son requeridos'
      });
    }

    const usuario = await Usuario.findOne({
      $or: [
        { email: (email || '').toLowerCase() },
        { username: (username || '').toLowerCase() }
      ]
    });

    if (!usuario) {
      await logAudit({
        action: 'LOGIN_FAIL',
        meta: { reason: 'user_not_found' },
        ...getClientMeta(req)
      });
      return res.status(401).json({
        error: true,
        message: 'Credenciales invalidas'
      });
    }

    if (!usuario.active || usuario.status === 'disabled') {
      await logAudit({
        userId: usuario._id,
        action: 'LOGIN_BLOCKED',
        meta: { reason: 'disabled' },
        ...getClientMeta(req)
      });
      return res.status(403).json({
        error: true,
        message: 'Usuario desactivado'
      });
    }

    if (usuario.status === 'locked' && usuario.accountLockedUntil && usuario.accountLockedUntil <= Date.now()) {
      usuario.resetFailedLogin();
      await usuario.save();
    }

    if (usuario.isLocked()) {
      await logAudit({
        userId: usuario._id,
        action: 'LOGIN_BLOCKED',
        meta: { reason: 'locked' },
        ...getClientMeta(req)
      });
      return res.status(423).json({
        error: true,
        message: 'Cuenta bloqueada temporalmente'
      });
    }

    if (usuario.status === 'pending_verification') {
      return res.status(403).json({
        error: true,
        message: 'Verifica tu email para activar la cuenta'
      });
    }

    const passwordMatch = await usuario.comparePassword(password);

    if (!passwordMatch) {
      usuario.registerFailedLogin(MAX_FAILED_LOGINS, LOCK_MINUTES);
      await usuario.save();

      await logAudit({
        userId: usuario._id,
        action: 'LOGIN_FAIL',
        meta: { reason: 'invalid_password' },
        ...getClientMeta(req)
      });

      return res.status(401).json({
        error: true,
        message: 'Credenciales invalidas'
      });
    }

    usuario.resetFailedLogin();
    usuario.lastLogin = new Date();
    await usuario.save();

    const accessToken = signAccessToken(usuario);
    const refresh = generateRefreshToken();

    await Session.create({
      userId: usuario._id,
      refreshTokenHash: refresh.tokenHash,
      userAgent: req.headers['user-agent'],
      ip: getClientMeta(req).ip,
      expiresAt: refresh.expiresAt
    });

    setRefreshCookie(res, refresh.token, refresh.expiresAt.getTime() - Date.now());

    await logAudit({
      userId: usuario._id,
      action: 'LOGIN_SUCCESS',
      ...getClientMeta(req)
    });

    res.json({
      success: true,
      accessToken,
      user: usuario.toJSON()
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al iniciar sesion'
    });
  }
});

/**
 * POST /api/auth/refresh
 */
router.post('/refresh', async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshToken) {
      return res.status(401).json({
        error: true,
        message: 'No autorizado'
      });
    }

    const refreshHash = hashToken(refreshToken);
    const session = await Session.findOne({
      refreshTokenHash: refreshHash,
      revokedAt: { $exists: false }
    });

    if (!session || session.expiresAt < new Date()) {
      return res.status(401).json({
        error: true,
        message: 'Sesion expirada'
      });
    }

    const user = await Usuario.findById(session.userId);
    if (!user || !user.active || user.status === 'disabled') {
      return res.status(401).json({
        error: true,
        message: 'No autorizado'
      });
    }

    const accessToken = signAccessToken(user);
    const newRefresh = generateRefreshToken();

    session.refreshTokenHash = newRefresh.tokenHash;
    session.rotatedAt = new Date();
    session.rotatedFrom = refreshHash;
    session.expiresAt = newRefresh.expiresAt;
    await session.save();

    setRefreshCookie(res, newRefresh.token, newRefresh.expiresAt.getTime() - Date.now());

    res.json({
      success: true,
      accessToken
    });
  } catch (error) {
    res.status(401).json({
      error: true,
      message: 'No autorizado'
    });
  }
});

/**
 * POST /api/auth/logout
 */
router.post('/logout', async (req, res) => {
  try {
    const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshToken) {
      const refreshHash = hashToken(refreshToken);
      await Session.findOneAndUpdate(
        { refreshTokenHash: refreshHash, revokedAt: { $exists: false } },
        { revokedAt: new Date() }
      );
    }

    clearRefreshCookie(res);

    res.json({
      success: true,
      message: 'Sesion cerrada'
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al cerrar sesion'
    });
  }
});

/**
 * GET /api/auth/me
 */
router.get('/me', requireAuth, async (req, res) => {
  const usuario = await Usuario.findById(req.user.id);

  if (!usuario) {
    return res.status(404).json({
      error: true,
      message: 'Usuario no encontrado'
    });
  }

  res.json({
    success: true,
    user: usuario.toJSON()
  });
});

/**
 * POST /api/auth/verify-email
 */
router.post('/verify-email', authPasswordRateLimiter, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) {
      return res.status(400).json({
        error: true,
        message: 'Token requerido'
      });
    }

    const tokenHash = hashToken(token);
    const emailToken = await EmailToken.findOne({
      tokenHash,
      type: 'verify_email',
      usedAt: { $exists: false }
    });

    if (!emailToken || emailToken.expiresAt < new Date()) {
      return res.status(400).json({
        error: true,
        message: 'Token invalido o expirado'
      });
    }

    const user = await Usuario.findById(emailToken.userId);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'Usuario no encontrado'
      });
    }

    user.emailVerifiedAt = new Date();
    user.status = 'active';
    await user.save();

    emailToken.usedAt = new Date();
    await emailToken.save();

    await logAudit({
      userId: user._id,
      action: 'EMAIL_VERIFIED',
      ...getClientMeta(req)
    });

    res.json({
      success: true,
      message: 'Email verificado'
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al verificar email'
    });
  }
});

/**
 * POST /api/auth/forgot-password
 */
router.post('/forgot-password', authPasswordRateLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await Usuario.findOne({ email: (email || '').toLowerCase() });

    if (user) {
      const token = await createEmailToken(user._id, 'reset_password', 60);
      await logAudit({
        userId: user._id,
        action: 'RESET_REQUEST',
        ...getClientMeta(req)
      });

      // Enviar email de reset de password
      try {
        await sendPasswordResetEmail(user, token);
      } catch (emailError) {
        console.error('Error enviando email de reset:', emailError);
        // No revelar si el email existe o no
      }
    }

    res.json({
      success: true,
      message: 'Si el email existe, se enviara un enlace de recuperacion'
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al solicitar recuperacion'
    });
  }
});

/**
 * POST /api/auth/reset-password
 */
router.post('/reset-password', authPasswordRateLimiter, async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        error: true,
        message: 'Token y nueva contraseña requeridos'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: true,
        message: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    const tokenHash = hashToken(token);
    const emailToken = await EmailToken.findOne({
      tokenHash,
      type: 'reset_password',
      usedAt: { $exists: false }
    });

    if (!emailToken || emailToken.expiresAt < new Date()) {
      return res.status(400).json({
        error: true,
        message: 'Token invalido o expirado'
      });
    }

    const user = await Usuario.findById(emailToken.userId);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'Usuario no encontrado'
      });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    emailToken.usedAt = new Date();
    await emailToken.save();

    await Session.updateMany({ userId: user._id }, { revokedAt: new Date() });
    clearRefreshCookie(res);

    await logAudit({
      userId: user._id,
      action: 'PASSWORD_RESET',
      ...getClientMeta(req)
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada'
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al restablecer contraseña'
    });
  }
});

/**
 * POST /api/auth/change-password
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        error: true,
        message: 'Contraseña actual y nueva requeridas'
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: true,
        message: 'La contraseña debe tener al menos 8 caracteres'
      });
    }

    const user = await Usuario.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        error: true,
        message: 'Usuario no encontrado'
      });
    }

    const ok = await user.comparePassword(currentPassword);
    if (!ok) {
      return res.status(400).json({
        error: true,
        message: 'Contraseña actual incorrecta'
      });
    }

    user.password = newPassword;
    user.passwordChangedAt = new Date();
    await user.save();

    await Session.updateMany({ userId: user._id }, { revokedAt: new Date() });
    clearRefreshCookie(res);

    await logAudit({
      userId: user._id,
      action: 'PASSWORD_CHANGE',
      ...getClientMeta(req)
    });

    res.json({
      success: true,
      message: 'Contraseña actualizada'
    });
  } catch (error) {
    res.status(500).json({
      error: true,
      message: 'Error al cambiar contraseña'
    });
  }
});

/**
 * GET /api/auth/sessions
 */
router.get('/sessions', requireAuth, async (req, res) => {
  const sessions = await Session.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .lean();

  res.json({
    success: true,
    data: sessions.map((s) => ({
      id: s._id,
      createdAt: s.createdAt,
      expiresAt: s.expiresAt,
      revokedAt: s.revokedAt,
      userAgent: s.userAgent,
      ip: s.ip
    }))
  });
});

/**
 * DELETE /api/auth/sessions/:id
 */
router.delete('/sessions/:id', requireAuth, async (req, res) => {
  await Session.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { revokedAt: new Date() }
  );

  res.json({
    success: true,
    message: 'Sesion cerrada'
  });
});

/**
 * DELETE /api/auth/sessions
 */
router.delete('/sessions', requireAuth, async (req, res) => {
  await Session.updateMany({ userId: req.user.id }, { revokedAt: new Date() });
  clearRefreshCookie(res);

  res.json({
    success: true,
    message: 'Sesiones cerradas'
  });
});

module.exports = router;
