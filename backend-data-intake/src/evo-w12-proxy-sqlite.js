/**
 * EVO W12 INTEGRATION MIDDLEWARE (PROXY SERVER) - SQLite Edition
 * 
 * Description:
 * This Node.js service acts as a secure proxy/worker to synchronize data 
 * between the EVO W12 API and the Vendify internal SQLite database.
 * 
 * Architecture Patterns:
 * 1. Global Locking: Prevents race conditions during heavy sync cycles.
 * 2. Repository Pattern: DB logic isolated from API logic.
 * 3. AES-256-GCM: Authenticated encryption for token security (Critical Rule 4).
 * 4. Native Axios Auth: Prevents header malformation issues (Critical Rule 2).
 * 
 * SQLite Adaptations:
 * - Uses better-sqlite3 for synchronous, high-performance operations
 * - UUIDs generated in JavaScript using crypto.randomUUID()
 * - Single file database connection
 * - Transaction support preserved
 */

require('dotenv').config();
let Database; // lazy require so tests can import module without native dependency
let db = null;
const axios = require('axios');
const crypto = require('crypto');
const path = require('path');
const { queueSyncTask } = require('./workers/api-worker');

function ensureDb() {
  if (db) return db;
  Database = Database || require('better-sqlite3');
  db = new Database(DB_PATH, { verbose: console.log, fileMustExist: false });
  db.pragma('foreign_keys = ON');
  db.pragma('journal_mode = WAL');
  return db;
}

// =============================================================================
// CONFIGURATION & CONSTANTS
// =============================================================================

const EVO_BASE_URL = process.env.EVO_BASE_URL;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (256 bits)
const DB_PATH = process.env.DATABASE_PATH || path.join(__dirname, '../../db.sqlite3');

// Global Concurrency Lock (Critical Rule 6)
let GLOBAL_SYNC_LOCK = false;

// =============================================================================
// SECURITY UTILITIES (AES-256-GCM)
// =============================================================================

/**
 * Decrypts the API token using AES-256-GCM.
 * Assumes encryptedText format: ciphertext(hex) + authtag(hex-16bytes)
 * Standard GCM requires: Key, IV, AuthTag, and Ciphertext.
 */
function decryptToken(encryptedText, ivHex) {
    try {
        const combinedBuffer = Buffer.from(encryptedText, 'hex');
        
        // GCM Auth Tag is usually 16 bytes (128 bits)
        const authTagLength = 16;
        const authTag = combinedBuffer.slice(combinedBuffer.length - authTagLength);
        const ciphertext = combinedBuffer.slice(0, combinedBuffer.length - authTagLength);
        const iv = Buffer.from(ivHex, 'hex');

        // Critical Rule 4: AES-256-GCM
        const decipher = crypto.createDecipheriv('aes-256-gcm', Buffer.from(ENCRYPTION_KEY, 'hex'), iv);
        decipher.setAuthTag(authTag);

        let decrypted = decipher.update(ciphertext);
        decrypted = Buffer.concat([decrypted, decipher.final()]);

        return decrypted.toString('utf8');
    } catch (error) {
        console.error('[Security] Token decryption failed. Check Key/IV integrity.', error.message);
        throw new Error('AUTH_DECRYPTION_FAILURE');
    }
}

/**
 * Generate UUID v4 for SQLite (since it doesn't have built-in UUID)
 */
function generateUUID() {
    return crypto.randomUUID();
}

// =============================================================================
// DATABASE SCHEMA INITIALIZATION
// =============================================================================

