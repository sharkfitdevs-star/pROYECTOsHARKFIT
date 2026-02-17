# 🔐 EVO5 MIDDLEWARE - PARTE 2: SEGURIDAD, CÓDIGO Y OPERACIONES

**Continuación de:** EVO5_MIDDLEWARE_ARQUITECTURA_COMPLETA.md

**Nota 2026:** Referencias a SQLite son históricas; la ingestión y microservicios usan MongoDB.

---

## 6. SEGURIDAD DE TOKENS

### 6.1 Encriptación en PostgreSQL

```sql
-- OPCIÓN A: pgcrypto (nativa)
-- Ventaja: Sin dependencias externas
-- Desventaja: Lenta para volumen alto

-- Insertar credencial encriptado
INSERT INTO api_credentials (
    tenant_id, company_id, dns_client, 
    api_token_encrypted, refresh_token_encrypted
) VALUES (
    $1, $2, $3,
    pgp_sym_encrypt($4, 'SECRET_KEY'),
    pgp_sym_encrypt($5, 'SECRET_KEY')
);

-- Leer credencial desencriptado
SELECT 
    id,
    dns_client,
    pgp_sym_decrypt(api_token_encrypted, 'SECRET_KEY') as api_token,
    pgp_sym_decrypt(refresh_token_encrypted, 'SECRET_KEY') as refresh_token
FROM api_credentials
WHERE tenant_id = $1 AND company_id = $2 AND is_active = true;


-- OPCIÓN B: AES-256 con IV
-- Ventaja: Mejor rendimiento
-- Desventaja: Más código

CREATE OR REPLACE FUNCTION encrypt_token(token TEXT, encryption_key TEXT)
RETURNS BYTEA AS $$
BEGIN
    RETURN crypt(token, gen_salt('md5')) || encode(
        pgp_sym_encrypt(token, encryption_key), 'hex'
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_token(encrypted BYTEA, encryption_key TEXT)
RETURNS TEXT AS $$
BEGIN
    RETURN pgp_sym_decrypt(encrypted, encryption_key);
END;
$$ LANGUAGE plpgsql;
```

### 6.2 Secrets Manager (Environment)

```bash
# .env.production

# ============ ENCRYPTION ============
ENCRYPTION_KEY=your-256-bit-key-here # debe ser 32 caracteres
ENCRYPTION_ALGORITHM=aes-256-cbc

# ============ JWT (Stage 4) ============
JWT_SECRET=long-random-secret-min-64-chars
JWT_EXPIRES_IN=7d

# ============ EVO5 CREDENTIALS ============
# NO GUARDAR AQUÍ - Usar AWS Secrets Manager
# Este es solo para desarrollo

# ============ DATABASE ============
DB_HOST=postgres.prod.internal
DB_PORT=5432
DB_NAME=sharkfit_prod
DB_USER=app_user
DB_PASSWORD=${AWS_SECRETS_DB_PASSWORD}
DB_SSL=true
DB_CONNECTION_POOL=20

# ============ REDIS ============
REDIS_HOST=redis.prod.internal
REDIS_PORT=6379
REDIS_DB=0
REDIS_PASSWORD=${AWS_SECRETS_REDIS_PASSWORD}

# ============ LOGGING ============
LOG_LEVEL=info
LOG_FORMAT=json

# ============ MONITORING ============
SENTRY_DSN=${AWS_SECRETS_SENTRY_DSN}
DD_API_KEY=${AWS_SECRETS_DD_API_KEY}
```

### 6.3 Servicio de Gestión de Credenciales

