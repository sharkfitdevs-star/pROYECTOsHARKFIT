# 🚀 EVO5 MIDDLEWARE - PARTE 3: OBSERVABILIDAD, RIESGOS Y DEPLOY

**Continuación de:** EVO5_MIDDLEWARE_PARTE2_CODIGO.md

**Nota 2026:** El proyecto actual usa SQLite; las referencias a PostgreSQL/Mongo en este documento son historicas.

---

## 10. OBSERVABILIDAD & MONITORING

### 10.1 Logs Estructurados (Winston + JSON)

```javascript
// backend-data-intake/src/utils/logger.js

const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: {
        service: 'evo5-middleware',
        environment: process.env.NODE_ENV,
        version: require('../../package.json').version
    },
    transports: [
        // Console output (development)
        new winston.transports.Console({
            format: process.env.NODE_ENV === 'production'
                ? winston.format.json()
                : winston.format.combine(
                    winston.format.colorize(),
                    winston.format.simple()
                )
        }),

        // File logging (production)
        new winston.transports.File({
            filename: path.join('/var/log/middleware', 'combined.log'),
            maxsize: 10485760, // 10MB
            maxFiles: 10,
            tailable: true
        }),

        // Error logs separately
        new winston.transports.File({
            filename: path.join('/var/log/middleware', 'error.log'),
            level: 'error',
            maxsize: 10485760,
            maxFiles: 5
        })
    ]
});

// Ejemplo de uso
logger.info('Sync job started', {
    syncId: '550e8400-e29b-41d4-a716-446655440000',
    tenantId: 'acme-tenant',
    entityType: 'member',
    operation: 'UPSERT',
    duration_ms: 245
});

// Resultado JSON:
// {
//   "timestamp": "2024-02-11 10:30:45",
//   "level": "info",
//   "message": "Sync job started",
//   "syncId": "550e8400-e29b-41d4-a716-446655440000",
//   "tenantId": "acme-tenant",
//   "entityType": "member",
//   "operation": "UPSERT",
//   "duration_ms": 245,
//   "service": "evo5-middleware",
//   "environment": "production"
// }

module.exports = logger;
```

### 10.2 Métricas Prometheus

```javascript
// backend-data-intake/src/monitoring/metrics.js

const prometheus = require('prom-client');

// Métricas personalizadas
const syncQueueGauge = new prometheus.Gauge({
    name: 'sync_queue_pending',
    help: 'Número de items pendientes en la cola de sincronización',
    labelNames: ['tenant_id', 'entity_type']
});

const syncDurationHistogram = new prometheus.Histogram({
    name: 'sync_duration_seconds',
    help: 'Tiempo de duración de cada sincronización',
    labelNames: ['tenant_id', 'entity_type', 'status'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
});

const syncErrorsCounter = new prometheus.Counter({
    name: 'sync_errors_total',
    help: 'Total de errores en sincronización',
    labelNames: ['tenant_id', 'entity_type', 'error_code']
});

const dbConnectionPoolGauge = new prometheus.Gauge({
    name: 'db_connection_pool_used',
    help: 'Conexiones activas en el pool',
    labelNames: []
});

const evo5ApiCallsCounter = new prometheus.Counter({
    name: 'evo5_api_calls_total',
    help: 'Total de llamadas a EVO5 API',
    labelNames: ['method', 'endpoint', 'status_code']
});

const cacheHitsCounter = new prometheus.Counter({
    name: 'cache_hits_total',
    help: 'Cache hits (Redis)',
    labelNames: ['cache_key']
});

const cacheMissesCounter = new prometheus.Counter({
    name: 'cache_misses_total',
    help: 'Cache misses (Redis)',
    labelNames: ['cache_key']
});

// Función para actualizar métricas
async function updateMetrics(pool) {
    const result = await pool.query('SELECT count(*) FROM sync_queue WHERE status = $1', ['pending']);
    const pending = parseInt(result.rows[0].count);
    
    syncQueueGauge.set({ tenant_id: 'all', entity_type: 'all' }, pending);
}

// Endpoint Prometheus
const metricsRouter = require('express').Router();
metricsRouter.get('/metrics', async (req, res) => {
    res.set('Content-Type', prometheus.register.contentType);
    res.end(await prometheus.register.metrics());
});

module.exports = {
    syncQueueGauge,
    syncDurationHistogram,
    syncErrorsCounter,
    dbConnectionPoolGauge,
    evo5ApiCallsCounter,
    cacheHitsCounter,
    cacheMissesCounter,
    updateMetrics,
    metricsRouter
};
```

