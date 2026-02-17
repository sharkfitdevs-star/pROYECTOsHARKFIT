/**
 * 🚀 EVENT-DRIVEN INTEGRATION GUIDE
 * Cómo integrar el sistema de eventos en tus rutas
 */

// ========================================
// 1. INICIALIZAR SERVICIOS EN server.js
// ========================================

const express = require('express');
const app = express();

// Importar EventBus
const { getEventBus } = require('./src/events/EventBus');
const eventTypes = require('./src/events/eventTypes');

// Importar servicios que escuchan eventos
require('./src/services/EmailEventService');
require('./src/services/NotificationEventService');
require('./src/services/AuditLogEventService');
require('./src/services/AnalyticsEventService');
require('./src/services/WebhookEventService');

// Obtener instancia del bus
const eventBus = getEventBus();

app.listen(3001, () => {
  console.log('🚀 Servidor iniciado con Event-Driven Architecture');
  console.log('📡 EventBus listo para emitir eventos');
  console.log('🎧 Servicios escuchando:');
  console.log('  ✓ Email Service');
  console.log('  ✓ Notification Service');
  console.log('  ✓ Audit Log Service');
  console.log('  ✓ Analytics Service');
  console.log('  ✓ Webhook Service');
});


// ========================================
// 2. USAR EN RUTAS DE AUTENTICACIÓN
// ========================================

// RUTA: POST /auth/register
router.post('/register', async (req, res) => {
  try {
    const { email, firstName, lastName, password } = req.body;

    // 1️⃣ Validar
    if (!email || !password) {
      return res.status(400).json({ error: 'Email y password requeridos' });
    }

    // 2️⃣ Guardar en BD (rápido)
    const user = await Usuario.create({
      email,
      firstName,
      lastName,
      passwordHash: await hashPassword(password),
      plan: 'free'
    });

    // 3️⃣ EMITIR EVENTO (no esperar)
    eventBus.publish(eventTypes.USER.CREATED, {
      userId: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      plan: user.plan,
      signupSource: 'web'
    });

    // 4️⃣ RESPONDER INMEDIATAMENTE (sin esperar email, notificaciones, etc)
    res.status(201).json({
      success: true,
      message: 'Usuario registrado exitosamente',
      userId: user.id
    });

    // ⏸️ A partir de aquí, EN PARALELO:
    // - EmailService envía email de bienvenida
    // - NotificationService crea notificación
    // - AuditLogService registra el evento
    // - AnalyticsService actualiza métricas
    // - WebhookService notifica a Slack/Discord

  } catch (error) {
    res.status(500).json({ error: 'Error registrando usuario' });
  }
});


// RUTA: POST /auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password, ipAddress } = req.body;

    // Buscar usuario
    const user = await Usuario.findOne({ email });

    if (!user || !(await verifyPassword(password, user.passwordHash))) {
      // 🔐 EMITIR: LOGIN FALLIDO
      eventBus.publish(eventTypes.AUTH.LOGIN_FAILED, {
        email,
        reason: user ? 'invalid_password' : 'user_not_found',
        ipAddress: ipAddress || req.ip,
        attempt: 1
      });

      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token
    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET);

    // 🔓 EMITIR: LOGIN EXITOSO
    eventBus.publish(eventTypes.AUTH.LOGIN_SUCCESS, {
      userId: user.id,
      email: user.email,
      ipAddress: ipAddress || req.ip,
      userAgent: req.get('user-agent'),
      method: 'email'
    });

    res.json({
      success: true,
      token,
      user: { id: user.id, email: user.email, firstName: user.firstName }
    });

  } catch (error) {
    res.status(500).json({ error: 'Error en login' });
  }
});


// RUTA: GET /auth/logout
router.post('/logout', authenticate, async (req, res) => {
  try {
    // 🚪 EMITIR: LOGOUT
    eventBus.publish(eventTypes.AUTH.LOGOUT, {
      userId: req.user.id,
      timestamp: new Date()
    });

    res.json({ success: true, message: 'Logout exitoso' });
  } catch (error) {
    res.status(500).json({ error: 'Error en logout' });
  }
});


// ========================================
// 3. EMITIR EVENTOS EN ÓRDENES
// ========================================