function initializeSchema() {
    // Lazy-init DB (allows importing module in tests without native sqlite)
    ensureDb();
    // Create tables if they don't exist (idempotent)
    
    db.exec(`
        CREATE TABLE IF NOT EXISTS api_integrations (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            tenant_id TEXT NOT NULL,
            dns TEXT NOT NULL,
            encrypted_token TEXT NOT NULL,
            encryption_iv TEXT NOT NULL,
            status TEXT DEFAULT 'active',
            last_sync_at TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now'))
        );

        CREATE TABLE IF NOT EXISTS members (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            tenant_id TEXT NOT NULL,
            evo_member_id INTEGER NOT NULL,
            name TEXT,
            email TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(tenant_id, evo_member_id)
        );

        CREATE TABLE IF NOT EXISTS prospects (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            tenant_id TEXT NOT NULL,
            evo_prospect_id INTEGER NOT NULL,
            name TEXT,
            email TEXT,
            registration_date TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(tenant_id, evo_prospect_id)
        );

        CREATE TABLE IF NOT EXISTS sales (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            tenant_id TEXT NOT NULL,
            evo_sale_id INTEGER NOT NULL,
            member_id TEXT,
            amount REAL,
            sale_date TEXT,
            status TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            updated_at TEXT DEFAULT (datetime('now')),
            UNIQUE(tenant_id, evo_sale_id),
            FOREIGN KEY (member_id) REFERENCES members(id)
        );

        CREATE TABLE IF NOT EXISTS access_logs (
            id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
            tenant_id TEXT NOT NULL,
            evo_entry_id INTEGER NOT NULL,
            member_id TEXT,
            access_time TEXT,
            location TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            UNIQUE(tenant_id, evo_entry_id),
            FOREIGN KEY (member_id) REFERENCES members(id)
        );

        CREATE TABLE IF NOT EXISTS sync_queue (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tenant_id TEXT NOT NULL,
            job_type TEXT NOT NULL,
            status TEXT NOT NULL,
            error_message TEXT,
            created_at TEXT DEFAULT (datetime('now')),
            processed_at TEXT DEFAULT (datetime('now'))
        );

        -- Indexes for performance
        CREATE INDEX IF NOT EXISTS idx_members_tenant_evo 
            ON members(tenant_id, evo_member_id);
        
        CREATE INDEX IF NOT EXISTS idx_prospects_tenant_evo 
            ON prospects(tenant_id, evo_prospect_id);
        
        CREATE INDEX IF NOT EXISTS idx_sales_tenant_evo 
            ON sales(tenant_id, evo_sale_id);
        
        CREATE INDEX IF NOT EXISTS idx_access_logs_tenant_evo 
            ON access_logs(tenant_id, evo_entry_id);
        
        CREATE INDEX IF NOT EXISTS idx_sync_queue_tenant_status 
            ON sync_queue(tenant_id, status);
    `);

    console.log('[Database] Schema initialized successfully');
}

// =============================================================================
// DATABASE REPOSITORY
// =============================================================================

/**
 * Helper to ensure a member exists before inserting related data (Sales/Entries).
 * Resolves the internal UUID from the EVO Integer ID.
 */
function getOrUpsertStubMember(tenantId, evoMemberId) {
    if (!evoMemberId) return null;

    // First try to get existing
    const stmt = db.prepare('SELECT id FROM members WHERE tenant_id = ? AND evo_member_id = ?');
    const existingMember = stmt.get(tenantId, evoMemberId);

    if (existingMember) return existingMember.id;

    // Create Stub if missing to satisfy FK constraints
    const insertStmt = db.prepare(`
        INSERT INTO members (id, tenant_id, evo_member_id, name, created_at, updated_at)
        VALUES (?, ?, ?, 'Unknown Stub', datetime('now'), datetime('now'))
        ON CONFLICT (tenant_id, evo_member_id) DO UPDATE SET updated_at = datetime('now')
    `);
    
    const memberId = generateUUID();
    try {
        insertStmt.run(memberId, tenantId, evoMemberId);
        return memberId;
    } catch (err) {
        // If conflict occurred during INSERT, fetch again
        const retryStmt = db.prepare('SELECT id FROM members WHERE tenant_id = ? AND evo_member_id = ?');
        const member = retryStmt.get(tenantId, evoMemberId);
        return member ? member.id : null;
    }
}

const repository = {
    getActiveIntegrations: () => {
        const stmt = db.prepare('SELECT * FROM api_integrations WHERE status = ?');
        return stmt.all('active');
    },

    // Critical Rule 5: UPSERT with ON CONFLICT
    upsertProspect: (tenantId, data) => {
        const stmt = db.prepare(`
            INSERT INTO prospects (id, tenant_id, evo_prospect_id, name, email, registration_date, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT (tenant_id, evo_prospect_id) 
            DO UPDATE SET 
                name = excluded.name,
                email = excluded.email,
                registration_date = excluded.registration_date,
                updated_at = datetime('now')
        `);
        
        stmt.run(
            generateUUID(),
            tenantId,
            data.id,
            data.name || null,
            data.email || null,
            data.registerDate || null
        );
    },

    upsertSale: (tenantId, data, internalMemberId) => {
        const stmt = db.prepare(`
            INSERT INTO sales (id, tenant_id, evo_sale_id, member_id, amount, sale_date, status, created_at, updated_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))
            ON CONFLICT (tenant_id, evo_sale_id)
            DO UPDATE SET
                amount = excluded.amount,
                status = excluded.status,
                sale_date = excluded.sale_date,
                member_id = excluded.member_id,
                updated_at = datetime('now')
        `);
        
        stmt.run(
            generateUUID(),
            tenantId,
            data.id,
            internalMemberId,
            data.amount || 0,
            data.saleDate || null,
            data.status || 'pending'
        );
    },

    upsertEntry: (tenantId, data, internalMemberId) => {
        const stmt = db.prepare(`
            INSERT INTO access_logs (id, tenant_id, evo_entry_id, member_id, access_time, location, created_at)
            VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            ON CONFLICT (tenant_id, evo_entry_id)
            DO NOTHING
        `);
        
        try {
            stmt.run(
                generateUUID(),
                tenantId,
                data.id,
                internalMemberId,
                data.accessDate || null,
                data.branchName || null
            );
        } catch (err) {
            // Ignore duplicate entries
            if (!err.message.includes('UNIQUE constraint')) {
                throw err;
            }
        }
    },

    logSyncJob: (tenantId, type, status, msg = null) => {
        const stmt = db.prepare(`
            INSERT INTO sync_queue (tenant_id, job_type, status, error_message, created_at, processed_at)
            VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
        `);
        
        stmt.run(tenantId, type, status, msg);
    },

    updateLastSync: (integrationId) => {
        const stmt = db.prepare(`
            UPDATE api_integrations 
            SET last_sync_at = datetime('now'),
                updated_at = datetime('now')
            WHERE id = ?
        `);
        
        stmt.run(integrationId);
    }
};

