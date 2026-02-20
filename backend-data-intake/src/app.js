/**
 * SERVIDOR PRINCIPAL - Node/Express con MongoDB
 * Reemplaza el backend Django completo
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

const app = express();
const PORT = process.env.PORT || 8000;

// ==================== MIDDLEWARE ====================

// Helmet con configuración CSP robusta
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      styleSrc: ["'self'", 'https://fonts.googleapis.com', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
      imgSrc: ["'self'", 'data:', 'https://cdn.jsdelivr.net', 'https://cdnjs.cloudflare.com'],
      connectSrc: ["'self'", process.env.CORS_ORIGIN || 'http://localhost:5173'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  crossOriginEmbedderPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-origin' },
  crossOriginOpenerPolicy: { policy: 'same-origin' },
}));

// ✅ CORS MEJORADO: Validación dinámica contra whitelist
if (process.env.NODE_ENV === 'production' && !process.env.CORS_ORIGIN) {
  logger.error('❌ FATAL: CORS_ORIGIN no configurado en PRODUCCIÓN');
  process.exit(1);
}

const corsOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim());

const corsOptions = {
  origin: (origin, callback) => {
    // Permitir requests sin origen (mobile, curl, etc.)
    if (!origin || corsOrigins.includes(origin)) {
      callback(null, true);
    } else {
      logger.warn(`CORS BLOCKED: ${origin}`);
      callback(new Error('CORS no permitido'));
    }
  },
  credentials: true, // CRÍTICO: permite cookies HttpOnly
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200,
  maxAge: 86400  // Cache preflight 24 horas
};

app.use(cors(corsOptions));

// ✅ HEADERS DE SEGURIDAD MEJORADOS
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');  // Prevenir clickjacking
  res.setHeader('X-Content-Type-Options', 'nosniff');  // Prevenir MIME sniffing
  res.setHeader('X-XSS-Protection', '1; mode=block');  // XSS protection (legacy)
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');  // HSTS
  next();
});

app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ SEGURIDAD: Sanitización de inputs
app.use(mongoSanitize());  // Evitar NoSQL injection
app.use(hpp());  // Evitar HTTP Parameter Pollution

// Logger middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ==================== RUTAS ====================
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuariosNew');
const clientesRoutes = require('./routes/clientesNew');
const ventasRoutes = require('./routes/ventasNew');

const agendamientosRoutes = require('./routes/agendamientosNew');
const alertasRoutes = require('./routes/alertasNew');
const reportesRoutes = require('./routes/reportesNew');
const importRoutes = require('./routes/import');
const exportRoutes = require('./routes/export');  // nuevo
const webhooksRoutes = require('./routes/webhooks');
const evoRoutes = require('./routes/evo');
const syncRoutes = require('./routes/syncNew');
const auditLogRoutes = require('./routes/auditLog');

// Montar rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/agendamientos', agendamientosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/import', importRoutes);
app.use('/api/export', exportRoutes);  // rutas de exportación/importación de datos

app.use('/api/webhooks', webhooksRoutes);
app.use('/api/evo', evoRoutes);
app.use('/api/sync', syncRoutes);
app.use('/api/audit-log', auditLogRoutes);

// Ruta raíz
app.get('/', (req, res) => {
  res.json({
    message: 'SharkFit API - Node/Express + MongoDB',
    version: '2.0.0',
    status: 'running',
    endpoints: {
      auth: '/api/auth',
      usuarios: '/api/usuarios',
      clientes: '/api/clientes',
      ventas: '/api/ventas',
      agendamientos: '/api/agendamientos',
      alertas: '/api/alertas',
      reportes: '/api/reportes',
      webhooks: '/api/webhooks',
      evo: '/api/evo',
      sync: '/api/sync'
    }
  });
});

// Ruta de salud
app.get('/api/health', (req, res) => {
  const agendaInfo = (() => {
    if (String(process.env.AGENDA_ENABLED).toLowerCase() !== 'true') return { enabled: false };
    try {
      const { getAgenda } = require('./workers/agendaAdapter');
      const ag = getAgenda();
      const ready = !!(ag && ag._collection);
      return { enabled: true, status: ready ? 'ready' : 'initializing' };
    } catch (err) {
      return { enabled: true, status: 'error', message: err.message };
    }
  })();

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'MongoDB',
    memory: process.memoryUsage(),
    agenda: agendaInfo
  });
});

// ==================== MANEJO DE ERRORES ====================
app.use((err, req, res, next) => {
  logger.error('Error:', err);
  
  res.status(err.status || 500).json({
    error: true,
    message: err.message || 'Error interno del servidor',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// 404
app.use((req, res) => {
  res.status(404).json({
    error: true,
    message: 'Endpoint no encontrado'
  });
});

// ==================== INICIAR SERVIDOR ====================
const { seedOwner } = require('./utils/seedOwner');
let server;

const startServer = async () => {
  try {
    // Esperar a que MongoDB esté completamente conectado
    await connectDB();
    await seedOwner();

    // Inicializar Agenda si está habilitado (no en tests)
    if (String(process.env.AGENDA_ENABLED).toLowerCase() === 'true' && process.env.NODE_ENV !== 'test') {
      try {
        const { getAgenda } = require('./workers/agendaAdapter');
        getAgenda();
        logger.info('🔁 Agenda bootstrap: inicializado');

        // Registrar definiciones de jobs (PR-1)
        try {
          const { registerAgendaJobs } = require('./workers/agendaJobs');
          registerAgendaJobs();
          logger.info('🔁 Agenda jobs: registrados');
        } catch (jobErr) {
          logger.warn('⚠️ Agenda jobs registration failed:', jobErr.message || jobErr);
        }
      } catch (err) {
        logger.warn('⚠️ Agenda bootstrap falló:', err.message || err);
      }
    }
    
    server = app.listen(PORT, () => {
      logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
      logger.info(`📊 Base de datos: MongoDB`);
      logger.info(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    logger.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

// No arrancar el servidor automáticamente durante las pruebas unitarias
// Jest establece NODE_ENV=test — en ese caso exportamos `app` para supertest
if (process.env.NODE_ENV !== 'test') {
  startServer();
}

// Manejo de señales de terminación
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido, cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  logger.info('SIGINT recibido, cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado');
    process.exit(0);
  });
});

module.exports = app;
