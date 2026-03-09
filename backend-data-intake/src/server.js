const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env.local') });
if (!process.env.MONGODB_URI) {
  console.error('MONGODB_URI missing in root .env.local');
}

const express = require("express");
const http = require("http");
const crypto = require("crypto");
const axios = require("axios");
const { Server: SocketIOServer } = require("socket.io");

const { logger } = require("./utils/logger");
process.on("unhandledRejection", (reason) => logger.error("UNHANDLED_REJECTION", reason));
process.on("uncaughtException", (err) => { logger.error("UNCAUGHT_EXCEPTION", err); });

const { errorHandler } = require("./middleware/errorHandler");
const { seedOwner } = require("./utils/seedOwner");
const { connectToDB } = require('./db/db');
const { createApp, notFoundHandler } = require('./app.IMPROVED');
const importRoutes = require("./routes/import");
const sourcesRoutes = require("./routes/sources");
const statsRoutes = require("./routes/stats");
const syncRoutes = require("./routes/sync");
const evoRoutes = require("./routes/evo");
const webhooksRoutes = require("./routes/webhooks");
const apiSetupRoutes = require("./routes/apiSetup");
const healthRoutes = require("./routes/health");
const clientesRoutes = require("./routes/clientesRoutes");
const alertasRoutes = require("./routes/alertasNew");
const settingsRoutes = require("./routes/settings");
const { extractAllApis } = require("./index");
const { getHealthCheckService } = require("./services/HealthCheckService");

const initializeEventServices = () => {
  require("./services/EmailEventService");
  require("./services/NotificationEventService");
  require("./services/AuditLogEventService");
  require("./services/AnalyticsEventService");
  require("./services/WebhookEventService");
};

const PORT = Number(process.env.PORT_INTAKE) || 3005;
const POLL_MS = Number(process.env.POLL_MS || 10000);
const EXTERNAL_API_SYNC_MINUTES = Number(process.env.EXTERNAL_API_SYNC_MINUTES || 180);
const SESSION_TTL_MS = Number(process.env.SESSION_TTL_MS || 86400000);
const EVO_BASE_URL = process.env.EVO_BASE_URL;
const DJANGO_BASE_URL = process.env.DJANGO_BASE_URL || "http://localhost:8000/api";

logger.info('SHARKFIT DATA INTAKE - starting', { PORT });

const sessions = new Map();
function makeSessionToken() { return crypto.randomBytes(24).toString("hex"); }
function requireSession(req, res, next) {
  const t = req.headers["x-session-token"];
  if (!t || !sessions.has(t)) return res.status(401).json({ ok: false, error: "Sesion invalida" });
  req.session = sessions.get(t);
  req.sessionToken = t;
  next();
}

function evoClient(dns, token) {
  return axios.create({ baseURL: EVO_BASE_URL, timeout: 20000, auth: { username: dns, password: token } });
}
async function testCredentials(dns, token) {
  try { await evoClient(dns, token).get("/api/v1/entries?take=1"); return true; }
  catch (e) { throw new Error("Credenciales EVO5 invalidas: " + e.message); }
}
async function fetchSnapshot(dns, token) {
  const evo = evoClient(dns, token);
  const [sales, prospects, entries, contacts] = await Promise.allSettled([
    evo.get("/api/v2/sales?take=100"), evo.get("/api/v1/prospects?take=100"),
    evo.get("/api/v1/entries?take=100"), evo.get("/api/v1/contacts?take=100"),
  ]);
  const unwrap = (p) => p.status === "fulfilled"
    ? { ok: true, data: p.value.data }
    : { ok: false, error: p.reason?.response?.data || p.reason?.message };
  return { ts: new Date().toISOString(), sales: unwrap(sales), prospects: unwrap(prospects), entries: unwrap(entries), contacts: unwrap(contacts) };
}
async function syncClientesToDjango(clients, djangoToken) {
  const dj = axios.create({ baseURL: DJANGO_BASE_URL, timeout: 20000, headers: { Authorization: "Bearer " + djangoToken } });
  let synced = 0, errors = 0;
  for (const c of clients) {
    try { await dj.post("/clientes/", { nombre: c.name || c.razao_social, email: c.email || "no-email@example.com", telefono: c.phone || "", estado: "activo", fuente: "evo5" }); synced++; }
    catch { errors++; }
  }
  return { synced, errors };
}
async function syncSalesToDjango(sales, djangoToken, clientMap) {
  const dj = axios.create({ baseURL: DJANGO_BASE_URL, timeout: 20000, headers: { Authorization: "Bearer " + djangoToken } });
  let synced = 0, errors = 0;
  for (const s of sales) {
    try { await dj.post("/ventas/", { numero_venta: s.code || "VTA-EVO-" + s.id, cliente: clientMap[s.prospect_id] || 1, tipo: "nueva_afiliacion", estado: s.status === "won" ? "completada" : "en_proceso", monto_total: parseFloat(s.value) || 0, monto_neto: parseFloat(s.value) || 0 }); synced++; }
    catch { errors++; }
  }
  return { synced, errors };
}