```javascript
// backend-data-intake/src/services/CredentialsManager.js

const crypto = require('crypto');
const pool = require('../db/postgres');
const logger = require('../utils/logger');

class CredentialsManager {
    constructor() {
        this.encryptionKey = process.env.ENCRYPTION_KEY;
        this.algorithm = process.env.ENCRYPTION_ALGORITHM || 'aes-256-cbc';
    }

    // Encriptar token antes de guardar
    encryptToken(token) {
        try {
            const iv = crypto.randomBytes(16);
            const cipher = crypto.createCipheriv(
                this.algorithm,
                Buffer.from(this.encryptionKey, 'hex'),
                iv
            );
            
            let encrypted = cipher.update(token, 'utf8', 'hex');
            encrypted += cipher.final('hex');
            
            // Retornar: IV + encrypted (para poder desencriptar luego)
            return `${iv.toString('hex')}:${encrypted}`;
        } catch (error) {
            logger.error('Encryption failed:', { error });
            throw new Error('Token encryption failed');
        }
    }

    // Desencriptar token
    decryptToken(encryptedData) {
        try {
            const [ivHex, encrypted] = encryptedData.split(':');
            const iv = Buffer.from(ivHex, 'hex');
            const decipher = crypto.createDecipheriv(
                this.algorithm,
                Buffer.from(this.encryptionKey, 'hex'),
                iv
            );
            
            let decrypted = decipher.update(encrypted, 'hex', 'utf8');
            decrypted += decipher.final('utf8');
            
            return decrypted;
        } catch (error) {
            logger.error('Decryption failed:', { error });
            throw new Error('Token decryption failed');
        }
    }

    // Guardar credenciales (encriptadas automáticamente)
    async saveCredentials(tenantId, companyId, { dns_client, api_token, refresh_token }) {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const encryptedApiToken = this.encryptToken(api_token);
            const encryptedRefreshToken = refresh_token 
                ? this.encryptToken(refresh_token) 
                : null;

            // Verificar si existe
            const existing = await client.query(
                `SELECT id FROM api_credentials 
                 WHERE tenant_id = $1 AND company_id = $2 AND dns_client = $3`,
                [tenantId, companyId, dns_client]
            );

            let result;
            if (existing.rows.length > 0) {
                // UPDATE
                result = await client.query(
                    `UPDATE api_credentials 
                     SET api_token_encrypted = $1, 
                         refresh_token_encrypted = $2,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE id = $3
                     RETURNING id, dns_client`,
                    [encryptedApiToken, encryptedRefreshToken, existing.rows[0].id]
                );
            } else {
                // INSERT
                result = await client.query(
                    `INSERT INTO api_credentials 
                     (tenant_id, company_id, dns_client, api_token_encrypted, 
                      refresh_token_encrypted, is_primary)
                     VALUES ($1, $2, $3, $4, $5, true)
                     RETURNING id, dns_client`,
                    [tenantId, companyId, dns_client, encryptedApiToken, encryptedRefreshToken]
                );
            }

            // Audit
            await client.query(
                `INSERT INTO audit_logs 
                 (tenant_id, entity_type, entity_id, operation, 
                  actor_type, actor_name, severity)
                 VALUES ($1, 'api_credentials', $2, 'UPSERT', 'system', 'CredentialsManager', 'WARNING')`,
                [tenantId, result.rows[0].id]
            );

            await client.query('COMMIT');
            return result.rows[0];
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Save credentials error:', { error, tenantId, companyId });
            throw error;
        } finally {
            client.release();
        }
    }

    // Obtener y desencriptar credenciales
    async getCredentials(tenantId, companyId, dns_client) {
        const result = await pool.query(
            `SELECT id, dns_client, api_token_encrypted, refresh_token_encrypted,
                    access_token_expires_at, refresh_token_expires_at
             FROM api_credentials
             WHERE tenant_id = $1 AND company_id = $2 AND dns_client = $3 AND is_active = true`,
            [tenantId, companyId, dns_client]
        );

        if (result.rows.length === 0) {
            throw new Error('Credentials not found');
        }

        const cred = result.rows[0];
        return {
            id: cred.id,
            dns_client: cred.dns_client,
            api_token: this.decryptToken(cred.api_token_encrypted),
            refresh_token: cred.refresh_token_encrypted 
                ? this.decryptToken(cred.refresh_token_encrypted)
                : null,
            access_token_expires_at: cred.access_token_expires_at,
            refresh_token_expires_at: cred.refresh_token_expires_at
        };
    }

    // Verificar si token está expirado
    async isTokenExpired(credentialId) {
        const result = await pool.query(
            `SELECT access_token_expires_at FROM api_credentials WHERE id = $1`,
            [credentialId]
        );

        if (result.rows.length === 0) return true;

        const expiresAt = new Date(result.rows[0].access_token_expires_at);
        return expiresAt < new Date();
    }

    // Refrescar token automáticamente
    async refreshAccessToken(tenantId, companyId, dns_client, evo5Service) {
        const cred = await this.getCredentials(tenantId, companyId, dns_client);
        
        try {
            const newToken = await evo5Service.refreshToken(cred.refresh_token);
            
            const encryptedNewToken = this.encryptToken(newToken.access_token);
            
            await pool.query(
                `UPDATE api_credentials 
                 SET api_token_encrypted = $1, 
                     access_token_expires_at = $2,
                     last_refreshed_at = CURRENT_TIMESTAMP,
                     refresh_attempts = 0,
                     updated_at = CURRENT_TIMESTAMP
                 WHERE id = $3`,
                [encryptedNewToken, newToken.expires_in, cred.id]
            );

            return this.decryptToken(encryptedNewToken);
        } catch (error) {
            const attempts = await pool.query(
                `UPDATE api_credentials 
                 SET refresh_attempts = refresh_attempts + 1,
                     last_refresh_error = $1
                 WHERE id = $2
                 RETURNING refresh_attempts`,
                [error.message, cred.id]
            );

            if (attempts.rows[0].refresh_attempts >= 3) {
                await pool.query(
                    `UPDATE api_credentials SET is_active = false WHERE id = $1`,
                    [cred.id]
                );
                // Alertar admin
                logger.warn('Credentials disabled after 3 refresh failures', { cred });
            }

            throw error;
        }
    }
}

module.exports = new CredentialsManager();
```