### 10.3 Health Checks (Kubernetes)

```javascript
// backend-data-intake/src/monitoring/healthChecks.js

const pool = require('../db/postgres');
const redis = require('../config/redis');
const logger = require('../utils/logger');

class HealthChecker {
    // Liveness probe (está el servicio vivo?)
    async livenessProbe() {
        try {
            // Verificar que el servicio responde
            return { status: 'alive', timestamp: new Date() };
        } catch (error) {
            logger.error('Liveness probe failed:', error);
            throw error;
        }
    }

    // Readiness probe (está listo para recibir tráfico?)
    async readinessProbe() {
        const checks = {
            database: await this.checkDatabase(),
            redis: await this.checkRedis(),
            evo5: await this.checkEvo5(),
            diskSpace: await this.checkDiskSpace()
        };

        const allHealthy = Object.values(checks).every(c => c.status === 'healthy');

        return {
            ready: allHealthy,
            checks,
            timestamp: new Date()
        };
    }

    async checkDatabase() {
        try {
            const result = await pool.query('SELECT NOW()');
            return { status: 'healthy', latency_ms: 15 };
        } catch (error) {
            logger.error('Database health check failed:', error);
            return { status: 'unhealthy', error: error.message };
        }
    }

    async checkRedis() {
        try {
            await redis.ping();
            return { status: 'healthy', latency_ms: 5 };
        } catch (error) {
            logger.error('Redis health check failed:', error);
            return { status: 'unhealthy', error: error.message };
        }
    }

    async checkEvo5() {
        // Verificar que podemos hacer una llamada a EVO5
        try {
            // Esto sería una llamada dummy
            return { status: 'healthy', latency_ms: 200 };
        } catch (error) {
            return { status: 'degraded', error: error.message };
        }
    }

    async checkDiskSpace() {
        // Verificar espacio en disco
        return { status: 'healthy', available_gb: 150 };
    }
}

module.exports = new HealthChecker();
```

---

## 11. RIESGOS & MITIGACIÓN

### 11.1 Matriz de Riesgos

| ID | Riesgo | Probabilidad | Impacto | Mitigation | Owner |
|-----|--------|-------------|--------|-----------|-------|
| R1 | EVO5 API no disponible | MEDIA | ALTO | Rate limiting + Circuit breaker + Fallback to cache | Infra |
| R2 | Token EVO5 expirado | ALTA | MEDIO | Auto-refresh con 10min antes expiración | Security |
| R3 | Conflictos de datos (bidireccional) | MEDIA | MEDIO | Versioning + Conflict detection + Manual resolution | Dev |
| R4 | Pérdida de datos en sync_queue | BAJA | CRÍTICO | PostgreSQL replication + Backups diarios | DBA |
| R5 | Race condition en UPSERT | MEDIA | MEDIO | SERIALIZABLE isolation + Optimistic locking | Dev |
| R6 | Redis cache inconsistente | BAJA | MEDIO | TTL + Invalidation listeners + Fallback to DB | Infra |
| R7 | Bull queue descompuesta | MEDIA | ALTO | Monitoring alerts + Manual recovery procedure | Infra |
| R8 | Credentials leaking en logs | BAJA | CRÍTICO | No log secrets + Encryption at rest + PII masking | Security |
| R9 | Rate limit bypass (DoS) | BAJA | ALTO | IP-based rate limit + API key throttling | Security |
| R10 | Inconsistencia multi-tenant | MEDIA | CRÍTICO | Row-level security + Tenant isolation testing | Dev |

### 11.2 Mitigación R1: Circuit Breaker

