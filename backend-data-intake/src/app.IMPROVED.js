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

  // ✅ CORS configurado con validación
  const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173').split(',').map(o => o.trim());

  const corsOptions = {
    origin: (origin, callback) => {
      // ✅ Permitir requests sin origen (mobile apps, curl, etc.)
      if (!origin || corsOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.warn(`❌ CORS blocked: ${origin}`);
        callback(new Error('CORS no permitido'));
      }
    },
    credentials: true,  // Permite cookies
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    optionsSuccessStatus: 200,
    maxAge: 86400  // Cache preflight 24 horas
  };

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

  // ✅ Logger custom
  app.use((req, res, next) => {
    logger.info(`${req.method} ${req.path}`);
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

  // ════════════════════════════════════════════════════════════════════
  // ❌ ERROR HANDLING (DEBE SER ÚLTIMO)
  // ════════════════════════════════════════════════════════════════════

  // 404 Handler
  app.use((req, res) => {
    res.status(404).json({
      error: true,
      message: 'Endpoint no encontrado'
    });
  });

  // Error handler global
  app.use((err, req, res, next) => {
    // ✅ Log detallado (solo en server, no en respuesta)
    logger.error('Unhandled error:', {
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.path,
      method: req.method,
      ip: req.ip
    });

    // ✅ Respuesta genérica al cliente
    const statusCode = err.status || 500;
    const message = process.env.NODE_ENV === 'production'
      ? 'Error interno del servidor'  // Genérico en prod
      : err.message;  // Detallado en dev

    res.status(statusCode).json({
      error: true,
      message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  return app;
}

module.exports = { createApp };
