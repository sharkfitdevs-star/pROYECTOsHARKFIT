/**
 * 🔧 CONFIGURACIÓN NECESARIA PARA EVENT-DRIVEN ARCHITECTURE
 * Variables de entorno y setup recomendados
 */

/**
 * AGREGAR ESTAS LÍNEAS AL .env EXISTENTE
 */

// ============================================
// REDIS CONFIGURATION (Required)
// ============================================

// Host y puerto de Redis

// Contraseña de Redis (si está configurada)
// REDIS_PASSWORD=

// Database de Redis (0-15)


// ============================================
// BULL QUEUE CONFIGURATION
// ============================================

// Número máximo de reintentos para eventos fallidos

// Delay en ms entre reintentos (backoff exponencial)

// Tiempo máximo para procesar un evento (ms)


// ============================================
// EMAIL SERVICE CONFIGURATION
// ============================================

// Para desarrollo: 'console' (imprime en terminal)
// Para producción: 'sendgrid' o 'mailgun'
EMAIL_PROVIDER=console

// Si usas SendGrid:
// SENDGRID_API_KEY=SG.xxxxxx...

// Si usas Mailgun:
// MAILGUN_API_KEY=
// MAILGUN_DOMAIN=

// Email remitente
SENDER_EMAIL=noreply@sharkfit.com
SENDER_NAME=Sharkfit


// ============================================
// NOTIFICATIONS CONFIGURATION
// ============================================

// TTL de notificaciones en Redis (segundos)
NOTIFICATION_TTL=300

// Habilitar notificaciones via WebSocket
ENABLE_WEBSOCKET_NOTIFICATIONS=true


// ============================================
// WEBHOOK INTEGRATIONS (Opcional pero recomendado)
// ============================================

// Slack Webhook URL
// Obtener de: https://api.slack.com/apps → Incoming Webhooks
// SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL

// Discord Webhook URL
// Obtener del servidor Discord: canal → settings → integrations → webhooks
// DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/ID/TOKEN

// Habilitar webhooks
ENABLE_WEBHOOKS=false  // Cambiar a true cuando configures Slack/Discord


// ============================================
// AUDIT LOG CONFIGURATION
// ============================================

// Cuántos días mantener logs de auditoría
AUDIT_LOG_RETENTION_DAYS=90

// Guardar logs en MongoDB
AUDIT_TO_MONGODB=true


// ============================================
// ANALYTICS CONFIGURATION
// ============================================

// Intervalo para agregar métricas a MongoDB (ms)
ANALYTICS_DUMP_INTERVAL=3600000  // 1 hora

// Habilitar dashboard de analytics
ENABLE_ANALYTICS_DASHBOARD=true


// ============================================
// EVENT CONFIGURATION
// ============================================

// Registrar todos los eventos emitidos
LOG_EVENTS=true

// Nivel de detalle de logs
EVENT_LOG_LEVEL=info  // 'debug' | 'info' | 'warn' | 'error'


/**
 * CONFIGURACIÓN MÍNIMA PARA EMPEZAR (.env)
 */

/*
# Core
NODE_ENV=development
PORT=3001

# MongoDB
MONGODB_URI=mongodb://localhost:27017/sharkfit

# Redis (DEBE estar activo)

# Event-Driven
LOG_EVENTS=true
EMAIL_PROVIDER=console
ENABLE_WEBHOOKS=false
*/


/**
 * PASOS DE SETUP
 */

/*
1. INSTALAR REDIS (local development)

   OPCIÓN A: Windows + WSL2
   $ wsl
   $ sudo apt-get install redis-server
   $ redis-server

   OPCIÓN B: Docker
   $ docker run -d -p 6379:6379 --name redis redis:latest

   OPCIÓN C: Windows directo
   - Descargar: https://github.com/microsoftarchive/redis/releases
   - Instalar y ejecutar

   VERIFICAR:
   $ redis-cli
   > ping
   PONG ✅

2. ACTUALIZAR .env con valores de arriba

3. INSTALAR DEPENDENCIAS (si no está hecho)
   $ cd backend-data-intake
   $ npm install

4. INICIAR BACKEND
   $ npm start
   
   Deberías ver:
   ✅ MongoDB conectado
   ✅ Redis conectado
   ✅ Event-Driven Architecture lista
   ✅ Servicios escuchando (Email, Notification, etc)

5. PROBAR
   - POST http://localhost:3001/api/auth/register
   - Ver que responde en ~115ms
   - Ver que log de auditoría, email, etc ocurren en paralelo
*/


/**
 * OBTENER WEBHOOKS (Opcional para alertas)
 */

/*
=== SLACK ===
1. Ir a https://api.slack.com/apps
2. Create New App → From scratch
3. Name: "Sharkfit Events"
4. Workspace: Tu workspace
5. En sidebar: Incoming Webhooks
6. Activar switch "Incoming Webhooks"
7. Click "Add New Webhook to Workspace"
8. Elegir canal: #notifications (o crear uno)
9. Copiar URL
10. En .env:
    SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
    ENABLE_WEBHOOKS=true

=== DISCORD ===
1. En tu servidor Discord
2. Click en nombre → Integrations
3. Webhooks → New Webhook
4. Dar nombre (ej: "Sharkfit Events")
5. Elegir canal
6. Copy Webhook URL
7. En .env:
    DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...
    ENABLE_WEBHOOKS=true
*/


/**
 * ESTRUCTURA RECOMENDADA PARA PRODUCCIÓN
 */

/*
# ========== SECURITY ==========
NODE_ENV=production
JWT_SECRET=base64:random-string-128-chars-minimum
JWT_ACCESS_SECRET=base64:another-random-secret
JWT_REFRESH_SECRET=base64:different-secret

# ========== DATABASE ==========
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/sharkfit

# ========== REDIS ==========
REDIS_HOST=redis-prod.example.com
REDIS_PORT=6379
REDIS_PASSWORD=secure-redis-password

# ========== EMAIL (SendGrid en prod) ==========
EMAIL_PROVIDER=sendgrid
SENDGRID_API_KEY=SG.xxxxxxxxxxxxx
SENDER_EMAIL=noreply@sharkfit.com

# ========== WEBHOOKS ==========
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
DISCORD_WEBHOOK_URL=https://discordapp.com/api/webhooks/...
ENABLE_WEBHOOKS=true

# ========== MONITORING ==========
LOG_EVENTS=true
EVENT_LOG_LEVEL=warn
AUDIT_LOG_RETENTION_DAYS=365

# ========== INFRA ==========
PORT=3001
LOG_LEVEL=info
*/


module.exports = {
  description: 'Event-Driven Architecture Configuration Guide',
  
  steps: [
    'Instalar Redis (local o Docker)',
    'Actualizar .env con variables de arriba',
    'Iniciar backend: npm start',
    'Verificar que EventBus está activo',
    'Hacer POST /register y ver respuesta rápida',
    '(Opcional) Configurar Slack/Discord webhooks'
  ],

  serviceStatus: {
    'EventBus': 'Requerido - Dispatcher de eventos',
    'EmailService': 'Automático - Envía emails async',
    'NotificationService': 'Automático - Crea notificaciones',
    'AuditLogService': 'Automático - Registra eventos',
    'AnalyticsService': 'Automático - Updatea métricas',
    'WebhookService': 'Opcional - Notifica sistemas externos'
  }
};