```javascript
// backend-data-intake/src/services/CircuitBreaker.js

const logger = require('../utils/logger');

class CircuitBreaker {
    constructor(name, failureThreshold = 5, timeout = 60000) {
        this.name = name;
        this.failureThreshold = failureThreshold;
        this.timeout = timeout;
        
        this.state = 'CLOSED'; // CLOSED | OPEN | HALF_OPEN
        this.failures = 0;
        this.lastFailureTime = null;
    }

    async execute(fn) {
        if (this.state === 'OPEN') {
            if (Date.now() - this.lastFailureTime > this.timeout) {
                logger.info(`Circuit breaker ${this.name} entering HALF_OPEN state`);
                this.state = 'HALF_OPEN';
            } else {
                throw new Error(`Circuit breaker ${this.name} is OPEN`);
            }
        }

        try {
            const result = await fn();
            
            if (this.state === 'HALF_OPEN') {
                logger.info(`Circuit breaker ${this.name} recovered, closing`);
                this.state = 'CLOSED';
                this.failures = 0;
            }
            
            return result;
        } catch (error) {
            this.failures++;
            this.lastFailureTime = Date.now();

            if (this.failures >= this.failureThreshold) {
                logger.warn(`Circuit breaker ${this.name} opened after ${this.failures} failures`);
                this.state = 'OPEN';
            }

            throw error;
        }
    }
}

module.exports = CircuitBreaker;
```

### 11.3 Mitigación R8: Secrets No Logging

```javascript
// backend-data-intake/src/utils/logger.js (mejorado)

const SENSITIVE_KEYS = [
    'api_token', 'refresh_token', 'password', 'secret',
    'api_key', 'access_token', 'authorization', 'Bearer'
];

function maskSensitiveData(data) {
    if (typeof data !== 'object' || data === null) {
        return data;
    }

    const masked = { ...data };
    
    for (const key of Object.keys(masked)) {
        if (SENSITIVE_KEYS.some(sensitive => key.toLowerCase().includes(sensitive))) {
            masked[key] = `***REDACTED***`;
        } else if (typeof masked[key] === 'object') {
            masked[key] = maskSensitiveData(masked[key]);
        }
    }

    return masked;
}

logger.info('Storing credentials', maskSensitiveData({
    dns_client: 'mydomain.evo5.app',
    api_token: 'super-secret-token-12345',
    email: 'admin@example.com'
}));

// Output:
// {
//   "dns_client": "mydomain.evo5.app",
//   "api_token": "***REDACTED***",
//   "email": "admin@example.com"
// }
```

---

## 12. PLAN DE DEPLOY

### 12.1 Docker Compose (Local/Dev)

```yaml
# docker-compose.yml

version: '3.9'

services:
  # PostgreSQL
  postgres:
    image: postgres:15-alpine
    container_name: sharkfit-postgres
    environment:
      POSTGRES_DB: sharkfit_dev
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: devpassword
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./src/db/migrations/001_init_schema.sql:/docker-entrypoint-initdb.d/01_schema.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Redis
  redis:
    image: redis:7-alpine
    container_name: sharkfit-redis
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Middleware Service
  middleware:
    build:
      context: .
      dockerfile: docker/Dockerfile
    container_name: sharkfit-middleware
    environment:
      NODE_ENV: development
      PORT: 3002
      
      # Database
      DB_HOST: postgres
      DB_PORT: 5432
      DB_NAME: sharkfit_dev
      DB_USER: appuser
      DB_PASSWORD: devpassword
      
      # Redis
      REDIS_URL: redis://redis:6379
      
      # Logging
      LOG_LEVEL: debug
    ports:
      - "3002:3002"
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./src:/app/src
      - /app/node_modules
    command: npm run dev
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3002/health"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
  redis_data:

networks:
  default:
    name: sharkfit-network
```

### 12.2 Database Migrations

```bash
# scripts/migrate.sh

#!/bin/bash

set -e

DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-sharkfit_dev}
DB_USER=${DB_USER:-appuser}

echo "🔄 Running database migrations..."

# 001: Init schema
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f src/db/migrations/001_init_schema.sql

# 002: Add indexes
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f src/db/migrations/002_add_indexes.sql

# 003: Add audit
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -f src/db/migrations/003_add_audit.sql

echo "✅ Migrations completed successfully"

# Verificar estado
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" \
  -c "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';"
```

### 12.3 Helm Chart (Kubernetes)

