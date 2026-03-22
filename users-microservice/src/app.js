const cors = require('cors');
const express = require('express');
const dotenv = require('dotenv');
const path = require('path');
const connectDB = require('./config/db');
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');

// load shared settings (root .env.local) so token secrets and ports stay in sync
dotenv.config({ path: path.resolve(__dirname, '../../.env.local') });

// advertencias/errores de variables críticas
if (!process.env.JWT_ACCESS_SECRET) {
  console.error('❌ JWT_ACCESS_SECRET no está definida en .env; el servicio no podrá validar tokens de users-microservice.');
  process.exit(1);
}
// for backward compatibility we also accept JWT_SECRET, but discourage its use
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET no está definida; se usará JWT_ACCESS_SECRET únicamente.');
}

connectDB();

// development-only MongoDB connection info
if (process.env.NODE_ENV !== 'production') {
  const mongoose = require('mongoose');
  const uri = process.env.MONGODB_URI || '(not set)';
  const safeUri = uri.replace(/(mongodb(?:\+srv)?:\/\/)([^:]+):([^@]+)@/, '$1$2:****@');
  mongoose.connection.on('connected', () => {
    console.log('[DEV] users-microservice Mongo URI:', safeUri);
    console.log('[DEV] users-microservice DB name:', mongoose.connection.name);
  });
}


const app = express();
app.use(express.json());

// CORS explícito para desarrollo y frontend local
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'http://localhost:5174',
    process.env.CORS_ORIGIN
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-request-id', 'x-internal-api-key']
}));

// dev‑only request logger with uuid and 401 header
if (process.env.NODE_ENV !== 'production') {
  const { randomUUID } = require('crypto');
  app.use((req, res, next) => {
    req.requestId = randomUUID();
    const origStatus = res.status;
    res.status = function(code) {
      if (code === 401) {
        res.set('X-Service', 'users-microservice');
      }
      return origStatus.call(this, code);
    };
    res.on('finish', () => {
      console.log(`[${req.requestId}] ${req.method} ${req.path} ${res.statusCode}`);
    });
    next();
  });
}

// minimal logging in production
if (process.env.NODE_ENV === 'production') {
  app.use((req, res, next) => {
    console.log(`${req.method} ${req.path}`);
    next();
  });
}

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);

// simple health endpoint used by dev scripts
app.get('/api/health', (req, res) => {
  res.json({ service: 'USERS', status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
  res.send('Microservicio de usuarios activo');
});

// global error handler – must be last middleware before listener
app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }
  const status = err.status || 500;
  console.error('[GLOBAL ERROR]', {
    method: req.method,
    url: req.originalUrl,
    status,
    message: err.message,
    stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined,
  });
  let errorCode = 'INTERNAL_ERROR';
  if (status < 500 && err.code) {
    errorCode = err.code;
  }
  res.status(status).json({ ok: false, error: errorCode, message: err.message });
});

const PORT = Number(process.env.PORT_USERS) || 4001; // fixed development port from shared config

const server = app.listen(PORT, () => {
  console.log(`✅ Users microservice listening on port ${PORT}`);
});

server.on("error", (err) => {
  if (err.code === "EADDRINUSE") {
    console.error(
      `[USERS] Puerto ${PORT} ocupado. Cierra el proceso que usa el puerto o ajusta PORT_USERS en .env.local (por ejemplo 4011).`
    );
    process.exit(1);
  }
  console.error("[USERS] Error al iniciar server:", err);
  process.exit(1);
});
