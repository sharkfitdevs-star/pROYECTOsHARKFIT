/**
 * Interactive EVO W12 Credentials Setup
 * 
 * Adds encrypted EVO API credentials to the SQLite database.
 * 
 * Usage:
 *   node add-evo-credentials.js
 */

require('dotenv').config();
const path = require('path');
const readline = require('readline');
const { encryptToken, generateEncryptionKey } = require('./encrypt-token');
const { connectDB, disconnectDB } = require('../src/db/mongodb');
const ApiIntegration = require('../src/models/ApiIntegration');

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

    // Require ENCRYPTION_KEY and MONGODB_URI
    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey) {
      console.error('❌ ENCRYPTION_KEY not configured in .env. Generate one and retry.');
      process.exit(1);
    }

    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI not configured. This script now writes to MongoDB only.');
      process.exit(1);
    }

    // Connect to MongoDB
    try {
      await connectDB();
      console.log('✅ Connected to MongoDB\n');
    } catch (err) {
      console.error('❌ Failed to connect to MongoDB:', err.message || err);
      process.exit(1);
    }

    // Using MongoDB — collection schema enforced by Mongoose models (no SQL schema creation needed)
    // (Legacy SQLite schema creation removed.)

    // Collect integration details
    console.log('═══════════════════════════════════════════════════════════════\n');
    console.log('Please provide the following information:\n');

    const tenantId = await question('🏢 Tenant ID (e.g., gym-sharkfit-001): ');
    const dns = await question('🌐 EVO DNS (e.g., sharkfit): ');
    const token = await question('🔑 EVO API Token: ');

    if (!tenantId || !dns || !token) {
        console.log('\n❌ All fields are required');
        await disconnectDB();
        rl.close();
        return;
    }

    // Check if tenant already exists (Mongo)
    const existing = await ApiIntegration.findOne({ tenantId }).lean();
    if (existing) {
      console.log(`\n⚠️  Tenant ${tenantId} already exists!`);
      console.log(`   Current DNS: ${existing.dns}`);
      console.log(`   Status: ${existing.status}`);
      console.log(`   Last sync: ${existing.lastSyncAt || 'Never'}\n`);

      const overwrite = await question('Overwrite existing credentials? (y/n): ');
      if (overwrite.toLowerCase() !== 'y') {
        console.log('\n❌ Operation cancelled');
        await disconnectDB();
        rl.close();
        return;
      }

      await ApiIntegration.deleteOne({ tenantId });
      console.log('✅ Deleted existing credentials\n');
    }

    // Encrypt token
    console.log('🔐 Encrypting token...\n');
    const encrypted = encryptToken(token, encryptionKey);

    if (!encrypted.success) {
        console.log(`❌ Encryption failed: ${encrypted.error}\n`);
        await disconnectDB();
        rl.close();
        return;
    }

    // Insert into database — prefer MongoDB when available
    try {
        if (process.env.MONGODB_URI) {
            // Use Mongoose ApiIntegration model
            const { connectDB, disconnectDB } = require('../src/db/mongodb');
            const ApiIntegration = require('../src/models/ApiIntegration');
            await connectDB();

            await ApiIntegration.create({
                tenantId,
                dns,
                encryptedToken: encrypted.encryptedToken,
                encryptionIv: encrypted.iv,
                status: 'active'
            });

            console.log('✅ Credentials successfully saved to MongoDB!\n');
            await disconnectDB();
        } else {
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

            console.log('✅ Credentials successfully saved to SQLite!\n');
        }

        console.log('═══════════════════════════════════════════════════════════════\n');
        console.log('📋 Summary:\n');
        console.log(`   Tenant ID: ${tenantId}`);
        console.log(`   DNS: ${dns}`);
        console.log(`   Token: ${'*'.repeat(token.length)} (encrypted)`);
        console.log(`   Status: active`);
        console.log('\n═══════════════════════════════════════════════════════════════\n');
        
        console.log('🚀 Next steps:\n');
        console.log('   1. Start the proxy server:');
        console.log('      npm run evo-proxy\n');
        console.log('   2. Check sync logs in the sync_queue / sync_logs collection\n');
        console.log('   3. Verify data in prospects, ventas, access_logs collections\n');

    } catch (err) {
        console.log(`❌ Failed to save credentials: ${err.message}\n`);
    }

    // Show all active integrations (Mongo)
    const allActive = await ApiIntegration.find({ status: 'active' }).select('tenantId dns status lastSyncAt').lean();

    if (allActive.length > 0) {
      console.log('📊 All active integrations:\n');
      console.log('─'.repeat(80));
      console.log('TENANT ID                DNS              STATUS    LAST SYNC');
      console.log('─'.repeat(80));
      allActive.forEach(integration => {
        const lastSync = integration.lastSyncAt || 'Never';
        console.log(`${integration.tenantId.padEnd(24)} ${integration.dns.padEnd(16)} ${integration.status.padEnd(9)} ${lastSync}`);
      });
      console.log('─'.repeat(80));
      console.log('');
    }

    await disconnectDB();
    rl.close();
    console.log('✅ Done!\n');
}

if (require.main === module) {
    main().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}