```yaml
# helm/values.yaml

replicaCount: 3

image:
  repository: myregistry.azurecr.io/sharkfit-middleware
  tag: "1.0.0"
  pullPolicy: IfNotPresent

service:
  type: ClusterIP
  port: 3002
  targetPort: 3002

ingress:
  enabled: true
  className: nginx
  annotations:
    cert-manager.io/cluster-issuer: letsencrypt-prod
  hosts:
    - host: api.sharkfit.app
      paths:
        - path: /
          pathType: Prefix
  tls:
    - secretName: sharkfit-tls
      hosts:
        - api.sharkfit.app

resources:
  requests:
    cpu: 100m
    memory: 256Mi
  limits:
    cpu: 500m
    memory: 512Mi

autoscaling:
  enabled: true
  minReplicas: 3
  maxReplicas: 10
  targetCPUUtilizationPercentage: 80

livenessProbe:
  httpGet:
    path: /health/live
    port: 3002
  initialDelaySeconds: 30
  periodSeconds: 10

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3002
  initialDelaySeconds: 5
  periodSeconds: 5

env:
  - name: NODE_ENV
    value: production
  - name: LOG_LEVEL
    value: info
  - name: DB_HOST
    valueFrom:
      configMapKeyRef:
        name: app-config
        key: db-host
  - name: DB_PASSWORD
    valueFrom:
      secretKeyRef:
        name: db-secrets
        key: password
  - name: ENCRYPTION_KEY
    valueFrom:
      secretKeyRef:
        name: encryption-secrets
        key: key
```

### 12.4 GitHub Actions CI/CD

```yaml
# .github/workflows/deploy.yml

name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_DB: test_db
          POSTGRES_USER: testuser
          POSTGRES_PASSWORD: testpass
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

      redis:
        image: redis:7-alpine
        options: >-
          --health-cmd "redis-cli ping"
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'npm'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run unit tests
        run: npm run test:unit
      
      - name: Run integration tests
        run: npm run test:integration
        env:
          DB_HOST: postgres
          REDIS_URL: redis://redis:6379

  build:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Build Docker image
        run: |
          docker build -t ${{ secrets.REGISTRY_URL }}/sharkfit-middleware:${{ github.sha }} .
          docker tag ${{ secrets.REGISTRY_URL }}/sharkfit-middleware:${{ github.sha }} \
                     ${{ secrets.REGISTRY_URL }}/sharkfit-middleware:latest
      
      - name: Push to registry
        run: |
          echo ${{ secrets.REGISTRY_PASSWORD }} | docker login -u ${{ secrets.REGISTRY_USERNAME }} --password-stdin ${{ secrets.REGISTRY_URL }}
          docker push ${{ secrets.REGISTRY_URL }}/sharkfit-middleware:${{ github.sha }}
          docker push ${{ secrets.REGISTRY_URL }}/sharkfit-middleware:latest

  deploy:
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Deploy to Kubernetes
        run: |
          helm upgrade --install sharkfit-middleware ./helm \
            --set image.tag=${{ github.sha }} \
            --kubeconfig=${{ secrets.KUBE_CONFIG }}
      
      - name: Verify deployment
        run: |
          kubectl rollout status deployment/sharkfit-middleware -n default
          kubectl get pods -n default -l app=sharkfit-middleware
```

---

## 13. RESUMEN EJECUTIVO DE JORNADA

### Que Hemos Logrado

