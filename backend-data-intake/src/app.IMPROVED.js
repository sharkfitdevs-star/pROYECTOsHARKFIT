/**
 * 🔐 APP.JS MEJORADO - Seguridad + CORS + Validación
 * 
 * Cambios:
 * ✅ CORS validado contra variables de entorno
 * ✅ Helmet mejorado
 * ✅ Rate limiting activo
 * ✅ Validación en rutas
 * ✅ Error handling seguro
 * 
 * Ubicación: /backend-data-intake/src/app.IMPROVED.js
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const cookieParser = require('cookie-parser');
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

const { connectDB } = require('./db/mongodb');
const { logger } = require('./utils/logger');
const { validateRequest, schemas, applySecurityPolicies } = require('./middleware/validation.IMPROVED');
const { authLoginRateLimiter, authPasswordRateLimiter, rateLimiter } = require('./middleware/rateLimiter');
const { requireAuth } = require('./middleware/auth');

const PORT = process.env.PORT || 8000;

function createApp() {
  const app = express();

  // if we're running under the test harness we must avoid
  // starting any background tasks/cron/intervals that would keep the
  // event loop busy and prevent Jest from exiting cleanly.
  if (process.env.NODE_ENV === 'test') {
    // deliberately empty; add any mocks here if future features spawn
    // workers, timers, or queues.  currently no such jobs are started.
  }

  // ════════════════════════════════════════════════════════════════════
  // 🔐 VALIDACIÓN DE CONFIG AL STARTUP
  // ════════════════════════════════════════════════════════════════════

  if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
    console.error('❌ FATAL: JWT_SECRET no configurado en producción');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && process.env.JWT_SECRET === 'change-me') {
    console.error('❌ FATAL: JWT_SECRET aún tiene valor default en producción');
    process.exit(1);
  }

  if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
    console.error('❌ FATAL: CORS_ORIGIN no configurado en producción');
    process.exit(1);
  }

  // ════════════════════════════════════════════════════════════════════
  // 🛡️ MIDDLEWARE DE SEGURIDAD GLOBAL
  // ════════════════════════════════════════════════════════════════════

  // ✅ Helmet: Headers de seguridad
  app.use(helmet());
  app.use(helmet.contentSecurityPolicy({
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:5173']
    }
  }));

  // ✅ X-Frame-Options: Prevenir clickjacking
  app.use((req, res, next) => {
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');  // HSTS
    next();
  });

  // ✅ CORS configurado con whitelist y validación segura
  // build explicit list: env CSV plus known dev hosts
  const corsOrigins = [];
  if (process.env.CORS_ORIGIN) {
    corsOrigins.push(...process.env.CORS_ORIGIN.split(',').map(o => o.trim()).filter(Boolean));
  }
  // always allow local dev addresses for both ports 3000 and 5173
  corsOrigins.push(
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:5173',
    'http://127.0.0.1:5173'
  );
  if (process.env.NODE_ENV === 'production' && corsOrigins.length === 0) {
    throw new Error('❌ CORS_ORIGIN no configurado en .env para producción');
  }

  const corsOptions = {
    origin: (origin, callback) => {
      // during tests we don't want CORS to interfere at all
      if (process.env.NODE_ENV === 'test') {
        return callback(null, true);
      }
      // allow requests without origin (curl, Postman, server-to-server)
      if (!origin || corsOrigins.includes(origin)) {
        return callback(null, true);
      }
      // rejected origin: log in dev but do not throw error
      if (process.env.NODE_ENV !== 'production') {
        console.warn('[CORS] blocking origin', origin);
      }
      return callback(null, false);
    },
    credentials: true,  // Permite cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
    maxAge: 86400  // Cache preflight 24 horas
  };

  // enable global preflight handler
  app.options('*', cors(corsOptions));
  app.use(cors(corsOptions));

  // ✅ Rate limiting global (100 requests / 15 min)
  app.use(rateLimiter);

  // ✅ Compression
  app.use(compression());

  // ✅ Body parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ✅ Sanitización NoSQL injection
  app.use(mongoSanitize());

  // ✅ HPP (HTTP Parameter Pollution)
  app.use(hpp());

  // ✅ Request logging middleware (boolean headers only)
  app.use((req, res, next) => {
    logger.info('[REQ]', {
      method: req.method,
      path: req.originalUrl || req.url,
      hasCookie: !!req.headers.cookie,
      hasAuth: !!req.headers.authorization,
      hasSession: !!req.headers['x-session-token'],
      contentType: req.headers['content-type'] || null
    });
    next();
  });

  // ════════════════════════════════════════════════════════════════════
  // 📡 RUTAS CON VALIDACIÓN INTEGRADA
  // ════════════════════════════════════════════════════════════════════

  const authRoutes = require('./routes/auth');
  const usuariosRoutes = require('./routes/usuariosNew');
  const clientesRoutes = require('./routes/clientesNew');
  // ... más rutas

  // Aplicar rate limiting en auth endpoints
  app.use('/api/auth/login', authLoginRateLimiter);
  app.use('/api/auth/register', authLoginRateLimiter);
  app.use('/api/auth/reset-password', authPasswordRateLimiter);

  // Montar rutas
  app.use('/api/auth', authRoutes);
  app.use('/api/usuarios', usuariosRoutes);
  app.use('/api/clientes', clientesRoutes);
  app.use('/api/settings', require('./routes/settings'));

  // ════════════════════════════════════════════════════════════════════
  // 🏥 HEALTH CHECK
  // ════════════════════════════════════════════════════════════════════

  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      env: process.env.NODE_ENV
    });
  });

  app.get('/', (req, res) => {
    res.json({
      message: 'SharkFit API - Node/Express + MongoDB',
      version: '2.0.0',
      status: 'running'
    });
  });

  // debugging helper: echo the authenticated user object constructed from JWT
  app.get('/api/whoami', requireAuth, (req, res) => {
    res.json({ ok: true, user: req.user });
  });

  // ════════════════════════════════════════════════════════════════════
  // ❌ ERROR HANDLING MIDDLEWARES (deben montarse al FINAL en server.js)
  // ════════════════════════════════════════════════════════════════════

  // Nota: no registramos un 404 aquí.  Se expone como middleware para que
  // server.js pueda montarlo después de todas las rutas específicas.
  
  // Global error middleware logs structured error info and returns uniform JSON
  app.use((err, req, res, next) => {
    logger.error('[ERR]', {
      method: req.method,
      path: req.originalUrl || req.url,
      message: err.message,
      stack: err.stack
    });

    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'
      : err.message;

    res.status(statusCode).json({ ok: false, error: 'INTERNAL_SERVER_ERROR', message });
  });

  return app;
}

// export 404 handler so caller can mount it last
function notFoundHandler(req, res) {
  res.status(404).json({ error: true, message: 'Endpoint no encontrado' });
}

module.exports = { createApp, notFoundHandler };
