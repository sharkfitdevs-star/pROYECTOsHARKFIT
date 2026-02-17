const express = require("express");
const http = require("http");
const cors = require("cors");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");
const axios = require("axios");
const crypto = require("crypto");
const { Server: SocketIOServer } = require("socket.io");
require("dotenv").config();

const { logger } = require("./utils/logger");
const { errorHandler } = require("./middleware/errorHandler");
const { connectDB } = require("./db/mongodb");  // ← AGREGADO
const { seedOwner } = require("./utils/seedOwner");  // ← AGREGADO
const authRoutes = require("./routes/auth");
const importRoutes = require("./routes/import");
const sourcesRoutes = require("./routes/sources");
const statsRoutes = require("./routes/stats");
const syncRoutes = require("./routes/sync");
const webhooksRoutes = require("./routes/webhooks");
const apiSetupRoutes = require("./routes/apiSetup");
const healthRoutes = require("./routes/health");  // ← NUEVO
const evoRoutes = require("./routes/evo");
const { extractAllApis } = require("./index");
const { getHealthCheckService } = require("./services/HealthCheckService");  // ← NUEVO

const initializeEventServices = () => {
  require("./services/EmailEventService");
  require("./services/NotificationEventService");
  require("./services/AuditLogEventService");
  require("./services/AnalyticsEventService");
  require("./services/WebhookEventService");
};

// Función ersatz para índices (no cargar MongoModels para evitar duplicados)
const createOptimizedIndexes = async () => {
  console.log('⏭️  Índices MongoDB se crearán automáticamente');
};

// ============================================
// CONFIGURACIÓN
// ============================================
const EVO_BASE_URL = process.env.EVO_BASE_URL;
const DJANGO_BASE_URL = process.env.DJANGO_BASE_URL || "http://localhost:8000/api";
const PORT = process.env.PORT || 3001;
const POLL_MS = Number(process.env.POLL_MS || 10000);
const EXTERNAL_API_SYNC_MINUTES = Number(process.env.EXTERNAL_API_SYNC_MINUTES || 180);

// Startup log
logger.info('SHARKFIT DATA INTAKE - starting', { EVO_BASE_URL, DJANGO_BASE_URL, PORT, POLL_MS });

// ============================================
// SESIONES EN MEMORIA
// ============================================
const sessions = new Map();

function makeSessionToken() {
  return crypto.randomBytes(24).toString("hex");
}

function requireSession(req, res, next) {
  const sessionToken = req.headers["x-session-token"];
  if (!sessionToken || !sessions.has(sessionToken)) {
    return res.status(401).json({ ok: false, error: "Sesión inválida. Haz login primero." });
  }
  req.session = sessions.get(sessionToken);
  req.sessionToken = sessionToken;
  next();
}

// ============================================
// CLIENTE EVO5
// ============================================
function evoClient(dns, token) {
  return axios.create({
    baseURL: EVO_BASE_URL,
    timeout: 20000,
    auth: { username: dns, password: token },
  });
}

async function testCredentials(dns, token) {
  const evo = evoClient(dns, token);
  try {
    // Endpoint liviano para validar credenciales
    await evo.get("/api/v1/entries?take=1");
    return true;
  } catch (e) {
    throw new Error(`Credenciales EVO5 inválidas: ${e.message}`);
  }
}

// ============================================
// FETCH DATA FROM EVO5
// ============================================
async function fetchSnapshot(dns, token) {
  const evo = evoClient(dns, token);

  const [sales, prospects, entries, contacts] = await Promise.allSettled([
    evo.get("/api/v2/sales?take=100"),
    evo.get("/api/v1/prospects?take=100"),
    evo.get("/api/v1/entries?take=100"),
    evo.get("/api/v1/contacts?take=100"),
  ]);

  const unwrap = (p) =>
    p.status === "fulfilled"
      ? { ok: true, data: p.value.data }
      : {
          ok: false,
          error: p.reason?.response?.data || p.reason?.message || "error desconocido",
          status: p.reason?.response?.status,
        };

  return {
    ts: new Date().toISOString(),
    sales: unwrap(sales),
    prospects: unwrap(prospects),
    entries: unwrap(entries),
    contacts: unwrap(contacts),
  };
}