---

## 7. SINCRONIZACIÓN INTELIGENTE

### 7.1 UPSERT Logic (Create or Update)

```javascript
// backend-data-intake/src/services/MembersService.js

const pool = require('../db/postgres');
const crypto = require('crypto');
const logger = require('../utils/logger');

class MembersService {
    // Generar idempotency key para evitar duplicados
    generateIdempotencyKey(email, tenantId, operation) {
        const key = `${email}:${tenantId}:${operation}:${Date.now()}`;
        return crypto.createHash('sha256').update(key).digest('hex');
    }

    // UPSERT member (crear o actualizar)
    async upsertMember(tenantId, companyId, memberData) {
        const client = await pool.connect();
        
        try {
            await client.query('BEGIN ISOLATION LEVEL SERIALIZABLE');

            // 1. Generar idempotency key
            const idempotencyKey = this.generateIdempotencyKey(
                memberData.email, 
                tenantId, 
                'upsert'
            );

            // 2. Verificar si ya se procesó (deduplicación)
            const existingSync = await client.query(
                `SELECT id, status FROM sync_queue 
                 WHERE idempotency_key = $1`,
                [idempotencyKey]
            );

            if (existingSync.rows.length > 0) {
                const sync = existingSync.rows[0];
                if (sync.status === 'synced') {
                    logger.info('Duplicate operation detected (already synced)', { idempotencyKey });
                    return { status: 'duplicate', syncId: sync.id };
                }
                if (sync.status === 'processing') {
                    logger.info('Operation already in progress', { idempotencyKey });
                    return { status: 'processing', syncId: sync.id };
                }
            }

            // 3. UPSERT en members
            // ON CONFLICT: si evo_member_id existe, actualizar; si no, crear
            const memberResult = await client.query(
                `INSERT INTO members 
                 (tenant_id, company_id, evo_member_id, first_name, last_name, 
                  email, phone, document_number, status, local_version)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', 1)
                 ON CONFLICT (tenant_id, company_id, evo_member_id) DO UPDATE SET
                    first_name = EXCLUDED.first_name,
                    last_name = EXCLUDED.last_name,
                    email = EXCLUDED.email,
                    phone = EXCLUDED.phone,
                    document_number = EXCLUDED.document_number,
                    local_version = local_version + 1,
                    updated_at = CURRENT_TIMESTAMP
                 RETURNING id, evo_member_id`,
                [
                    tenantId, companyId, memberData.evo_member_id || crypto.randomUUID(),
                    memberData.first_name, memberData.last_name,
                    memberData.email, memberData.phone, memberData.document_number
                ]
            );

            const memberId = memberResult.rows[0].id;

            // 4. Crear entrada en sync_queue
            const syncResult = await client.query(
                `INSERT INTO sync_queue 
                 (tenant_id, company_id, entity_type, entity_id, evo_entity_id,
                  operation, direction, idempotency_key, payload, status,
                  priority, scheduled_at)
                 VALUES ($1, $2, 'member', $3, $4, 'UPSERT', 'outbound',
                         $5, $6, 'pending', 5, CURRENT_TIMESTAMP)
                 RETURNING id`,
                [
                    tenantId, companyId, memberId, memberData.evo_member_id || null,
                    idempotencyKey, JSON.stringify(memberData)
                ]
            );

            const syncId = syncResult.rows[0].id;

            // 5. Audit log
            await client.query(
                `INSERT INTO audit_logs 
                 (tenant_id, entity_type, entity_id, operation, 
                  actor_type, actor_name, changes_to, severity)
                 VALUES ($1, 'member', $2, 'CREATE', 'api', 'MembersService', $3, 'INFO')`,
                [tenantId, memberId, JSON.stringify(memberData)]
            );

            await client.query('COMMIT');

            logger.info('Member upserted successfully', { memberId, syncId });
            return { memberId, syncId, status: 'pending' };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('UPSERT member error:', { error, tenantId });
            throw error;
        } finally {
            client.release();
        }
    }

    // Detectar conflictos (cambios simultáneos)
    async detectConflict(tenantId, memberId, receivedVersion, remoteVersion) {
        // Si local_version > receivedVersion, hay cambios locales no sincronizados
        // Si remoteVersion > local_version, hay cambios remotos no sincronizados

        const result = await pool.query(
            `SELECT local_version, evo5_version FROM members 
             WHERE id = $1 AND tenant_id = $2`,
            [memberId, tenantId]
        );

        if (result.rows.length === 0) return null;

        const { local_version, evo5_version } = result.rows[0];

        if (local_version > receivedVersion && remoteVersion > evo5_version) {
            return {
                hasConflict: true,
                localVersion: local_version,
                remoteVersion: remoteVersion,
                strategy: 'MERGE_REQUIRED' // requiere intervención
            };
        }

        return { hasConflict: false };
    }

    // Resolver conflictos
    async resolveConflict(tenantId, memberId, resolutionStrategy) {
        // STRATEGIES:
        // - LOCAL_WINS: mantener datos locales
        // - REMOTE_WINS: sobrescribir con datos remotos
        // - MERGE: combinar datos (tomar lo más reciente de cada campo)

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const member = await client.query(
                `SELECT * FROM members WHERE id = $1 AND tenant_id = $2`,
                [memberId, tenantId]
            );

            if (member.rows.length === 0) {
                throw new Error('Member not found');
            }

            const m = member.rows[0];

            if (resolutionStrategy === 'LOCAL_WINS') {
                // Marcar para re-sincronizar con EVO5
                await client.query(
                    `UPDATE sync_queue 
                     SET status = 'pending', sync_attempt = 0 
                     WHERE entity_id = $1 AND entity_type = 'member' 
                     AND status IN ('failed', 'synced')`,
                    [memberId]
                );
            } else if (resolutionStrategy === 'REMOTE_WINS') {
                // Descartar cambios locales
                await client.query(
                    `DELETE FROM sync_queue 
                     WHERE entity_id = $1 AND entity_type = 'member' 
                     AND status = 'pending'`,
                    [memberId]
                );
            } else if (resolutionStrategy === 'MERGE') {
                // MERGE: combinar campos
                // Lógica específica según negocio
                logger.info('Merging conflicted data', { memberId });
            }

            await client.query('COMMIT');
            logger.info('Conflict resolved', { memberId, resolutionStrategy });
            
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Conflict resolution error:', { error });
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new MembersService();
```

