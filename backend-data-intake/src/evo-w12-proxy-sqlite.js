/**
 * EVO W12 INTEGRATION MIDDLEWARE (MongoDB-backed)
 *
 * NOTE: file `src/evo-w12-proxy-sqlite.js` kept for backward compatibility but
 * the implementation is MongoDB-based. Use `src/evo-w12-proxy.js` (preferred).
 *
 * This service synchronizes EVO W12 data into MongoDB collections via Mongoose.
 */
const { logger } = require('./utils/logger');
logger.warn('[DEPRECATION] use src/evo-w12-proxy.js (sqlite filename is legacy)');

require('dotenv').config();
const axios = require('axios');
const crypto = require('crypto');
const { queueSyncTask } = require('./workers/api-worker');
const { connectDB, disconnectDB } = require('./db/mongodb');
const evoRepository = require('./db/evoRepository');
const mongoose = require('mongoose');

// =============================================================================
// CONFIGURATION & CONSTANTS
// =============================================================================

const EVO_BASE_URL = process.env.EVO_BASE_URL;
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // Must be 32 bytes (256 bits) 

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
  // No-op: schema/indexes are handled by Mongoose models in the Mongo-backed repo.
  console.log('[Database] MongoDB-backed proxy — schema managed by Mongoose');
} 

// =============================================================================
// DATABASE REPOSITORY
// =============================================================================

/**
 * Helper to ensure a member exists before inserting related data (Sales/Entries).
 * Resolves the internal UUID from the EVO Integer ID.
 */
async function getOrUpsertStubMember(tenantId, evoMemberId) {
  return await evoRepository.getOrUpsertStubMember(tenantId, evoMemberId);
}

// Replace legacy SQLite repository with thin async wrapper that delegates to evoRepository
const repository = {
  getActiveIntegrations: async () => await evoRepository.getActiveIntegrations(),
  upsertProspect: async (tenantId, data) => await evoRepository.upsertProspect(tenantId, data),
  upsertSale: async (tenantId, data, internalMemberId) => await evoRepository.upsertSale(tenantId, data, internalMemberId),
  upsertEntry: async (tenantId, data, internalMemberId) => await evoRepository.upsertEntry(tenantId, data, internalMemberId),
  logSyncJob: async (tenantId, type, status, msg = null) => await evoRepository.logSyncJob(tenantId, type, status, msg),
  updateLastSync: async (integrationId) => await evoRepository.updateLastSync(integrationId)
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

    logger.info(`[Sync] Starting for Tenant: ${tenant_id} (DNS: ${dns})`);

    // If Agenda is enabled, enqueue a sync task instead of running inline
    if (String(process.env.AGENDA_ENABLED).toLowerCase() === 'true') {
        try {
            await queueSyncTask('EVO', 'full-sync', { integrationId, tenant_id });

            if (mongoose.connection && mongoose.connection.readyState === 1) {
                try {
                    await evoRepository.logSyncJob(tenant_id, 'FULL_SYNC', 'QUEUED');
                } catch (logErr) {
                    console.warn('[Sync] Skipping DB log in enqueue path:', logErr.message);
                }
            } else {
                console.log('[Sync] MongoDB unavailable — skipped local log (enqueue-only mode)');
            }

            console.log(`[Sync] ✅ Enqueued FULL_SYNC for tenant ${tenant_id}`);
            return;
        } catch (err) {
            logger.error('[Sync] Error encolando job:', { error: err.message });
            // Fall through to attempt local sync if enqueueing fails
        }
    }

    // Using MongoDB repository — per-document atomic operations handled by Mongoose (no local SQLite transaction).

    try {
        // 1. Decrypt Token
        const rawToken = decryptToken(encrypted_token, encryption_iv);
        
        // 2. Init API Client
        const api = createEvoClient(dns, rawToken);

        // --- STEP A: PROSPECTS (/api/v1/prospects) ---
        // Critical Rule 3: Correct Endpoint
        logger.info(`[Sync] Fetching prospects for tenant ${tenant_id}...`);
        const prospectsRes = await api.get('/api/v1/prospects');
        const prospects = prospectsRes.data.list || prospectsRes.data || []; 

        for (const p of prospects) {
            await evoRepository.upsertProspect(tenant_id, p);
        }
        logger.info(`[Sync] ✅ Upserted ${prospects.length} prospects.`);

        // --- STEP B: SALES (/api/v2/sales) ---
        // Critical Rule 3: Correct Endpoint
        logger.info(`[Sync] Fetching sales for tenant ${tenant_id}...`);
        const salesRes = await api.get('/api/v2/sales');
        const sales = salesRes.data.list || salesRes.data || [];

        for (const s of sales) {
            const memberUuid = await getOrUpsertStubMember(tenant_id, s.idMember);
            if (memberUuid) {
                await evoRepository.upsertSale(tenant_id, s, memberUuid);
            }
        }
        logger.info(`[Sync] ✅ Upserted ${sales.length} sales.`);

        // --- STEP C: ENTRIES (/api/v1/entries) ---
        // Critical Rule 3: Correct Endpoint
        logger.info(`[Sync] Fetching entries for tenant ${tenant_id}...`);
        const entriesRes = await api.get('/api/v1/entries');
        const entries = entriesRes.data.list || entriesRes.data || [];

        for (const e of entries) {
            const memberUuid = await getOrUpsertStubMember(tenant_id, e.idMember);
            if (memberUuid) {
                await evoRepository.upsertEntry(tenant_id, e, memberUuid);
            }
        }
        logger.info(`[Sync] ✅ Upserted ${entries.length} entries.`);

        // Update last sync timestamp
        await evoRepository.updateLastSync(integrationId);
        await evoRepository.logSyncJob(tenant_id, 'FULL_SYNC', 'COMPLETED');
        
        logger.info(`[Sync] ✅ Completed successfully for tenant ${tenant_id}`);

    } catch (err) {
        logger.error(`[Sync Error] Tenant ${tenant_id}:`, { error: err.message });
        
        // Handle Axios Auth Errors specific to W12
        let errMsg = err.message;
        if (err.response) {
            errMsg = `API ${err.response.status}: ${JSON.stringify(err.response.data)}`;
        }
        
        await evoRepository.logSyncJob(tenant_id, 'FULL_SYNC', 'FAILED', errMsg);
        
        throw err; // Re-throw to be caught by main worker
    }
}