// ============================================
// DJANGO CLIENT Para sincronización
// ============================================
async function syncClientesToDjango(clients, djangoToken) {
  const django = axios.create({
    baseURL: DJANGO_BASE_URL,
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${djangoToken}`,
      "Content-Type": "application/json",
    },
  });

  let synced = 0;
  let errors = 0;

  for (const client of clients) {
    try {
      const payload = {
        nombre: client.name || client.razao_social,
        email: client.email || "no-email@example.com",
        telefono: client.phone || "",
        empresa: client.razao_social || client.name,
        estado: "activo",
        fuente: "evo5",
      };

      const response = await django.post("/clientes/", payload);
      synced++;
      console.log(`✅ Cliente sincronizado: ${client.name}`);
    } catch (e) {
      errors++;
      if (e.response?.status !== 409) {
        console.error(`❌ Error sincronizando cliente ${client.name}:`, e.message);
      }
    }
  }

  return { synced, errors };
}

async function syncSalesToDjango(sales, djangoToken, clientMap) {
  const django = axios.create({
    baseURL: DJANGO_BASE_URL,
    timeout: 20000,
    headers: {
      Authorization: `Bearer ${djangoToken}`,
      "Content-Type": "application/json",
    },
  });

  let synced = 0;
  let errors = 0;

  for (const sale of sales) {
    try {
      const clientId = clientMap[sale.prospect_id] || 1;
      const payload = {
        numero_venta: sale.code || `VTA-EVO-${sale.id}`,
        cliente: clientId,
        tipo: "nueva_afiliacion",
        estado: sale.status === "won" ? "completada" : "en_proceso",
        monto_total: parseFloat(sale.value) || 0,
        monto_neto: parseFloat(sale.value) || 0,
      };

      const response = await django.post("/ventas/", payload);
      synced++;
      console.log(`✅ Venta sincronizada: ${sale.code}`);
    } catch (e) {
      errors++;
      if (e.response?.status !== 409) {
        console.error(`❌ Error sincronizando venta ${sale.code}:`, e.message);
      }
    }
  }

  return { synced, errors };
}

// ============================================
// EXPRESS & SOCKET.IO
// ============================================
const app = express();
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || "http://localhost:5173",
  credentials: true
}));
app.use(cookieParser());
app.use(express.json());

// API Routes (SQLite-backed)
app.use("/api/auth", authRoutes);
app.use("/api/import", importRoutes);
app.use("/api/sources", sourcesRoutes);
app.use("/api/stats", statsRoutes);
app.use("/api/evo", evoRoutes);
app.use("/api/sync", syncRoutes);
app.use("/api/webhooks", webhooksRoutes);
app.use("/api/setup", apiSetupRoutes);
app.use("/api/health", healthRoutes);  // ← NUEVO: Health checks

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: process.env.CORS_ORIGIN || "http://localhost:5173" }
});

// ============================================
// RUTAS
// ============================================

/**
 * POST /login
 * body: { dns, token, django_token }
 * return: { sessionToken }
 */
app.post("/login", async (req, res) => {
  const { dns, token, django_token } = req.body || {};

  if (!dns || !token) {
    return res.status(400).json({ ok: false, error: "Falta dns o token" });
  }

  try {
    await testCredentials(dns, token);

    const sessionToken = makeSessionToken();
    sessions.set(sessionToken, {
      dns,
      token,
      django_token: django_token || process.env.DJANGO_JWT_TOKEN || "",
      createdAt: Date.now(),
    });

    // Expirar sesión en 24 horas
    setTimeout(() => sessions.delete(sessionToken), 24 * 60 * 60 * 1000);

    return res.json({ ok: true, sessionToken, message: "Sesión iniciada correctamente" });
  } catch (e) {
    return res.status(401).json({
      ok: false,
      error: "Credenciales inválidas o sin permisos",
      detail: e.message,
    });
  }
});

/**
 * GET /api/snapshot
 * header: x-session-token: <sessionToken>
 */
app.get("/api/snapshot", requireSession, async (req, res) => {
  try {
    const { dns, token } = req.session;
    const snap = await fetchSnapshot(dns, token);
    res.json({ ok: true, ...snap });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * POST /api/sync
 * Fuerza sincronización inmediata
 */
app.post("/api/sync", requireSession, async (req, res) => {
  try {
    const { dns, token, django_token } = req.session;

    if (!django_token) {
      return res.status(400).json({
        ok: false,
        error: "Django token no configurado. Usa POST /login con django_token",
      });
    }

    const snap = await fetchSnapshot(dns, token);

    let results = {
      clients: { synced: 0, errors: 0 },
      sales: { synced: 0, errors: 0 },
    };

    // Sincronizar clientes
    if (snap.prospects?.ok && snap.prospects.data?.items) {
      const clientResults = await syncClientesToDjango(snap.prospects.data.items, django_token);
      results.clients = clientResults;
    }

    // Sincronizar ventas (si hay clientes)
    if (snap.sales?.ok && snap.sales.data?.items) {
      const clientMap = {};
      results.sales = await syncSalesToDjango(snap.sales.data.items, django_token, clientMap);
    }

    res.json({
      ok: true,
      message: "Sincronización completada",
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/**
 * GET /health
 */
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "sharkfit-data-intake",
    status: "running",
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// SOCKET.IO - Real-time polling
// ============================================
io.use((socket, next) => {
  const sessionToken = socket.handshake.auth?.sessionToken;
  if (!sessionToken || !sessions.has(sessionToken)) {
    return next(new Error("Sesión inválida"));
  }
  socket.sessionToken = sessionToken;
  socket.session = sessions.get(sessionToken);
  next();
});

io.on("connection", (socket) => {
  logger.info(`Cliente conectado: ${socket.id}`);

  // Polling cada POLL_MS
  let timer = setInterval(async () => {
    try {
      const { dns, token } = socket.session;
      const snap = await fetchSnapshot(dns, token);
      socket.emit("evo:snapshot", snap);
    } catch (e) {
      socket.emit("evo:error", {
        ts: new Date().toISOString(),
        message: e.message,
      });
    }
  }, POLL_MS);

  socket.on("sync:request", async () => {
    try {
      const { dns, token, django_token } = socket.session;
      const snap = await fetchSnapshot(dns, token);

      let results = {
        clients: { synced: 0, errors: 0 },
        sales: { synced: 0, errors: 0 },
      };

      if (snap.prospects?.ok && snap.prospects.data?.items) {
        const clientResults = await syncClientesToDjango(
          snap.prospects.data.items,
          django_token
        );
        results.clients = clientResults;
      }

      if (snap.sales?.ok && snap.sales.data?.items) {
        const clientMap = {};
        results.sales = await syncSalesToDjango(snap.sales.data.items, django_token, clientMap);
      }

      socket.emit("sync:complete", {
        ok: true,
        results,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      socket.emit("sync:error", {
        ok: false,
        message: e.message,
      });
    }
  });

  socket.on("disconnect", () => {
    clearInterval(timer);
    logger.info(`Cliente desconectado: ${socket.id}`);
  });
});

// ============================================
// START SERVER
// ============================================
const startServer = async () => {
  try {
    // Conectar a MongoDB primero
    await connectDB();
    logger.info('✅ MongoDB conectado');

    try {
      initializeEventServices();
      logger.info('✅ Event services inicializados');
    } catch (eventError) {
      console.warn('⚠️ Error inicializando servicios de eventos:', eventError?.message || eventError);
    }
    
    // Crear índices optimizados
    await createOptimizedIndexes();
    logger.info('✅ Índices MongoDB creados');
    
    // Crear seed owner si es necesario
    await seedOwner();
    
    // Inicializar health checks periódicos
    const healthService = getHealthCheckService();
    healthService.startPeriodicChecks();
    logger.info('✅ Health checks iniciados');
    
    server.listen(PORT, () => {
      logger.info(`Servidor listo en: http://localhost:${PORT}`);
      logger.info('API Endpoints available');
      logger.info('   POST   /login              { dns, token, django_token } → sessionToken');
      logger.info('   GET    /api/snapshot       (requiere header x-session-token)');
      logger.info('   GET    /api/evo/dashboard/stats  (extractor | mongodb | demo)');
      logger.info('   POST   /api/sync           (fuerza sincronización inmediata)');
      logger.info('   GET    /api/health         (checkeo de salud del servicio)');
      logger.info('   GET    /api/health/evo     (verificar EVO específicamente)');
      logger.info('   POST   /api/webhooks/evo   (recibir webhooks de EVO)');
      logger.info('   POST   /api/webhooks/w12   (recibir webhooks de W12)');
      logger.info('WebSocket (Socket.IO) events: evo:snapshot, sync:request');
    });
  } catch (error) {
    console.error('❌ Error iniciando servidor:', error);
    process.exit(1);
  }
};

startServer();

// ============================================
// AUTO-SYNC APIs EXTERNAS
// ============================================
if (EXTERNAL_API_SYNC_MINUTES > 0) {
  const intervalMs = EXTERNAL_API_SYNC_MINUTES * 60 * 1000;
  logger.info(`⏱️ Auto-sync APIs externas cada ${EXTERNAL_API_SYNC_MINUTES} min`);

  setInterval(async () => {
    try {
      await extractAllApis();
      logger.info('✅ Auto-sync APIs externas completado');
    } catch (error) {
      logger.error('❌ Error auto-sync APIs externas:', error);
    }
  }, intervalMs);
}

app.use(errorHandler);

process.on("unhandledRejection", (err) => {
  logger.error("❌ Unhandled Rejection:", err);
  server.close(() => process.exit(1));
});

process.on("SIGTERM", () => {
  logger.info("🛑 SIGTERM recibido, cerrando servidor...");
  server.close(() => {
    logger.info("Servidor cerrado");
    process.exit(0);
  });
});