### 7.2 Delta Sync (Solo cambios)

```javascript
// backend-data-intake/src/services/DeltaSyncService.js

const pool = require('../db/postgres');
const logger = require('../utils/logger');

class DeltaSyncService {
    // Sincronizar solo lo que cambió desde el último sync
    async deltaSync(tenantId, companyId, dns_client, entityType) {
        // 1. Obtener último offset
        const offsetResult = await pool.query(
            `SELECT last_sync_offset, last_synced_at FROM sync_offsets
             WHERE tenant_id = $1 AND company_id = $2 
             AND entity_type = $3 AND direction = 'inbound'`,
            [tenantId, companyId, entityType]
        );

        const lastOffset = offsetResult.rows.length > 0 
            ? offsetResult.rows[0].last_sync_offset 
            : 0;

        const lastSyncedAt = offsetResult.rows.length > 0
            ? offsetResult.rows[0].last_synced_at
            : new Date(0);

        logger.info(`Delta sync from offset ${lastOffset}`, { tenantId, entityType });

        // 2. Llamar a EVO5 con offset
        const evo5Service = require('./Evo5Service');
        const credentials = await require('./CredentialsManager')
            .getCredentials(tenantId, companyId, dns_client);

        let changedData;
        try {
            changedData = await evo5Service.fetchChangedEntities(
                credentials,
                entityType,
                { offset: lastOffset, since: lastSyncedAt }
            );
        } catch (error) {
            if (error.code === 'UNAUTHORIZED') {
                // Token expirado, refrescar
                await require('./CredentialsManager')
                    .refreshAccessToken(tenantId, companyId, dns_client, evo5Service);
                changedData = await evo5Service.fetchChangedEntities(
                    credentials,
                    entityType,
                    { offset: lastOffset, since: lastSyncedAt }
                );
            } else {
                throw error;
            }
        }

        // 3. Procesar cambios
        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            for (const item of changedData.items) {
                // Crear entrada en sync_queue (inbound)
                await client.query(
                    `INSERT INTO sync_queue 
                     (tenant_id, company_id, entity_type, entity_id, evo_entity_id,
                      operation, direction, idempotency_key, payload, status)
                     VALUES ($1, $2, $3, $4, $5, $6, 'inbound', $7, $8, 'pending')
                     ON CONFLICT (idempotency_key) DO NOTHING`,
                    [
                        tenantId, companyId, entityType, item.id, item.id,
                        item.operation || 'UPSERT',
                        `${entityType}:${item.id}:${item.updated_at}`,
                        JSON.stringify(item)
                    ]
                );
            }

            // 4. Actualizar offset
            const newOffset = changedData.nextOffset || (lastOffset + changedData.items.length);
            
            if (offsetResult.rows.length > 0) {
                await client.query(
                    `UPDATE sync_offsets 
                     SET last_sync_offset = $1, 
                         last_synced_at = CURRENT_TIMESTAMP,
                         total_synced = total_synced + $2
                     WHERE tenant_id = $3 AND company_id = $4 AND entity_type = $5`,
                    [newOffset, changedData.items.length, tenantId, companyId, entityType]
                );
            } else {
                await client.query(
                    `INSERT INTO sync_offsets 
                     (tenant_id, company_id, entity_type, direction,
                      last_sync_offset, last_synced_at, total_synced)
                     VALUES ($1, $2, $3, 'inbound', $4, CURRENT_TIMESTAMP, $5)`,
                    [tenantId, companyId, entityType, newOffset, changedData.items.length]
                );
            }

            await client.query('COMMIT');

            logger.info('Delta sync completed', { 
                tenantId, 
                entityType, 
                items: changedData.items.length,
                newOffset 
            });

            return { 
                synced: changedData.items.length,
                newOffset,
                hasMore: changedData.hasMore 
            };

        } catch (error) {
            await client.query('ROLLBACK');
            logger.error('Delta sync error:', { error, tenantId, entityType });
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new DeltaSyncService();
```

