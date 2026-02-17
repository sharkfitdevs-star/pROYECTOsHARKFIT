# 🏗️ EVO5 INTEGRATION MIDDLEWARE - ARQUITECTURA COMPLETA

**Fecha:** February 11, 2024  
**Status:** 🟢 Blueprint de Producción  
**Versión:** 5.0 (Arquitectura de Capas)

**Nota 2026:** Referencias a SQLite son históricas; la ingestión y microservicios usan MongoDB.

---

## 📋 ÍNDICE

1. [Análisis de Arquitectura](#análisis-de-arquitectura)
2. [Problemas Detectados](#problemas-detectados)
3. [Solución Propuesta](#solución-propuesta)
4. [Esquema PostgreSQL](#esquema-postgresql)
5. [Diagrama de Flujos](#diagrama-de-flujos)
6. [Seguridad de Tokens](#seguridad-de-tokens)
7. [Sincronización Inteligente](#sincronización-inteligente)
8. [Estructura del Proyecto](#estructura-del-proyecto)
9. [Ejemplos de Código](#ejemplos-de-código)
10. [Observabilidad & Monitoring](#observabilidad--monitoring)
11. [Riesgos & Mitigación](#riesgos--mitigación)
12. [Plan de Deploy](#plan-de-deploy)

---

## 1. ANÁLISIS DE ARQUITECTURA

### Visión General

```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React)                        │
│              http://localhost:5173                          │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP REST + WebSocket
                           ↓
┌─────────────────────────────────────────────────────────────┐
│         STAGE 4: API Gateway (Express.js 4️⃣)               │
│              http://localhost:3001                          │
│  ┌─────────────────────────────────────────────────────────┤
│  │ • POST /login (EVO5 credentials → sessionToken)         │
│  │ • GET /api/snapshot (read from Redis cache)            │
│  │ • POST /api/sync (trigger middleware)                  │
│  │ • GET /health                                          │
│  │ • WebSocket: evo:snapshot, sync:* events             │
│  └─────────────────────────────────────────────────────────┤
└──────────────────────────┬──────────────────────────────────┘
                           │ REST API + Events
                           ↓
┌─────────────────────────────────────────────────────────────┐
│    EVO5 INTEGRATION MIDDLEWARE (Node.js 🔄)               │
│              http://localhost:3002                          │
│  ┌─────────────────────────────────────────────────────────┤
│  │ • Service: SyncService                                 │
│  │ • Service: CredentialsManager                          │
│  │ • Service: QueueProcessor                              │
│  │ • Service: CacheManager                                │
│  │ • Workers: BullQueue async processing                  │
│  └─────────────────────────────────────────────────────────┤
└──────────────────────────┬──────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        ↓                  ↓                  ↓
   PostgreSQL          Redis               EVO5 API
   (Persistent)        (Cache)         (External)
   Multi-tenant        Real-time        Basic Auth
```

### Responsabilidades

| Layer | Puerto | Responsabilidad |
|-------|--------|-----------------|
| **Frontend** | 5173 | UI, Visualización, Interacción usuario |
| **Stage 4** | 3001 | HTTP API Gateway, WebSocket, Cache, Orquestación |
| **Middleware** | 3002 | Sincronización robusta, BD, Eventos, Procesos async |
| **PostgreSQL** | 5432 | Fuente de verdad, Multi-tenant, Auditoría |
| **Redis** | 6379 | Cache primario, Sesiones, Queue (Bull) |
| **EVO5** | HTTPS | API externa, Fuente de datos primaria |

---

## 2. PROBLEMAS DETECTADOS

### En el Esquema Original

```sql
-- PROBLEMA 1: Sin multi-tenant
api_credentials:
  id, dns_client, api_token, refresh_token, is_active
  -- ❌ ¿Qué pasa si un usuario accede a datos de otro tenant?
  -- ❌ Sin tenant_id, sin company_id

-- PROBLEMA 2: Sin auditoría
members:
  -- ❌ ¿Quién modificó esto? ¿Cuándo? ¿Por qué?
  -- ❌ Sin created_by, updated_by, changelog

-- PROBLEMA 3: Sin idempotencia
sync_queue:
  -- ❌ ¿Qué pasa si se procesa 2 veces?
  -- ❌ Sin idempotency_key

-- PROBLEMA 4: Sin versionamiento
-- ❌ ¿Cómo sincronizar cambios bidireccionales?
-- ❌ Necesitamos conflict resolution

-- PROBLEMA 5: Sin rate limiting
-- ❌ ¿Cómo controlar requests a EVO5?
-- ❌ Sin rate_limit_tracker

-- PROBLEMA 6: Sin manejo token expiración
-- ❌ Tokens sin TTL
-- ❌ Sin refresh automático
```

### Problemas de Seguridad

- ❌ Tokens plaintext en BD
- ❌ Sin encriptación en tránsito
- ❌ Sin secrets manager
- ❌ Sin audit trail de accesos

### Problemas de Confiabilidad

- ❌ Sin reintentos configurables
- ❌ Sin dead letter queue
- ❌ Sin control de concurrencia
- ❌ Sin handling de fallas de red

### Problemas de Escalabilidad

- ❌ Sin índices optimizados
- ❌ Sin particionamiento
- ❌ Sin sharding para multi-tenant
- ❌ Sin caché inteligente

---

## 3. SOLUCIÓN PROPUESTA

### Principios Arquitectónicos

```
1️⃣ MULTI-TENANT
   └─ Cada gimnasio (tenant) tiene BD compartida pero aislada

2️⃣ EVENT-DRIVEN
   └─ Cambios generan eventos en sync_queue
   └─ Workers procesan async

3️⃣ IDEMPOTENCIA
   └─ Mismo evento → mismo resultado
   └─ Deduplicación por idempotency_key

4️⃣ EVENTUAL CONSISTENCY
   └─ PostgreSQL es fuente de verdad
   └─ EVO5 se sincroniza eventualmente

5️⃣ CACHING INTELIGENTE
   └─ Redis para caché primario (TTL configurable)
   └─ PostgreSQL para persistencia

6️⃣ SECURITY BY DEFAULT
   └─ Tokens encriptados
   └─ Secrets manager
   └─ Audit trail completo

7️⃣ OBSERVABLE
   └─ Logs estructurados (JSON)
   └─ Métricas Prometheus
   └─ Tracing distribuido
```

### Flujo de Sincronización

```
Cambio en Frontend
    ↓
POST /api/members (Stage 4)
    ↓
POST /members (Middleware)
    ↓
Validar + Encriptar + Generar Uuid
    ↓
INSERT postgres (members table)
    ↓
INSERT postgres (sync_queue)
    ↓
EMIT event (sync:created)
    ↓
PUSH a Bull Queue
    ↓
Worker async
    ├─ READ sync_queue
    ├─ POST a EVO5 API
    ├─ Esperar respuesta
    ├─ UPDATE sync_queue (status=synced)
    └─ EMIT event (sync:completed)
    ↓
Stage 4 WebSocket
    ├─ Recibe evento
    ├─ Actualiza Redis
    └─ EMIT a Frontend (refresh)
    ↓
Frontend actualiza UI
```

---

## 4. ESQUEMA POSTGRESQL

### Estructura General

```
SCHEMA: public

TABLES:
├─ tenants                (multi-tenant segregation)
├─ companies              (gimnasios dentro de tenant)
├─ api_credentials        (EVO5 auth)
├─ members                (miembros del gimnasio)
├─ plans                  (planes de membresía)
├─ memberships            (membresías activas)
├─ sync_queue             (event-driven queue)
├─ sync_deadletter        (fallos permanentes)
├─ audit_logs             (trazabilidad)
├─ rate_limits            (throttling EVO5)
├─ cache_invalidation     (cache busting)
└─ sync_offsets           (delta sync markers)

INDEXES:
├─ tenant_id en todas las tablas
├─ evo_id (deduplicación)
├─ sync_status (procesamiento)
├─ created_at (timeserries)
└─ composite indexes para queries comunes
```

### SQL Completo

```sql
-- ==========================================
-- 1. TABLAS BASE - MULTI-TENANT
-- ==========================================

CREATE SCHEMA IF NOT EXISTS sharkfit;
SET search_path TO sharkfit;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "hstore";

-- TABLA: tenants
CREATE TABLE IF NOT EXISTS tenants (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    country VARCHAR(50) DEFAULT 'CL',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_active ON tenants(is_active);

-- TABLA: companies (gimnasios dentro de tenant)
CREATE TABLE IF NOT EXISTS companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    city VARCHAR(100),
    region VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    logo_url TEXT,
    metadata JSONB DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(tenant_id, name)
);

CREATE INDEX idx_companies_tenant ON companies(tenant_id);
CREATE INDEX idx_companies_active ON companies(is_active);


-- ==========================================
-- 2. AUTENTICACIÓN EVO5
-- ==========================================

-- TABLA: api_credentials
CREATE TABLE IF NOT EXISTS api_credentials (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Credenciales EVO5 ENCRIPTADAS
    dns_client VARCHAR(255) NOT NULL,
    api_token_encrypted BYTEA NOT NULL, -- encriptado con PGCRYPTO
    refresh_token_encrypted BYTEA,
    
    -- Metadata
    evo_account_id VARCHAR(255),
    
    -- Expiración y estado
    access_token_expires_at TIMESTAMP WITH TIME ZONE,
    refresh_token_expires_at TIMESTAMP WITH TIME ZONE,
    last_refreshed_at TIMESTAMP WITH TIME ZONE,
    refresh_attempts INT DEFAULT 0,
    last_refresh_error TEXT,
    
    -- Control
    is_active BOOLEAN DEFAULT true,
    is_primary BOOLEAN DEFAULT false, -- credencial principal
    environment VARCHAR(20) DEFAULT 'production', -- production|staging|development
    
    -- Auditoría
    created_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, company_id, dns_client)
);

CREATE INDEX idx_credentials_tenant ON api_credentials(tenant_id);
CREATE INDEX idx_credentials_company ON api_credentials(company_id);
CREATE INDEX idx_credentials_active ON api_credentials(is_active);
CREATE INDEX idx_credentials_expiry ON api_credentials(access_token_expires_at);


-- ==========================================
-- 3. DATOS SINCRONIZADOS
-- ==========================================

-- TABLA: members (UPSERT point)
CREATE TABLE IF NOT EXISTS members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- EVO5 ID (deduplicación)
    evo_member_id VARCHAR(255) NOT NULL,
    
    -- Personal info
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(20),
    document_type VARCHAR(10), -- CPF, CNPJ, RUT
    document_number VARCHAR(20),
    
    -- Contacto
    address TEXT,
    city VARCHAR(100),
    state VARCHAR(50),
    zip_code VARCHAR(20),
    country VARCHAR(50),
    
    -- Metadata
    photo_url TEXT,
    birth_date DATE,
    gender CHAR(1),
    marital_status VARCHAR(20),
    
    -- Estado
    status VARCHAR(50) DEFAULT 'active', -- active|inactive|suspended|cancelled
    activation_date DATE,
    
    -- Sincronización
    last_synced_at TIMESTAMP WITH TIME ZONE,
    last_synced_from VARCHAR(10) DEFAULT 'evo5', -- evo5|local|both
    local_version INT DEFAULT 0,
    evo5_version INT DEFAULT 0,
    
    -- Auditoría
    created_by UUID,
    updated_by UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP WITH TIME ZONE, -- soft delete
    
    UNIQUE(tenant_id, company_id, evo_member_id),
    UNIQUE(tenant_id, email) -- email único por tenant
);

CREATE INDEX idx_members_tenant ON members(tenant_id);
CREATE INDEX idx_members_company ON members(company_id);
CREATE INDEX idx_members_evo_id ON members(evo_member_id);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_status ON members(status);
CREATE INDEX idx_members_synced ON members(last_synced_at);
CREATE INDEX idx_members_deleted ON members(deleted_at) WHERE deleted_at IS NULL;


-- TABLA: plans
CREATE TABLE IF NOT EXISTS plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    evo_plan_id VARCHAR(255) NOT NULL,
    
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'CLP',
    duration_months INT NOT NULL,
    
    -- Características
    sessions_per_week INT,
    features JSONB DEFAULT '[]',
    
    -- Estado
    is_active BOOLEAN DEFAULT true,
    
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, company_id, evo_plan_id)
);

CREATE INDEX idx_plans_tenant ON plans(tenant_id);
CREATE INDEX idx_plans_company ON plans(company_id);
CREATE INDEX idx_plans_active ON plans(is_active);


-- TABLA: memberships
CREATE TABLE IF NOT EXISTS memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    member_id UUID NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    plan_id UUID NOT NULL REFERENCES plans(id) ON DELETE RESTRICT,
    
    evo_membership_id VARCHAR(255),
    
    start_date DATE NOT NULL,
    end_date DATE,
    renewal_date DATE,
    
    status VARCHAR(50) DEFAULT 'active', -- active|paused|cancelled|expired
    
    -- Pagos
    payment_method VARCHAR(50),
    last_payment_date DATE,
    next_payment_date DATE,
    payment_status VARCHAR(50), -- pending|paid|overdue|failed
    
    -- Sincronización
    last_synced_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, company_id, evo_membership_id)
);

CREATE INDEX idx_memberships_tenant ON memberships(tenant_id);
CREATE INDEX idx_memberships_member ON memberships(member_id);
CREATE INDEX idx_memberships_status ON memberships(status);
CREATE INDEX idx_memberships_dates ON memberships(start_date, end_date);


-- ==========================================
-- 4. SINCRONIZACIÓN EVENT-DRIVEN
-- ==========================================

-- TABLA: sync_queue (CORAZÓN del sistema)
CREATE TABLE IF NOT EXISTS sync_queue (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Identificación
    entity_type VARCHAR(50) NOT NULL, -- member|plan|membership|contact
    entity_id VARCHAR(255) NOT NULL, -- UUID o ID de la entidad local
    evo_entity_id VARCHAR(255),
    
    -- Operación
    operation VARCHAR(10) NOT NULL, -- CREATE|UPDATE|DELETE|UPSERT
    direction VARCHAR(10) NOT NULL, -- outbound (BD→EVO5) | inbound (EVO5→BD)
    
    -- Deduplicación (idempotencia)
    idempotency_key VARCHAR(500) UNIQUE NOT NULL,
    
    -- Payload (datos a sincronizar)
    payload JSONB NOT NULL,
    previous_payload JSONB, -- para trackear cambios
    
    -- Estado del procesamiento
    status VARCHAR(50) DEFAULT 'pending', 
    -- pending | processing | synced | failed | deadletter
    
    sync_attempt INT DEFAULT 0,
    max_retry_attempts INT DEFAULT 3,
    last_error TEXT,
    last_error_code VARCHAR(50),
    
    -- Timing
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    scheduled_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    processing_started_at TIMESTAMP WITH TIME ZONE,
    processing_completed_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Control concurrencia
    locked_by UUID, -- process ID que lo está procesando
    locked_at TIMESTAMP WITH TIME ZONE,
    lock_version INT DEFAULT 0,
    
    -- Metadata
    priority INT DEFAULT 5, -- 1-10, 10=highest
    tags JSONB DEFAULT '[]', -- para tagging/filtering
    
    CHECK (status IN ('pending', 'processing', 'synced', 'failed', 'deadletter')),
    CHECK (operation IN ('CREATE', 'UPDATE', 'DELETE', 'UPSERT')),
    CHECK (direction IN ('outbound', 'inbound'))
);

CREATE INDEX idx_sync_queue_tenant ON sync_queue(tenant_id);
CREATE INDEX idx_sync_queue_status ON sync_queue(status);
CREATE INDEX idx_sync_queue_scheduled ON sync_queue(status, scheduled_at) 
    WHERE status IN ('pending', 'failed');
CREATE INDEX idx_sync_queue_locked ON sync_queue(locked_by) 
    WHERE locked_by IS NOT NULL;
CREATE INDEX idx_sync_queue_idempotency ON sync_queue(idempotency_key);
CREATE INDEX idx_sync_queue_priority ON sync_queue(priority DESC, created_at ASC) 
    WHERE status = 'pending';
CREATE INDEX idx_sync_queue_entity ON sync_queue(tenant_id, entity_type, entity_id);


-- TABLA: sync_deadletter (fallos permanentes)
CREATE TABLE IF NOT EXISTS sync_deadletter (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    original_sync_id UUID REFERENCES sync_queue(id) ON DELETE SET NULL,
    
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    evo_entity_id VARCHAR(255),
    
    operation VARCHAR(10) NOT NULL,
    payload JSONB NOT NULL,
    
    failure_reason TEXT NOT NULL,
    failure_code VARCHAR(50),
    final_error_log TEXT,
    
    -- Resolución manual
    resolution_status VARCHAR(50) DEFAULT 'pending', -- pending|manual_fix|ignored|dismissed
    resolved_by UUID,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolution_notes TEXT,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_deadletter_tenant ON sync_deadletter(tenant_id);
CREATE INDEX idx_deadletter_status ON sync_deadletter(resolution_status);


-- ==========================================
-- 5. AUDITORÍA Y TRAZABILIDAD
-- ==========================================

-- TABLA: audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Quién (usuario, sistema, etc)
    actor_id UUID, -- usuario que hizo el cambio
    actor_type VARCHAR(50), -- user|system|api|scheduler
    actor_name VARCHAR(255),
    
    -- Qué (entidad y operación)
    entity_type VARCHAR(50) NOT NULL,
    entity_id VARCHAR(255) NOT NULL,
    operation VARCHAR(20) NOT NULL, -- CREATE|READ|UPDATE|DELETE
    
    -- Cómo (cambios específicos)
    changes_from JSONB,
    changes_to JSONB,
    change_summary TEXT,
    
    -- Cuándo y dónde
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    
    -- Contexto
    context JSONB DEFAULT '{}',
    metadata JSONB DEFAULT '{}',
    
    -- Severidad
    severity VARCHAR(10) DEFAULT 'INFO', -- INFO|WARNING|CRITICAL
    
    CHECK (severity IN ('INFO', 'WARNING', 'CRITICAL'))
);

CREATE INDEX idx_audit_tenant ON audit_logs(tenant_id);
CREATE INDEX idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_created ON audit_logs(created_at);
CREATE INDEX idx_audit_operations ON audit_logs(operation) WHERE severity IN ('WARNING', 'CRITICAL');


-- ==========================================
-- 6. RATE LIMITING Y THROTTLING
-- ==========================================

-- TABLA: rate_limits
CREATE TABLE IF NOT EXISTS rate_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Identifier
    resource_name VARCHAR(100) NOT NULL, -- /api/members, /api/plans
    client_identifier VARCHAR(255) NOT NULL, -- IP, API key, etc
    
    -- Conteo
    requests_current INT DEFAULT 0,
    requests_limit INT NOT NULL,
    window_size_seconds INT NOT NULL, -- ventana de tiempo
    
    -- Timing
    window_start TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_request_at TIMESTAMP WITH TIME ZONE,
    
    -- Estado
    is_blocked BOOLEAN DEFAULT false,
    blocked_until TIMESTAMP WITH TIME ZONE,
    
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, resource_name, client_identifier)
);

CREATE INDEX idx_rate_limits_tenant ON rate_limits(tenant_id);
CREATE INDEX idx_rate_limits_window ON rate_limits(window_start);


-- ==========================================
-- 7. CACHE Y INVALIDACIÓN
-- ==========================================

-- TABLA: cache_invalidation
CREATE TABLE IF NOT EXISTS cache_invalidation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    cache_key VARCHAR(500) NOT NULL,
    entity_type VARCHAR(50),
    entity_id VARCHAR(255),
    
    reason VARCHAR(255),
    triggered_by VARCHAR(50), -- sync|manual|scheduler
    
    invalidated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ttl_seconds INT DEFAULT 300, -- tiempo de invalidación
    
    UNIQUE(tenant_id, cache_key)
);

CREATE INDEX idx_cache_invalidation_tenant ON cache_invalidation(tenant_id);


-- ==========================================
-- 8. OFFSET TRACKING (Delta Sync)
-- ==========================================

-- TABLA: sync_offsets
CREATE TABLE IF NOT EXISTS sync_offsets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    
    -- Qué estamos sincronizando
    entity_type VARCHAR(50) NOT NULL, -- member|plan|membership
    direction VARCHAR(10) NOT NULL, -- inbound|outbound
    
    -- Offset (marca donde quedamos)
    last_sync_offset BIGINT DEFAULT 0,
    last_synced_at TIMESTAMP WITH TIME ZONE,
    total_synced INT DEFAULT 0,
    
    -- Control
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(tenant_id, company_id, entity_type, direction)
);

CREATE INDEX idx_sync_offsets_tenant ON sync_offsets(tenant_id);
```

---

## 5. DIAGRAMA DE FLUJOS

### Flujo 1: Crear Miembro (Frontend → EVO5)

```
┌──────────────────────────────────────────────────────────────┐
│ 1. FRONTEND (React)                                          │
│    User submits form: {name, email, phone}                  │
└──────────────┬───────────────────────────────────────────────┘
               │ POST /api/members
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 2. STAGE 4 (Express API Gateway)                             │
│    POST /api/members                                         │
│    ├─ Validate request                                       │
│    ├─ Call Middleware: POST /members                        │
│    └─ Return 201 Created + ID                               │
└──────────────┬───────────────────────────────────────────────┘
               │ HTTP
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 3. MIDDLEWARE (Service: MembersService)                      │
│    POST /members                                             │
│                                                              │
│    a) Generar UUID para member                              │
│    b) Generar idempotency_key = SHA1(email+tenant+ts)     │
│    c) Validar datos (email format, RUT, etc)               │
│    d) Comenzar transacción PostgreSQL                       │
│       ├─ INSERT members (status=pending)                    │
│       ├─ INSERT sync_queue                                  │
│       │   ├─ entity_type = "member"                         │
│       │   ├─ operation = "CREATE"                           │
│       │   ├─ direction = "outbound"                         │
│       │   ├─ status = "pending"                             │
│       │   └─ payload = { name, email, phone... }          │
│       ├─ INSERT audit_logs                                 │
│       └─ COMMIT                                            │
│    e) EMIT event: sync:created                             │
│    f) PUSH a Bull Queue (priority=5)                       │
│    g) Return 201 + { id, status: "pending" }              │
└──────────────┬───────────────────────────────────────────────┘
               │ WebSocket event
               ├──────────────────────────────────────────────
               ↓                                               │
┌────────────────────────────┐                                │
│ Stage 4: WebSocket                                          │
│ EMIT sync:created          │                                │
│ └─ Actualiza Redis cache   │                                │
└────────────────────────────┘                                │
               │                                               │
               │ (async) Bull Worker                          │
               ↓                                               │
┌──────────────────────────────────────────────────────────────┐
│ 4. BULL WORKER (Async Queue Processor)                       │
│    ├─ Lee sync_queue record                                │
│    ├─ UPDATE sync_queue (status=processing, locked_by=PID) │
│    ├─ Obtener credentials EVO5 (decrypt)                   │
│    ├─ POST a EVO5 API: POST /api/members                   │
│    │   ├─ Enviar payload                                   │
│    │   └─ Esperar respuesta con evo_member_id              │
│    ├─ Si éxito (200-201):                                  │
│    │   ├─ UPDATE members (evo_member_id, status=synced)   │
│    │   ├─ UPDATE sync_queue (status=synced, evo_entity_id) │
│    │   ├─ EMIT sync:completed                              │
│    │   └─ INVALIDAR CACHE: Redis DEL members:*           │
│    └─ Si error:                                             │
│        ├─ sync_attempt += 1                                │
│        ├─ Si sync_attempt >= max_retry_attempts:          │
│        │   ├─ INSERT sync_deadletter                       │
│        │   ├─ UPDATE sync_queue (status=deadletter)       │
│        │   └─ ALERT: Slack/Email                          │
│        └─ Si sync_attempt < max_retry_attempts:          │
│            ├─ UPDATE sync_queue (status=failed)            │
│            ├─ Calculate next_retry_at (exponential backoff) │
│            └─ PUSH again a Bull Queue (retryDelay)        │
└──────────────┬───────────────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 5. EVO5 API                                                  │
│    Responde: { id: "evo123", name, email... }              │
└──────────────┬───────────────────────────────────────────────┘
               │
               ↓
┌──────────────────────────────────────────────────────────────┐
│ 6. FRONTEND (actualización real-time)                        │
│    WebSocket sync:completed                                  │
│    └─ Actualiza UI: status = "synced"                       │
│    └─ Muestra verde ✅ al lado del member                   │
└──────────────────────────────────────────────────────────────┘

Timeline:
========
T+0s    Frontend submits
T+100ms Middleware inserts to DB + Queue (response 201)
T+100ms WebSocket: sync:created (Frontend shows "pending...")
T+500ms Bull Worker picks up job
T+600ms POST EVO5 (waiting...)
T+900ms EVO5 responds with 201
T+950ms Middleware updates DB + Redis
T+950ms WebSocket: sync:completed (Frontend shows ✅)
```

### Flujo 2: Sincronización Bidireccional (EVO5 → Frontend)

```
[EVO5] → [Middleware Webhook Receiver] → [PostgreSQL]
                                              ↓
                                         [sync_queue]
                                              ↓
                                         [Bull Worker]
                                              ↓
                                        [Update DB]
                                              ↓
                                        [Redis Cache]
                                              ↓
                                        [WebSocket]
                                              ↓
                                        [Frontend]
```

---

## Continuará en siguiente parte...

Este es un documento EXTENSO. Continuaré con:
- Seguridad de Tokens (encriptación, secrets manager)
- Sincronización Inteligente (delta sync, conflict resolution)
- Estructura del Proyecto (carpetas, modularización)
- Ejemplos de Código (Upserts, Queue Processing)
- Observabilidad & Monitoring
- Riesgos y Mitigación
- Plan de Deploy (Docker, migrations)

¿Continúo con las siguientes secciones?