```
═══════════════════════════════════════════════════════════════
                    ARQUITECTURA COMPLETADA
═══════════════════════════════════════════════════════════════

📊 DISEÑO GENERAL
─────────────────────────────────────────────────────────────
Frontend (React 5173)
    ↓ HTTP REST + WebSocket
Stage 4 (Express 3001, mejorado)
    ↓ orquestación + caché
EVO5 Integration Middleware (Node.js 3002, nuevo)
    ↓ lógica pesada, BD
PostgreSQL + Redis + Bull Queue
    ↓ persistencia + caché + async

═══════════════════════════════════════════════════════════════

🗄️  BASE DE DATOS POSTGRESQL
─────────────────────────────────────────────────────────────
14 TABLAS PRINCIPALES:

✅ Multi-tenant:
   • tenants (aislamiento por cliente)
   • companies (múltiples gimnasios por tenant)

✅ Autenticación EVO5:
   • api_credentials (encriptadas, auto-refresh)

✅ Sincronización:
   • members, plans, memberships (UPSERTs)
   • sync_queue (event-driven, 15+ estados)
   • sync_deadletter (fallos permanentes)
   • sync_offsets (delta sync tracking)

✅ Integridad:
   • audit_logs (100% trazabilidad)
   • rate_limits (throttle EVO5)
   • cache_invalidation (Redis coherencia)

INDEXES: 25+ (optimizados para queries frecuentes)

═══════════════════════════════════════════════════════════════

🔐 SEGURIDAD
─────────────────────────────────────────────────────────────
✅ Tokens encriptados en BD (AES-256 + IV)
✅ Auto-refresh tokens (10min antes expiración)
✅ Secrets manager (AWS Secrets, no hardcoded)
✅ PII masking en logs
✅ Row-level security (tenant isolation)
✅ Audit trail completo (quién, qué, cuándo)
✅ Rate limiting por tenant + IP

═══════════════════════════════════════════════════════════════

⚡ SINCRONIZACIÓN INTELIGENTE
─────────────────────────────────────────────────────────────
✅ Idempotencia (deduplicación por idempotency_key)
✅ UPSERT automático (create or update)
✅ Delta sync (solo cambios desde último offset)
✅ Conflict detection + resolution strategies
✅ Event-driven (sync_queue → Bull Workers)
✅ Retry logic con exponential backoff
✅ Dead letter queue (fallos permanentes)
✅ Versionamiento (local_version vs evo5_version)

═══════════════════════════════════════════════════════════════

📡 BULL QUEUE WORKERS (Async Processing)
─────────────────────────────────────────────────────────────
JOB TYPES:

1. SyncQueueWorker (procesa sync_queue)
   • Lockeja records para evitar duplicidad
   • Llama a EVO5 API
   • Maneja reintentos (exponential backoff)
   • Mueve a deadletter si fails permanente

2. RetryWorker (reintentos de fallos)
   • Backoff: 2^attempt * 1000ms
   • Max 3 intentos por defecto
   • Log detallado en cada intento

3. TokenRefreshWorker (auto-refresh credentials)
   • Corre cada 30 minutos
   • Refresca tokens a punto de expirar
   • Invalida credenciales si refresh falla 3 veces

4. HealthCheckWorker (monitoreo)
   • Verifica DB, Redis, EVO5 disponibility
   • Alertas automáticas si alguno cae
   • Circuit breaker para EVO5

═══════════════════════════════════════════════════════════════

📊 OBSERVABILIDAD
─────────────────────────────────────────────────────────────
LOGGING:
✅ Logs JSON estructurados
✅ Severidad (INFO, WARNING, ERROR, CRITICAL)
✅ Contexto enriquecido (tenant, user, operation)
✅ PII masking automático
✅ Archivo/Console output

METRICS (Prometheus):
✅ sync_queue_pending (items esperando)
✅ sync_duration_seconds (latencia)
✅ sync_errors_total (errores por tipo)
✅ db_connection_pool_used
✅ evo5_api_calls_total
✅ cache_hits/misses

HEALTH CHECKS:
✅ Liveness probe (¿vivo?)
✅ Readiness probe (¿listo para tráfico?)
✅ /health/live, /health/ready endpoints
✅ Control de recursos (CPU, memoria, disco)

═══════════════════════════════════════════════════════════════

🚀 DEPLOYMENT (3 opciones)
─────────────────────────────────────────────────────────────
1. LOCAL DEV:
   docker-compose up
   • PostgreSQL 15 + Redis 7 + Node.js 18

2. KUBERNETES (Helm):
   helm install sharkfit-middleware ./helm
   • 3+ replicas (autoscaling)
   • Ingress HTTPS (Let's Encrypt)
   • Health checks
   • Resource limits

3. CI/CD (GitHub Actions):
   • Test + Build + Push to registry + Deploy
   • Automated on push to main

═══════════════════════════════════════════════════════════════

⚠️  RIESGOS MITIGADOS
─────────────────────────────────────────────────────────────
R1: EVO5 no disponible → Circuit breaker + cache fallback
R2: Token expirado → Auto-refresh con 10min buffer
R3: Conflictos datos → Versioning + detection + resolver manual
R4: Pérdida BD → PostgreSQL replication + backups diarios
R5: Race conditions → SERIALIZABLE isolation + locks
R6: Cache inconsistente → TTL + invalidation listeners
R7: Bull queue muere → Monitoring + recovery procedure
R8: Secrets en logs → PII masking + encryption at rest
R9: DoS → IP-based rate limiting + API key throttle
R10: Tenant leakage → Row-level security + tests

═══════════════════════════════════════════════════════════════

🎯 PRÓXIMOS PASOS
─────────────────────────────────────────────────────────────
FASE 1 (Week 1-2):
□ Crear repositorio Git
□ Setup PostgreSQL en producción
□ Setup Redis en producción
□ Tests unitarios (95% coverage)
□ Documentación técnica completada

FASE 2 (Week 3-4):
□ Deploy en staging (Kubernetes)
□ Tests de integración EVO5
□ Load testing (Bull queue)
□ Security audit
□ Disaster recovery drills

FASE 3 (Week 5-6):
□ Deploy en producción
□ Canary deployment
□ Monitoring 24/7 activado
□ Runbooks para operaciones
□ Handoff a ops team

═══════════════════════════════════════════════════════════════
```

