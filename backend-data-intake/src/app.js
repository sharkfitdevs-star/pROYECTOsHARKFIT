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
const { connectDB } = require('./db/mongodb');
const { logger } = require('./utils/logger');

const app = express();
const PORT = process.env.PORT || 8000;

// ==================== MIDDLEWARE ====================
app.use(helmet());

// CORS configurado para desarrollo Y producción
const corsOptions = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true, // CRÍTICO: permite cookies HttpOnly
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(compression());
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logger middleware
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.path}`);
  next();
});

// ==================== CONEXIÓN A BASE DE DATOS ====================
connectDB().catch(error => {
  logger.error('Error conectando a MongoDB:', error);
  process.exit(1);
});

// ==================== SEED INICIAL DE OWNER ====================
const { seedOwner } = require('./utils/seedOwner');
connectDB().then(async () => {
  await seedOwner();
}).catch(error => {
  logger.error('Error en conexión DB o seed:', error);
});

// ==================== RUTAS ====================
const authRoutes = require('./routes/auth');
const usuariosRoutes = require('./routes/usuariosNew');
const clientesRoutes = require('./routes/clientesNew');
const ventasRoutes = require('./routes/ventasNew');
const agendamientosRoutes = require('./routes/agendamientosNew');
const alertasRoutes = require('./routes/alertasNew');
const reportesRoutes = require('./routes/reportesNew');
const webhooksRoutes = require('./routes/webhooks');
const syncRoutes = require('./routes/syncNew');

// Montar rutas
app.use('/api/auth', authRoutes);
app.use('/api/usuarios', usuariosRoutes);
app.use('/api/clientes', clientesRoutes);
app.use('/api/ventas', ventasRoutes);
app.use('/api/agendamientos', agendamientosRoutes);
app.use('/api/alertas', alertasRoutes);
app.use('/api/reportes', reportesRoutes);
app.use('/api/webhooks', webhooksRoutes);
app.use('/api/sync', syncRoutes);

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
      sync: '/api/sync'
    }
  });
});

// Ruta de salud
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: 'MongoDB',
    memory: process.memoryUsage()
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
const server = app.listen(PORT, () => {
  logger.info(`🚀 Servidor corriendo en puerto ${PORT}`);
  logger.info(`📊 Base de datos: MongoDB`);
  logger.info(`🌍 Entorno: ${process.env.NODE_ENV || 'development'}`);
});

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