// =============================================================================
// EVO API CLIENT FACTORY
// =============================================================================

function createEvoClient(dns, token) {
    // Critical Rule 2: Native Axios Auth (No manual Basic headers)
    return axios.create({
        baseURL: EVO_BASE_URL,
        auth: {
            username: dns,
            password: token
        },
        timeout: 15000,
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        }
    });
}

// =============================================================================
// SYNC LOGIC
// =============================================================================

async function syncTenant(integration) {
    const { tenant_id, dns, encrypted_token, encryption_iv, id: integrationId } = integration;

    console.log(`[Sync] Starting for Tenant: ${tenant_id} (DNS: ${dns})`);

    // If Agenda is enabled, enqueue a sync task instead of running inline
    if (String(process.env.AGENDA_ENABLED).toLowerCase() === 'true') {
        try {
            await queueSyncTask('EVO', 'full-sync', { integrationId, tenant_id });
            // Avoid touching the SQLite `db` during the enqueue path so the module
            // remains import-safe for tests (no native `better-sqlite3` required).
            if (db) {
                try {
                    repository.logSyncJob(tenant_id, 'FULL_SYNC', 'QUEUED');
                } catch (logErr) {
                    console.warn('[Sync] Skipping DB log in enqueue path:', logErr.message);
                }
            } else {
                console.log('[Sync] DB unavailable — skipped local log (enqueue-only mode)');
            }

            console.log(`[Sync] ✅ Enqueued FULL_SYNC for tenant ${tenant_id}`);
            return;
        } catch (err) {
            console.error('[Sync] Error encolando job:', err.message);
            // Fall through to attempt local sync if enqueueing fails
        }
    }

    // Start SQLite transaction
    const transaction = db.transaction(() => {
        try {
            // This will be executed inside the transaction
            return { success: true };
        } catch (err) {
            throw err;
        }
    });

    try {
        // 1. Decrypt Token
        const rawToken = decryptToken(encrypted_token, encryption_iv);
        
        // 2. Init API Client
        const api = createEvoClient(dns, rawToken);

        // --- STEP A: PROSPECTS (/api/v1/prospects) ---
        // Critical Rule 3: Correct Endpoint
        console.log(`[Sync] Fetching prospects for tenant ${tenant_id}...`);
        const prospectsRes = await api.get('/api/v1/prospects');
        const prospects = prospectsRes.data.list || prospectsRes.data || []; 
        
        db.transaction(() => {
            for (const p of prospects) {
                repository.upsertProspect(tenant_id, p);
            }
        })();
        console.log(`[Sync] ✅ Upserted ${prospects.length} prospects.`);

        // --- STEP B: SALES (/api/v2/sales) ---
        // Critical Rule 3: Correct Endpoint
        console.log(`[Sync] Fetching sales for tenant ${tenant_id}...`);
        const salesRes = await api.get('/api/v2/sales');
        const sales = salesRes.data.list || salesRes.data || [];

        db.transaction(() => {
            for (const s of sales) {
                // Must resolve Member UUID first
                const memberUuid = getOrUpsertStubMember(tenant_id, s.idMember);
                if (memberUuid) {
                    repository.upsertSale(tenant_id, s, memberUuid);
                }
            }
        })();
        console.log(`[Sync] ✅ Upserted ${sales.length} sales.`);

        // --- STEP C: ENTRIES (/api/v1/entries) ---
        // Critical Rule 3: Correct Endpoint
        console.log(`[Sync] Fetching entries for tenant ${tenant_id}...`);
        const entriesRes = await api.get('/api/v1/entries');
        const entries = entriesRes.data.list || entriesRes.data || [];

        db.transaction(() => {
            for (const e of entries) {
                const memberUuid = getOrUpsertStubMember(tenant_id, e.idMember);
                if (memberUuid) {
                    repository.upsertEntry(tenant_id, e, memberUuid);
                }
            }
        })();
        console.log(`[Sync] ✅ Upserted ${entries.length} entries.`);

        // Update last sync timestamp
        repository.updateLastSync(integrationId);
        repository.logSyncJob(tenant_id, 'FULL_SYNC', 'COMPLETED');
        
        console.log(`[Sync] ✅ Completed successfully for tenant ${tenant_id}`);

    } catch (err) {
        console.error(`[Sync Error] ❌ Tenant ${tenant_id}:`, err.message);
        
        // Handle Axios Auth Errors specific to W12
        let errMsg = err.message;
        if (err.response) {
            errMsg = `API ${err.response.status}: ${JSON.stringify(err.response.data)}`;
        }
        
        repository.logSyncJob(tenant_id, 'FULL_SYNC', 'FAILED', errMsg);
        
        throw err; // Re-throw to be caught by main worker
    }
}