---

## 8. ESTRUCTURA DEL PROYECTO

```
backend-data-intake/
├── src/
│   ├── middleware/
│   │   ├── auth.js                 # Validar credenciales
│   │   ├── errorHandler.js         # Manejo centralizado errores
│   │   ├── requestLogger.js        # Logs de requests
│   │   ├── rateLimit.js            # Rate limiting
│   │   └── tenantResolver.js       # Resolver tenant desde header
│   │
│   ├── routes/
│   │   ├── members.js              # GET/POST /members
│   │   ├── plans.js                # GET/POST /plans
│   │   ├── memberships.js          # GET/POST /memberships
│   │   ├── sync.js                 # GET/POST /sync (queue status)
│   │   ├── credentials.js          # POST /credentials (guardar EVO5 creds)
│   │   ├── health.js               # GET /health
│   │   └── webhooks.js             # POST /webhooks/evo5 (EVO5 notificaciones)
│   │
│   ├── controllers/
│   │   ├── MembersController.js
│   │   ├── PlansController.js
│   │   ├── MembershipsController.js
│   │   ├── SyncController.js
│   │   └── HealthController.js
│   │
│   ├── services/
│   │   ├── MembersService.js       # UPSERT, detectar conflictos
│   │   ├── PlansService.js
│   │   ├── MembershipsService.js
│   │   ├── Evo5Service.js          # Cliente HTTP para EVO5 API
│   │   ├── SyncQueueService.js     # Procesar cola
│   │   ├── CredentialsManager.js   # Encriptar/desencriptar tokens
│   │   ├── DeltaSyncService.js     # Sincronización incremental
│   │   ├── CacheManager.js         # Redis cache
│   │   ├── RateLimiter.js          # Throttle requests
│   │   └── NotificationService.js  # Slack, Email alerts
│   │
│   ├── workers/
│   │   ├── SyncQueueWorker.js      # Bull worker (async processing)
│   │   ├── RetryWorker.js          # Reintentos con backoff
│   │   ├── HealthCheckWorker.js    # Verificar salud del sistema
│   │   └── TokenRefreshWorker.js   # Refrescar tokens EVO5 automático
│   │
│   ├── db/
│   │   ├── postgres.js             # Pool conexión PostgreSQL
│   │   ├── migrations/
│   │   │   ├── 001_init_schema.sql
│   │   │   ├── 002_add_indexes.sql
│   │   │   └── 003_add_audit.sql
│   │   └── seeds/
│   │       └── seedData.js         # Datos de prueba
│   │
│   ├── utils/
│   │   ├── logger.js               # Winston (JSON logs)
│   │   ├── validator.js            # Validación de datos
│   │   ├── transformer.js          # Transformar EVO5 → DB
│   │   ├── errorCodes.js           # Códigos de error
│   │   └── constants.js            # Constantes globales
│   │
│   ├── events/
│   │   ├── EventEmitter.js         # Event bus
│   │   ├── SyncEvents.js           # sync:created, sync:completed, etc
│   │   └── listeners/
│   │       ├── onSyncCreated.js
│   │       ├── onSyncCompleted.js
│   │       └── onSyncFailed.js
│   │
│   ├── config/
│   │   ├── app.js                  # Configuración de app
│   │   ├── database.js
│   │   ├── redis.js
│   │   ├── evo5.js
│   │   └── features.js             # Feature flags
│   │
│   ├── monitoring/
│   │   ├── metrics.js              # Prometheus metrics
│   │   ├── tracer.js               # Jaeger/DataDog tracing
│   │   └── healthChecks.js         # Readiness/Liveness probes
│   │
│   ├── server.js                   # Entry point con todos los servicios
│   └── app.js                      # Express app configuración
│
├── tests/
│   ├── unit/
│   │   ├── services/
│   │   ├── workers/
│   │   └── utils/
│   ├── integration/
│   │   ├── members.test.js
│   │   ├── sync.test.js
│   │   └── evo5Integration.test.js
│   └── e2e/
│       └── fullSyncFlow.test.js
│
├── docker/
│   ├── Dockerfile
│   ├── docker-compose.yml
│   └── .dockerignore
│
├── .env.example
├── .env.production
├── .gitignore
├── package.json
├── package-lock.json
└── README.md
```