let app, server, io;

const startServer = async () => {
  try {
    app = createApp();

    // ✅ UNA SOLA creacion de servidor HTTP + Socket.io
    server = http.createServer(app);
    io = new SocketIOServer(server, {
      cors: { origin: process.env.CORS_ORIGIN || "http://localhost:5173" }
    });

    // ✅ UNA SOLA llamada a listen, envuelta en Promise para capturar EADDRINUSE
    await new Promise((resolve, reject) => {
      server.once('error', (err) => {
        if (err.code === 'EADDRINUSE') {
          logger.error("Puerto " + PORT + " ocupado. Ejecuta: taskkill /IM node.exe /F");
        } else {
          logger.error('Error servidor HTTP:', err);
        }
        reject(err);
      });
      server.listen(PORT, "0.0.0.0", () => {
        logger.info("Servidor escuchando en http://0.0.0.0:" + PORT);
        logger.info('BOOT_OK');
        resolve();
      });
    });

    // MongoDB en background
    connectToDB()
      .then(ok => ok ? logger.info('MongoDB conectado') : logger.warn('MongoDB no disponible'))
      .catch(err => logger.error('Error conectando MongoDB:', err));

    // Rutas de sesion EVO
    app.post("/login", async (req, res) => {
      const { dns, token, django_token } = req.body || {};
      if (!dns || !token) return res.status(400).json({ ok: false, error: "Falta dns o token" });
      try {
        await testCredentials(dns, token);
        const sessionToken = makeSessionToken();
        sessions.set(sessionToken, { dns, token, django_token: django_token || process.env.DJANGO_JWT_TOKEN || "", createdAt: Date.now() });
        const t = setTimeout(() => sessions.delete(sessionToken), SESSION_TTL_MS);
        if (t.unref) t.unref();
        return res.json({ ok: true, sessionToken });
      } catch (e) {
        return res.status(401).json({ ok: false, error: "Credenciales invalidas", detail: e.message });
      }
    });

    app.get("/api/snapshot", requireSession, async (req, res) => {
      try { res.json({ ok: true, ...(await fetchSnapshot(req.session.dns, req.session.token)) }); }
      catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    app.post("/api/sync", requireSession, async (req, res) => {
      try {
        const { dns, token, django_token } = req.session;
        if (!django_token) return res.status(400).json({ ok: false, error: "Django token no configurado" });
        const snap = await fetchSnapshot(dns, token);
        const results = { clients: { synced: 0, errors: 0 }, sales: { synced: 0, errors: 0 } };
        if (snap.prospects?.ok && snap.prospects.data?.items) results.clients = await syncClientesToDjango(snap.prospects.data.items, django_token);
        if (snap.sales?.ok && snap.sales.data?.items) results.sales = await syncSalesToDjango(snap.sales.data.items, django_token, {});
        res.json({ ok: true, results, timestamp: new Date().toISOString() });
      } catch (e) { res.status(500).json({ ok: false, error: e.message }); }
    });

    app.get("/health", (req, res) => res.json({ ok: true, service: "sharkfit-data-intake", status: "running", timestamp: new Date().toISOString() }));

    // Montar todos los routers
    app.use("/api/import", importRoutes);
    app.use("/api/settings", settingsRoutes);
    app.use("/api/health", healthRoutes);
    app.use("/api/clientes", clientesRoutes);
    app.use("/api/alertas", alertasRoutes);
    const ventasRoutes = require("./routes/ventasNew");
    app.use("/api/ventas", ventasRoutes);
    app.use("/api/auth", require("./routes/authNew"));
    app.use("/api/sources", sourcesRoutes);
    app.use("/api/stats", statsRoutes);
    app.use("/api/sync", syncRoutes);
    app.use("/api/webhooks", webhooksRoutes);
    app.use("/api/evo", evoRoutes);
    app.use("/api/setup", apiSetupRoutes);
    app.use("/api/dashboard", require("./routes/dashboard"));
    app.use("/api/export", require("./routes/export"));
    app.use(notFoundHandler);

    // Socket.io handlers
    io.use((socket, next) => {
      const t = socket.handshake.auth?.sessionToken;
      if (!t || !sessions.has(t)) return next(new Error("Sesion invalida"));
      socket.sessionToken = t;
      socket.session = sessions.get(t);
      next();
    });
    io.on("connection", (socket) => {
      logger.info("Cliente WS conectado: " + socket.id);
      const timer = setInterval(async () => {
        try { socket.emit("evo:snapshot", await fetchSnapshot(socket.session.dns, socket.session.token)); }
        catch (e) { socket.emit("evo:error", { ts: new Date().toISOString(), message: e.message }); }
      }, POLL_MS);
      socket.on("sync:request", async () => {
        try {
          const { dns, token, django_token } = socket.session;
          const snap = await fetchSnapshot(dns, token);
          const results = { clients: { synced: 0, errors: 0 }, sales: { synced: 0, errors: 0 } };
          if (snap.prospects?.ok && snap.prospects.data?.items) results.clients = await syncClientesToDjango(snap.prospects.data.items, django_token);
          if (snap.sales?.ok && snap.sales.data?.items) results.sales = await syncSalesToDjango(snap.sales.data.items, django_token, {});
          socket.emit("sync:complete", { ok: true, results, timestamp: new Date().toISOString() });
        } catch (e) { socket.emit("sync:error", { ok: false, message: e.message }); }
      });
      socket.on("disconnect", () => { clearInterval(timer); logger.info("Cliente WS desconectado: " + socket.id); });
    });

    // Servicios de eventos
    try { initializeEventServices(); logger.info('Event services inicializados'); }
    catch (e) { logger.warn('Error inicializando event services: ' + (e?.message || e)); }

    await (async () => { console.log('Indices MongoDB se crearan automaticamente'); })();
    await seedOwner();

    const healthService = getHealthCheckService();
    if (process.env.NODE_ENV !== 'test' && String(process.env.SKIP_HEALTH_CHECKS).toLowerCase() !== 'true') {
      healthService.startPeriodicChecks();
      logger.info('Health checks iniciados');
    }

    // ✅ Auto-sync DENTRO de startServer (no en top-level)
    if (EXTERNAL_API_SYNC_MINUTES > 0 && process.env.NODE_ENV !== 'test') {
      const ms = EXTERNAL_API_SYNC_MINUTES * 60 * 1000;
      logger.info("Auto-sync APIs externas cada " + EXTERNAL_API_SYNC_MINUTES + " min");
      const si = setInterval(async () => {
        try { await extractAllApis(); logger.info('Auto-sync completado'); }
        catch (e) { logger.error('Error auto-sync:', e); }
      }, ms);
      if (si.unref) si.unref();
    }

    app.use(errorHandler);
    logger.info('SERVER_READY');

  } catch (error) {
    logger.error('Error fatal iniciando servidor:', error);
    process.exit(1);
  }
};

process.on("SIGTERM", () => {
  logger.info("SIGTERM recibido, cerrando...");
  if (server) server.close(() => { logger.info("Servidor cerrado"); process.exit(0); });
  else process.exit(0);
});

if (require.main === module) {
  startServer().catch(err => { logger.error(err); process.exit(1); });
}

module.exports = { startServer };