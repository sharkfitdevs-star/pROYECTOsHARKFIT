-- ============================================================================
-- EVO W12 INTEGRATION MANUAL SETUP - SQL Script
-- ============================================================================
-- 
-- This script shows how to manually insert EVO credentials into SQLite
-- 
-- PREREQUISITES:
--   1. You have an encrypted token (use encrypt-token.js)
--   2. You have the encryption IV from encryption process
--   3. SQLite database exists at: backend/db.sqlite3
-- 
-- USAGE:
--   sqlite3 ../../backend/db.sqlite3 < manual-setup.sql
-- 
-- ============================================================================

-- Enable foreign keys
PRAGMA foreign_keys = ON;

-- Create api_integrations table (if not exists)
CREATE TABLE IF NOT EXISTS api_integrations (
    id TEXT PRIMARY KEY,
    tenant_id TEXT NOT NULL,
    dns TEXT NOT NULL,
    encrypted_token TEXT NOT NULL,
    encryption_iv TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    last_sync_at TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);

-- ============================================================================
-- EXAMPLE INTEGRATION INSERT
-- ============================================================================
-- 
-- IMPORTANT: Replace these values with your actual encrypted credentials
-- 
-- To get encrypted_token and encryption_iv, run:
--   node scripts/encrypt-token.js
-- 
-- ============================================================================

INSERT INTO api_integrations (
    id,
    tenant_id,
    dns,
    encrypted_token,
    encryption_iv,
    status,
    created_at,
    updated_at
) VALUES (
    -- Auto-generate UUID (SQLite style)
    lower(hex(randomblob(16))),
    
    -- Tenant ID: Unique identifier for this gym/organization
    -- Change to match your organization
    'gym-vendify-001',
    
    -- DNS: Your EVO W12 account DNS
    -- Get this from EVO W12 dashboard
    'your-evo-dns-here',
    
    -- Encrypted Token: Output from encrypt-token.js
    -- This is a hex string (ciphertext + auth tag)
    -- Example: 'a1b2c3d4e5f6...' (actual token will be ~100+ chars)
    'REPLACE_WITH_ENCRYPTED_TOKEN_FROM_ENCRYPT_SCRIPT',
    
    -- Encryption IV: Initialization Vector from encryption
    -- This is a 32-character hex string (16 bytes)
    -- Example: '1a2b3c4d5e6f7g8h9i0j1k2l3m4n5o6p'
    'REPLACE_WITH_IV_FROM_ENCRYPT_SCRIPT',
    
    -- Status: 'active' or 'inactive'
    'active',
    
    -- Timestamps (auto-generated)
    datetime('now'),
    datetime('now')
);

-- ============================================================================
-- VERIFY INSERTION
-- ============================================================================

-- Check if integration was added
SELECT 
    tenant_id,
    dns,
    status,
    created_at,
    'Token: ' || substr(encrypted_token, 1, 20) || '...' as token_preview
FROM api_integrations
WHERE tenant_id = 'gym-vendify-001';

-- ============================================================================
-- MULTIPLE INTEGRATIONS EXAMPLE (Multi-tenant)
-- ============================================================================

-- Uncomment and modify to add more integrations
/*
INSERT INTO api_integrations (
    id, tenant_id, dns, encrypted_token, encryption_iv, status
) VALUES
    (
        lower(hex(randomblob(16))),
        'gym-alpha',
        'alpha-dns',
        'alpha_encrypted_token_here',
        'alpha_iv_here',
        'active'
    ),
    (
        lower(hex(randomblob(16))),
        'gym-beta',
        'beta-dns',
        'beta_encrypted_token_here',
        'beta_iv_here',
        'active'
    );
*/

-- ============================================================================
-- USEFUL QUERIES
-- ============================================================================

-- Show all active integrations
-- SELECT tenant_id, dns, status, last_sync_at FROM api_integrations WHERE status = 'active';

-- Update integration status
-- UPDATE api_integrations SET status = 'inactive' WHERE tenant_id = 'gym-vendify-001';

-- Delete integration (use with caution)
-- DELETE FROM api_integrations WHERE tenant_id = 'gym-vendify-001';

-- Check last sync time
-- SELECT 
--     tenant_id,
--     last_sync_at,
--     CAST((julianday('now') - julianday(last_sync_at)) * 24 * 60 AS INTEGER) as minutes_ago
-- FROM api_integrations;

-- ============================================================================
-- END OF SCRIPT
-- ============================================================================