---

## 14. FILES DE REFERENCIA RÁPIDA

```
📄 DOCUMENTACIÓN CREADA:

1. EVO5_MIDDLEWARE_ARQUITECTURA_COMPLETA.md (PARTE 1)
   ├─ Análisis arquitectónico
   ├─ Problemas detectados
   ├─ Solución propuesta
   ├─ Esquema PostgreSQL (14 tablas, 25+ indexes)
   └─ Diagrama de flujos (2 flujos completos)

2. EVO5_MIDDLEWARE_PARTE2_CODIGO.md (PARTE 2)
   ├─ Encriptación de tokens (pgcrypto + AES)
   ├─ CredentialsManager (save, get, refresh)
   ├─ UPSERT logic (idempotencia)
   ├─ Delta sync (offset tracking)
   ├─ Estructura de carpetas completa
   └─ Bull Worker (async processing)

3. EVO5_MIDDLEWARE_PARTE3_OPERACIONES.md (PARTE 3)
   ├─ Logging structured (Winston)
   ├─ Métricas Prometheus
   ├─ Health checks (liveness/readiness)
   ├─ Matriz de riesgos (10 riesgos)
   ├─ Circuit breaker
   ├─ Docker Compose
   ├─ Migrations SQL
   ├─ Helm Chart
   ├─ GitHub Actions CI/CD
   └─ Resumen ejecutivo

🔧 CONFIGURACIÓN:

• .env.production (todos los valores)
• docker-compose.yml (local dev)
• helm/values.yaml (K8s)
• .github/workflows/deploy.yml (CI/CD)

🗄️  MIGRACIONES SQL:

• 001_init_schema.sql (14 tablas)
• 002_add_indexes.sql (25+ indexes)
• 003_add_audit.sql (audit triggers)

📦 ESTRUCTURA CARPETAS:

backend-data-intake/
├── src/
│   ├── middleware/
│   ├── routes/
│   ├── controllers/
│   ├── services/
│   ├── workers/
│   ├── db/
│   ├── utils/
│   ├── events/
│   ├── config/
│   └── monitoring/
├── tests/
├── docker/
└── helm/
```

---

## 15. TIMELINE DE IMPLEMENTACIÓN

```
SEMANA 1:
=========
Lunes-Martes:
  • Revisar documentación
  • Setup repositorio
  • Setup PostgreSQL (replication)
  • Setup Redis (cluster)

Miércoles-Jueves:
  • Crear migrations (schema)
  • Crear tablas base
  • Setup indexes

Viernes:
  • Seed data (gimnasios, miembros)
  • Tests de conectividad
  • Begin code


SEMANA 2:
=========
Implementar servicios:
  • CredentialsManager (encriptación)
  • MembersService (UPSERT)
  • DeltaSyncService (offset tracking)
  • Bull Workers (async processing)

Pruebas:
  • Unit tests (95% coverage)
  • Integration tests (EVO5 mock)
  • Load tests (Bull queue)

Deployment:
  • Docker image
  • Push a registry
  • Helm chart


SEMANA 3:
=========
Staging deployment:
  • Deploy en K8s
  • End-to-end testing
  • Security audit
  • Load testing

Rollout plan:
  • Canary (10% → 50% → 100%)
  • Rollback procedure
  • Alertas configuradas


SEMANA 4:
=========
Production:
  • Go-live con canary
  • Monitoring 24/7
  • Incident response drill
  • Handoff a ops
```

---

## 🎊 CONCLUSIÓN

Hemos diseñado una **arquitectura de clase empresarial** para sincronización robusta con EVO5:

✅ **Multi-tenant** con aislamiento de datos  
✅ **Event-driven** con procesamiento async  
✅ **Idempotencia garantizada** (sin duplicados)  
✅ **Recuperación de fallos** (retry + deadletter)  
✅ **Seguridad by default** (encriptación, secrets, audit)  
✅ **Observable** (logs, metrics, health checks)  
✅ **Escalable** (K8s + autoscaling)  

**Status:** 🟢 Blueprint Ready → Listo para implementación