router.post('/orders', authenticate, async (req, res) => {
  try {
    const { items, totaltAmount } = req.body;

    // Crear orden
    const order = await Orden.create({
      userId: req.user.id,
      items,
      totalAmount,
      status: 'created'
    });

    // 🎯 EMITIR: ORDEN CREADA
    eventBus.publish(eventTypes.ORDER.CREATED, {
      orderId: order.id,
      userId: req.user.id,
      items,
      totalAmount,
      currency: 'USD'
    });

    res.status(201).json({ orderId: order.id });

  } catch (error) {
    res.status(500).json({ error: 'Error creando orden' });
  }
});


// ========================================
// 4. EMITIR EVENTOS EN PAGOS
// ========================================

router.post('/payment/webhook', async (req, res) => {
  try {
    const { orderId, status, amount } = req.body;

    if (status === 'success') {
      // 💰 EMITIR: PAGO EXITOSO
      eventBus.publish(eventTypes.PAYMENT.SUCCESSFUL, {
        orderId,
        totalAmount: amount,
        paymentMethod: 'stripe',
        transactionId: req.body.transactionId
      });

      // 📦 EMITIR: ORDEN PAGADA
      eventBus.publish(eventTypes.ORDER.PAID, {
        orderId,
        userId: await getOrderUserId(orderId),
        totalAmount: amount,
        currency: 'USD'
      });
    }

    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Error procesando pago' });
  }
});


// ========================================
// 5. COMPARACIÓN: ANTES vs DESPUÉS
// ========================================

/*
ANTES (Bloqueante - Muere bajo carga):
POST /register
  ├─ Validar
  ├─ Guardar en BD (100ms)
  ├─ Enviar email (2000ms) ← ESPERAR
  ├─ Crear notificación (500ms) ← ESPERAR
  ├─ Registrar auditoría (200ms) ← ESPERAR
  ├─ Actualizar métricas (100ms) ← ESPERAR
  └─ Response = 2900ms ❌ LENTO

DESPUÉS (Event-Driven - Escalable):
POST /register
  ├─ Validar (10ms)
  ├─ Guardar en BD (100ms)
  ├─ Emit 'user.created' event (5ms)
  └─ Response = 115ms ✅ RÁPIDO

Luego en PARALELO (sin bloquear):
  ├─ EmailService → envía email (async)
  ├─ NotificationService → crea notificación (async)
  ├─ AuditLogService → registra (async)
  ├─ AnalyticsService → actualiza métricas (async)
  └─ WebhookService → notifica Slack (async)

Beneficios:
✅ Response 25x más rápida
✅ Si email falla, usuario sigue registrado
✅ Si Slack cae, la aplicación funciona
✅ Servicios independientes = fácil de escalar
✅ Con 1000 usuarios: 115ms vs 2900ms = sistema sobrevive
*/


// ========================================
// 6. MONITOREAR EVENTOS (Panel de Control)
// ========================================

router.get('/admin/events/stats', authenticate, async (req, res) => {
  try {
    // Obtener métricas del AnalyticsService
    const { getMetrics, getActiveUsersToday } = require('./src/services/AnalyticsEventService');
    
    const metrics = await getMetrics();
    const activeUsers = await getActiveUsersToday();

    res.json({
      metrics,
      activeUsers,
      timestamp: new Date()
    });

  } catch (error) {
    res.status(500).json({ error: 'Error obteniendo métricas' });
  }
});

// Ver eventos en tiempo real (webhook)
router.get('/admin/events/stream', (req, res) => {
  // Server-Sent Events (SSE) para live events
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Subscribirse a TODOS los eventos
  const allEvents = require('./src/events/eventTypes');
  Object.values(allEvents).forEach(group => {
    Object.values(group).forEach(eventType => {
      eventBus.subscribe(eventType, (event) => {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      });
    });
  });

  req.on('close', () => {
    res.end();
  });
});


// ========================================
// 7. VARIABLE DE ENTORNO NECESARIA
// ========================================

/*
.env:
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...
*/

module.exports = {
  setupEventDrivenArchitecture: (app) => {
    console.log('✅ Event-Driven Architecture configurada');
  }
};
