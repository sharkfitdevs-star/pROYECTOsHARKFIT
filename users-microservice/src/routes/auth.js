const express = require('express');
const fetch = global.fetch || require('node-fetch');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const router = express.Router();

// función reutilizable para validar contraseña según reglas compartidas
const isPasswordValid = (password) => {
  const hasMinLength = password.length >= 6;
  const hasUppercase = /[A-Z]/.test(password);
  const hasLowercase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  return hasMinLength && hasUppercase && hasLowercase && hasNumber;
};

// Registro de usuario
router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;

    // validación de contraseña antes de cualquier otra cosa
    if (!isPasswordValid(password)) {
      console.warn('REGISTER 400 – password does not meet complexity requirements');
      return res.status(400).json({
        error: true,
        message: 'Validación fallida',
        fields: {
          password: 'Contraseña debe incluir mayúsculas, minúsculas y números'
        }
      });
    }

    const user = new User({ username, email, password, fullName });
    await user.save();
    res.status(201).json({ message: 'Usuario registrado correctamente' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Login de usuario (acepta email o username en identifier/email/username)
router.post('/login', async (req, res) => {
  const requestId = req.headers['x-request-id'] || '<none>';
  try {
    const { identifier, email, username, password } = req.body || {};
    const loginIdentifier = identifier || email || username;

    // basic validation
    if (!loginIdentifier || !password) {
      console.warn('[LOGIN] missing fields', { requestId, loginIdentifier });
      return res.status(400).json({ ok: false, error: 'VALIDATION_ERROR' });
    }

    console.log('[LOGIN] attempt', { requestId, identifier: loginIdentifier });

    let user;
    try {
      user = await User.findOne({
        $or: [
          { username: loginIdentifier },
          { email: loginIdentifier },
        ],
      });
    } catch (dbErr) {
      console.error('[LOGIN] DB error', { requestId, err: dbErr.message });
      return res.status(503).json({ ok: false, error: 'DB_NOT_READY' });
    }

    if (!user) {
      console.warn('[LOGIN] invalid creds', { requestId, identifier: loginIdentifier });
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    let isMatch;
    try {
      isMatch = await (user.comparePassword
        ? user.comparePassword(password)
        : require('bcryptjs').compare(password, user.password));
    } catch (bcryptErr) {
      console.error('[LOGIN] bcrypt error', { requestId, err: bcryptErr.message });
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    if (!isMatch) {
      console.warn('[LOGIN] invalid creds - wrong password', { requestId, identifier: loginIdentifier });
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    // derive secret from env (single source of truth)
    const secret = process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      console.error('[LOGIN] server misconfig: missing JWT secret', { requestId });
      return res.status(500).json({ ok: false, error: 'SERVER_MISCONFIG' });
    }

    // include both `id` and `userId` claims so downstream services can
    // use whichever they expect (intake checks both).
    const payload = {
      id: user._id,
      userId: user._id,
      username: user.username,
      role: user.role || 'user'
    };

    let token;
    try {
      token = jwt.sign(payload, secret, { expiresIn: '1d' });
    } catch (jwtErr) {
      console.error('[LOGIN] jwt sign error', { requestId, err: jwtErr.message });
      return res.status(500).json({ ok: false, error: 'SERVER_MISCONFIG' });
    }

    if (process.env.NODE_ENV !== 'production') {
      // help developers see what's being embedded
      console.debug('[LOGIN] jwt payload:', payload);
    }

    res.json({
      success: true,
      accessToken: token,
      user: {
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
      },
    });

    // fire-and-forget sync to intake service so it has a local copy of user
    (async () => {
      try {
        const intakeUrl = 'http://localhost:3005/api/internal/users/upsert';
        await fetch(intakeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-internal-api-key': process.env.INTERNAL_API_KEY || ''
          },
          body: JSON.stringify({
            id: user._id,
            username: user.username,
            email: user.email,
            role: user.role
          })
        });
      } catch (e) {
        console.warn('[AUTH] failed to notify intake:', e.message || e);
      }
    })();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// simple health check for proxy verification
router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'users-microservice' });
});

module.exports = router;