---

## 9. EJEMPLOS DE CÓDIGO

### 9.1 Bull Queue Worker (Procesar sync_queue)

```javascript
// backend-data-intake/src/workers/SyncQueueWorker.js

const Queue = require('bull');
const pool = require('../db/postgres');
const logger = require('../utils/logger');
const Evo5Service = require('../services/Evo5Service');
const CredentialsManager = require('../services/CredentialsManager');
const CacheManager = require('../services/CacheManager');
const EventEmitter = require('../events/EventEmitter');

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const syncQueue = new Queue('sync-queue', REDIS_URL);

// Configurar workers
syncQueue.process(10, async (job) => {
    const { syncId, tenantId, companyId, dns_client } = job.data;
    
    logger.info('Processing sync job', { syncId, jobId: job.id });

    const client = await pool.connect();
    try {
        // 1. Lockear el record
        const lockResult = await client.query(
            `UPDATE sync_queue 
             SET status = 'processing', 
                 locked_by = $1, 
                 locked_at = CURRENT_TIMESTAMP,
                 processing_started_at = CURRENT_TIMESTAMP
             WHERE id = $2 AND status IN ('pending', 'failed')
             RETURNING *`,
            [process.pid, syncId]
        );

        if (lockResult.rows.length === 0) {
            logger.warn('Sync record locked or processed', { syncId });
            return { skipped: true };
        }

        const sync = lockResult.rows[0];

        // 2. Obtener credenciales
        let credentials = await CredentialsManager.getCredentials(
            tenantId, companyId, dns_client
        );

        // Verificar si token expiró
        if (await CredentialsManager.isTokenExpired(credentials.id)) {
            logger.info('Token expired, refreshing...', { tenantId });
            credentials = await CredentialsManager.refreshAccessToken(
                tenantId, companyId, dns_client, Evo5Service
            );
        }

        // 3. Procesar según tipo de entidad
        let result;
        
        if (sync.direction === 'outbound') {
            result = await processOutbound(sync, credentials, client);
        } else {
            result = await processInbound(sync, credentials, client);
        }

        // 4. Actualizar sync_queue
        await client.query(
            `UPDATE sync_queue 
             SET status = 'synced',
                 evo_entity_id = $1,
                 processing_completed_at = CURRENT_TIMESTAMP,
                 locked_by = NULL
             WHERE id = $2`,
            [result.evo_id, syncId]
        );

        // 5. Invalidar caché
        await CacheManager.invalidateKey(
            `${sync.entity_type}:*`,
            tenantId
        );

        // 6. Emitir evento
        EventEmitter.emit('sync:completed', {
            syncId,
            tenantId,
            entityType: sync.entity_type,
            entityId: sync.entity_id,
            evoId: result.evo_id
        });

        logger.info('Sync job completed successfully', { syncId });
        return { synced: true, evo_id: result.evo_id };

    } catch (error) {
        const sync = await client.query(
            `SELECT * FROM sync_queue WHERE id = $1`,
            [syncId]
        );

        const currentAttempt = sync.rows[0].sync_attempt + 1;
        const maxAttempts = sync.rows[0].max_retry_attempts;

        if (currentAttempt >= maxAttempts) {
            // Mover a deadletter
            await client.query(
                `INSERT INTO sync_deadletter 
                 (tenant_id, original_sync_id, entity_type, entity_id,
                  operation, payload, failure_reason, failure_code)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    tenantId, syncId,
                    sync.rows[0].entity_type, sync.rows[0].entity_id,
                    sync.rows[0].operation, sync.rows[0].payload,
                    error.message, error.code || 'UNKNOWN'
                ]
            );

            await client.query(
                `UPDATE sync_queue SET status = 'deadletter', locked_by = NULL WHERE id = $1`,
                [syncId]
            );

            // Alerta
            EventEmitter.emit('sync:deadletter', {
                syncId, tenantId, error: error.message
            });

            logger.error('Sync job moved to deadletter', { syncId, error: error.message });
            throw error;
        } else {
            // Reintentar
            const backoffMs = Math.pow(2, currentAttempt) * 1000; // exponential backoff
            const nextRetryAt = new Date(Date.now() + backoffMs);

            await client.query(
                `UPDATE sync_queue 
                 SET status = 'failed',
                     sync_attempt = $1,
                     last_error = $2,
                     last_error_code = $3,
                     next_retry_at = $4,
                     locked_by = NULL
                 WHERE id = $5`,
                [currentAttempt, error.message, error.code || 'UNKNOWN', nextRetryAt, syncId]
            );

            logger.warn('Sync job failed, will retry', { 
                syncId, 
                attempt: currentAttempt,
                nextRetryAt,
                error: error.message 
            });

            // Re-queue con delay
            await syncQueue.add(
                { syncId, tenantId, companyId, dns_client },
                { delay: backoffMs, attemptsMade: currentAttempt }
            );

            throw error;
        }

    } finally {
        client.release();
    }
});