// =============================================================================
// MAIN SERVER / WORKER LOOP
// =============================================================================

async function runIntegrations() {
    // Use a DB-backed distributed lock instead of in-memory GLOBAL_SYNC_LOCK
    const acquired = await evoRepository.acquireSyncLock();
    if (!acquired) {
        console.warn('[System] ⏸️  Sync in progress (db lock). Skipping cycle.');
        return;
    }

    const startTime = Date.now();

    try {
        const integrations = await evoRepository.getActiveIntegrations();
        
        logger.info(`${'='.repeat(80)}`);
        logger.info(`[System] 🚀 Starting sync cycle at ${new Date().toISOString()}`);
        logger.info(`[System] 📊 Found ${integrations.length} active integration(s)`);
        logger.info(`${'='.repeat(80)}`);

        if (integrations.length === 0) {
            logger.warn('[System] No active integrations found. Add integrations to api_integrations collection.');
        }

        // Run sequentially to manage resources
        for (const integration of integrations) {
            await syncTenant(integration);
        }

        const duration = ((Date.now() - startTime) / 1000).toFixed(2);
        logger.info(`${'='.repeat(80)}`);
        logger.info(`[System] ✅ Sync cycle completed in ${duration}s`);
        logger.info(`${'='.repeat(80)}`);

    } catch (error) {
        logger.error('[System] Critical Worker Error:', error);
    } finally {
        await evoRepository.releaseSyncLock();
    }
}

// =============================================================================
// GRACEFUL SHUTDOWN
// =============================================================================

function gracefulShutdown(signal) {
    logger.info(`[System] Received ${signal}. Shutting down gracefully...`);
    
    // Wait for current sync to finish
    const checkLock = setInterval(async () => {
        // Wait for DB-backed lock to be released, then disconnect Mongo
        const locksCol = mongoose.connection.collection('locks');
        const lock = await locksCol.findOne({ _id: 'sync_lock' });
        if (!lock || lock.locked !== true) {
            clearInterval(checkLock);
            await disconnectDB();
            logger.info('[System] ✅ Database connection closed.');
            process.exit(0);
        } else {
            logger.info('[System] Waiting for active sync to complete...');
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
    console.log(`  MongoDB: ${process.env.MONGODB_URI || 'mongodb://localhost:27017/sharkfit'}`);
    console.log(`  EVO API: ${EVO_BASE_URL}`);
    console.log(`  Started: ${new Date().toISOString()}`);
    console.log('='.repeat(80) + '\n');

    // Connect to MongoDB (required for the Mongo-backed repo) and start worker loop
    (async () => {
        try {
            await connectDB();

            // Validate encryption key (only for CLI execution)
            if (!ENCRYPTION_KEY || ENCRYPTION_KEY.length !== 64) {
                console.error('❌ ERROR: ENCRYPTION_KEY must be 32 bytes (64 hex characters)');
                console.error('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"');
                process.exit(1);
            }

            // Run immediately on start
            console.log('[System] 🏃 Running initial sync...\n');
            await runIntegrations();

            // Schedule periodic syncs (e.g., every 15 minutes)
            const SYNC_INTERVAL_MS = parseInt(process.env.SYNC_INTERVAL_MINUTES || '15') * 60 * 1000;
            console.log(`[System] ⏰ Scheduled sync every ${SYNC_INTERVAL_MS / 60000} minutes\n`);

            setInterval(() => {
                runIntegrations().catch(err => {
                    console.error('[System] Error during scheduled sync:', err);
                });
            }, SYNC_INTERVAL_MS);
        } catch (err) {
            console.error('[System] Fatal error during startup:', err);
            process.exit(1);
        }
    })();
}

// Exported API (so tests can import the sync functions without starting the worker)
module.exports = { syncTenant, runIntegrations };
