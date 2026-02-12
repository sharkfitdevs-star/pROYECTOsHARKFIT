/**
 * Interactive EVO W12 Credentials Setup
 * 
 * Adds encrypted EVO API credentials to the SQLite database.
 * 
 * Usage:
 *   node add-evo-credentials.js
 */

require('dotenv').config();
const Database = require('better-sqlite3');
const path = require('path');
const readline = require('readline');
const { encryptToken, generateEncryptionKey } = require('./encrypt-token');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

function generateUUID() {
    return require('crypto').randomUUID();
}

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║         EVO W12 CREDENTIALS SETUP - Vendify                  ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Get database path
    const dbPath = process.env.DATABASE_PATH || path.join(__dirname, '../../../backend/db.sqlite3');
    console.log(`📁 Database path: ${dbPath}\n`);

    // Check encryption key
    let encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
        console.log('⚠️  No ENCRYPTION_KEY found in .env file\n');
        
        const generate = await question('Generate a new encryption key? (y/n): ');
        
        if (generate.toLowerCase() === 'y') {
            encryptionKey = generateEncryptionKey();
            console.log('\n✅ Generated encryption key. Add this to your .env file:\n');
            console.log('─'.repeat(64));
            console.log(`ENCRYPTION_KEY=${encryptionKey}`);
            console.log('─'.repeat(64));
            console.log('\n⚠️  Press Enter after you\'ve saved it to .env...');
            await question('');
        } else {
            console.log('\n❌ Cannot proceed without encryption key');
            rl.close();
            return;
        }
    }

    // Connect to database
    let db;
    try {
        db = new Database(dbPath);
        db.pragma('foreign_keys = ON');
        console.log('✅ Connected to database\n');
    } catch (err) {
        console.log(`❌ Failed to connect to database: ${err.message}`);
        console.log('Make sure the database file exists and is accessible.\n');
        rl.close();
        return;
    }

    // Ensure table exists
    try {
        db.exec(`
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
        `);
        console.log('✅ Table api_integrations ready\n');
    } catch (err) {
        console.log(`❌ Failed to create table: ${err.message}\n`);
        db.close();
        rl.close();
        return;
    }

    // Collect integration details
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('Please provide the following information:\n');

    const tenantId = await question('🏢 Tenant ID (e.g., gym-sharkfit-001): ');
    const dns = await question('🌐 EVO DNS (e.g., sharkfit): ');
    const token = await question('🔑 EVO API Token: ');

    if (!tenantId || !dns || !token) {
        console.log('\n❌ All fields are required');
        db.close();
        rl.close();
        return;
    }

    // Check if tenant already exists
    const existing = db.prepare('SELECT * FROM api_integrations WHERE tenant_id = ?').get(tenantId);
    
    if (existing) {
        console.log(`\n⚠️  Tenant ${tenantId} already exists!`);
        console.log(`   Current DNS: ${existing.dns}`);
        console.log(`   Status: ${existing.status}`);
        console.log(`   Last sync: ${existing.last_sync_at || 'Never'}\n`);
        
        const overwrite = await question('Overwrite existing credentials? (y/n): ');
        
        if (overwrite.toLowerCase() !== 'y') {
            console.log('\n❌ Operation cancelled');
            db.close();
            rl.close();
            return;
        }

        // Delete existing
        db.prepare('DELETE FROM api_integrations WHERE tenant_id = ?').run(tenantId);
        console.log('✅ Deleted existing credentials\n');
    }

    // Encrypt token
    console.log('🔐 Encrypting token...\n');
    const encrypted = encryptToken(token, encryptionKey);

    if (!encrypted.success) {
        console.log(`❌ Encryption failed: ${encrypted.error}\n`);
        db.close();
        rl.close();
        return;
    }

    // Insert into database
    try {
        db.prepare(`
            INSERT INTO api_integrations (
                id, tenant_id, dns, encrypted_token, encryption_iv, status
            ) VALUES (?, ?, ?, ?, ?, 'active')
        `).run(
            generateUUID(),
            tenantId,
            dns,
            encrypted.encryptedToken,
            encrypted.iv
        );

        console.log('✅ Credentials successfully saved!\n');
        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('📋 Summary:\n');
        console.log(`   Tenant ID: ${tenantId}`);
        console.log(`   DNS: ${dns}`);
        console.log(`   Token: ${'*'.repeat(token.length)} (encrypted)`);
        console.log(`   Status: active`);
        console.log('\n═══════════════════════════════════════════════════════════════\n');
        
        console.log('🚀 Next steps:\n');
        console.log('   1. Start the proxy server:');
        console.log('      node src/evo-w12-proxy-sqlite.js\n');
        console.log('   2. Check sync logs in the sync_queue table\n');
        console.log('   3. Verify data in prospects, sales, access_logs tables\n');

    } catch (err) {
        console.log(`❌ Failed to save credentials: ${err.message}\n`);
    }

    // Show all active integrations
    const allActive = db.prepare('SELECT tenant_id, dns, status, last_sync_at FROM api_integrations WHERE status = "active"').all();
    
    if (allActive.length > 1) {
        console.log('📊 All active integrations:\n');
        console.log('─'.repeat(80));
        console.log('TENANT ID                DNS              STATUS    LAST SYNC');
        console.log('─'.repeat(80));
        
        allActive.forEach(integration => {
            const lastSync = integration.last_sync_at || 'Never';
            console.log(`${integration.tenant_id.padEnd(24)} ${integration.dns.padEnd(16)} ${integration.status.padEnd(9)} ${lastSync}`);
        });
        
        console.log('─'.repeat(80));
        console.log('');
    }

    db.close();
    rl.close();
    console.log('✅ Done!\n');
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}