async function processOutbound(sync, credentials, client) {
    // Enviar a EVO5
    const evo5Service = new Evo5Service(credentials);
    
    let response;
    
    if (sync.operation === 'DELETE') {
        response = await evo5Service.request('DELETE', `/${sync.entity_type}/${sync.evo_entity_id}`);
    } else if (sync.operation === 'CREATE') {
        response = await evo5Service.request('POST', `/${sync.entity_type}`, sync.payload);
    } else if (sync.operation === 'UPDATE') {
        response = await evo5Service.request('PUT', `/${sync.entity_type}/${sync.evo_entity_id}`, sync.payload);
    } else if (sync.operation === 'UPSERT') {
        try {
            response = await evo5Service.request('PUT', `/${sync.entity_type}/${sync.evo_entity_id}`, sync.payload);
        } catch (error) {
            if (error.code === 'NOT_FOUND') {
                response = await evo5Service.request('POST', `/${sync.entity_type}`, sync.payload);
            } else {
                throw error;
            }
        }
    }

    return { evo_id: response.id || sync.evo_entity_id };
}

async function processInbound(sync, credentials, client) {
    // Procesar cambios de EVO5
    const data = sync.payload;
    
    // UPSERT en la base de datos correspondiente
    if (sync.entity_type === 'member') {
        return await processMemberInbound(data, client);
    } else if (sync.entity_type === 'plan') {
        return await processPlanInbound(data, client);
    }
}

async function processMemberInbound(data, client) {
    const result = await client.query(
        `INSERT INTO members (tenant_id, company_id, evo_member_id, first_name, last_name, email)
         VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (tenant_id, company_id, evo_member_id) DO UPDATE SET
             first_name = EXCLUDED.first_name,
             last_name = EXCLUDED.last_name,
             evo5_version = evo5_version + 1,
             last_synced_at = CURRENT_TIMESTAMP
         RETURNING id`,
        [data.tenant_id, data.company_id, data.evo_member_id, data.first_name, data.last_name, data.email]
    );
    
    return { evo_id: data.evo_member_id };
}

module.exports = syncQueue;
```

---

Documento continúa en la siguiente parte...
