const express = require('express');
const fetch = global.fetch || require('node-fetch');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const router = express.Router();

const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: process.env.NODE_ENV === 'production' ? 5 : 1000,
  message: { ok: false, error: 'RATE_LIMIT_EXCEEDED' },
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => {
    if (process.env.NODE_ENV !== 'production') return req.ip;
    const body = req.body || {};
    const identifier = body.identifier || body.email || body.username || '';
    return identifier.toLowerCase() + '_' + req.ip;
  }
});

const isPasswordValid = (password) => {
  return (
    password.length >= 6 &&
    /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /[0-9]/.test(password)
  );
};

router.post('/register', async (req, res) => {
  try {
    const { username, email, password, fullName } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ ok: false, error: 'MISSING_FIELDS' });
    }
    if (!isPasswordValid(password)) {
      return res.status(400).json({
        ok: false,
        error: 'WEAK_PASSWORD',
        message: 'La contraseña debe tener mínimo 6 caracteres, mayúsculas, minúsculas y números'
      });
    }
    const user = new User({ username, email, password, fullName });
    await user.save();
    return res.status(201).json({ ok: true, message: 'Usuario registrado' });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ ok: false, error: 'USER_ALREADY_EXISTS' });
    }
    return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
  }
});

router.post('/login', loginRateLimiter, async (req, res) => {
  const requestId = req.headers['x-request-id'] || require('crypto').randomUUID();
  try {
    const { identifier, email, username, password } = req.body || {};
    const loginIdentifier = (identifier || email || username || '').trim();

    if (!loginIdentifier || !password) {
      return res.status(400).json({ ok: false, error: 'VALIDATION_ERROR' });
    }

    let user;
    try {
      user = await User.findOne({
        $or: [
          { username: loginIdentifier.toLowerCase() },
          { email: loginIdentifier.toLowerCase() }
        ]
      });
    } catch (dbErr) {
      return res.status(503).json({ ok: false, error: 'DB_NOT_READY' });
    }

    if (!user || !user.active) {
      await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    if (user.isLocked()) {
      const minutesLeft = Math.ceil((user.accountLockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        ok: false,
        error: 'ACCOUNT_LOCKED',
        message: `Cuenta bloqueada. Intenta en ${minutesLeft} minuto(s).`
      });
    }

    let isMatch;
    try {
      isMatch = await user.comparePassword(password);
    } catch (bcryptErr) {
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    if (!isMatch) {
      await user.registerFailedLogin();
      await new Promise(r => setTimeout(r, 200 + Math.random() * 100));
      return res.status(401).json({ ok: false, error: 'INVALID_CREDENTIALS' });
    }

    await user.resetFailedLogin();
    user.lastLoginAt = new Date();
    user.lastLoginIp = req.ip;
    await user.save();

    const secret = process.env.JWT_ACCESS_SECRET || process.env.ACCESS_TOKEN_SECRET || process.env.JWT_SECRET;
    if (!secret) {
      return res.status(500).json({ ok: false, error: 'SERVER_MISCONFIG' });
    }

    const ttl = process.env.JWT_ACCESS_TTL || '15m';
    const payload = {
      id: user._id,
      userId: user._id,
      username: user.username,
      role: user.role || 'user'
    };

    const token = jwt.sign(payload, secret, { expiresIn: ttl });

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

    (async () => {
      try {
        const intakeUrl = process.env.INTAKE_URL || 'http://localhost:3005/api/internal/users/upsert';
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
      } catch (e) {}
    })();

  } catch (err) {
    return res.status(500).json({ ok: false, error: 'INTERNAL_ERROR' });
  }
});

router.get('/health', (req, res) => {
  res.json({ ok: true, service: 'users-microservice' });
});

module.exports = router;