// =============================================================================
// MAIN SERVER / WORKER LOOP
// =============================================================================

async function runIntegrations() {
    // Critical Rule 6: Global Lock
    if (GLOBAL_SYNC_LOCK) {
        console.warn('[System] ⏸️  Sync in progress. Skipping cycle.');
        return;
    }

    GLOBAL_SYNC_LOCK = true;
    const startTime = Date.now();

    try {
        const integrations = repository.getActiveIntegrations();
        
        console.log(`\n${'='.repeat(80)}`);
        console.log(`[System] 🚀 Starting sync cycle at ${new Date().toISOString()}`);
        console.log(`[System] 📊 Found ${integrations.length} active integration(s)`);
        console.log(`${'='.repeat(80)}\n`);

        if (integrations.length === 0) {
            console.log('[System] ⚠️  No active integrations found. Add integrations to api_integrations table.');
        }

        // Run sequentially to manage resources
        // Use Promise.all for parallel if needed: await Promise.all(integrations.map(syncTenant))
        for (const integration of integrations) {
            await syncTenant(integration);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        console.log(`\n${'='.repeat(80)}`);
        console.log(`[System] ✅ Sync cycle completed in ${duration}s`);
        console.log(`${'='.repeat(80)}\n`);

    } catch (error) {
        console.error('[System] ❌ Critical Worker Error:', error);
    } finally {
        GLOBAL_SYNC_LOCK = false;
    }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

function gracefulShutdown(signal) {
    console.log(`\n[System] 🛑 Received ${signal}. Shutting down gracefully...`);
    
    // Wait for current sync to finish
    const checkLock = setInterval(() => {
        if (!GLOBAL_SYNC_LOCK) {
            clearInterval(checkLock);
            db.close();
            console.log('[System] ✅ Database connection closed.');
            process.exit(0);
        } else {
            console.log('[System] ⏳ Waiting for active sync to complete...');
        }
    }, 1000);
}

// Only attach signal handlers and start loop when executed as a script
if (require.main === module) {
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // =============================================================================
    // STARTUP
    // =============================================================================

    console.log('\n' + '='.repeat(80));
    console.log('  EVO W12 INTEGRATION PROXY SERVER (SQLite Edition)');
    console.log('  Vendify - Sales Management System');
    console.log('='.repeat(80));
    console.log(`  Database: ${DB_PATH}`);
    console.log(`  EVO API: ${EVO_BASE_URL}`);
    console.log(`  Started: ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');

    // Initialize database schema
    initializeSchema();

    // Validate encryption key (only for CLI execution)
    if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
        console.error('❌ ERROR: ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
        console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
        process.exit(1);
    }

    // Run immediately on start
    console.log('[System] 🏃 Running initial sync...\n');
    runIntegrations().catch(err => {
        console.error('[System] Fatal error during initial sync:', err);
    });

    // Schedule periodic syncs (e.g., every 15 minutes)
    const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MINUTES || '15') * 60 * 1000;
    console.log(`[System] ⏰ Scheduled sync every ${SYNC_INTERVAL_MS / 60000} minutes\n`);

    setInterval(() => {
        runIntegrations().catch(err => {
            console.error('[System] Error during scheduled sync:', err);
        });
    }, SYNC_INTERVAL_MS);
}

// Exported API (so tests can import the sync functions without starting the worker)
module.exports = { syncTenant, runIntegrations };
