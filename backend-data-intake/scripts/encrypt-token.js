/**
 * EVO Token Encryption Utility
 * 
 * Encrypts an EVO W12 API token using AES-256-GCM for secure storage.
 * 
 * Usage:
 *   ENCRYPTION_KEY=your_64_char_hex_key node encrypt-token.js
 * 
 * Or interactively:
 *   node encrypt-token.js
 */

require('dotenv').config();
const crypto = require('crypto');
const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

function encryptToken(token, encryptionKeyHex) {
    try {
        const key = Buffer.from(encryptionKeyHex, 'hex');
        
        if (key.length !== 32) {
            throw new Error('Encryption key must be exactly 32 bytes (64 hex characters)');
        }

        // Generate random IV (16 bytes for GCM)
        const iv = crypto.randomBytes(16);

        // Create cipher
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

        // Encrypt
        let encrypted = cipher.update(token, 'utf8');
        encrypted = Buffer.concat([encrypted, cipher.final()]);

        // Get auth tag (16 bytes)
        const authTag = cipher.getAuthTag();

        // Combine ciphertext + authTag
        const combinedBuffer = Buffer.concat([encrypted, authTag]);

        return {
            encryptedToken: combinedBuffer.toString('hex'),
            iv: iv.toString('hex'),
            success: true
        };
    } catch (error) {
        return {
            success: false,
            error: error.message
        };
    }
}

function generateEncryptionKey() {
    return crypto.randomBytes(32).toString('hex');
}

async function main() {
    console.log('\n╔════════════════════════════════════════════════════════════════╗');
    console.log('║        EVO W12 TOKEN ENCRYPTION UTILITY - Vendify            ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    // Check if encryption key exists
    let encryptionKey = process.env.ENCRYPTION_KEY;

    if (!encryptionKey) {
        console.log('⚠️  No ENCRYPTION_KEY found in environment.\n');
        
        const generateNew = await question('Would you like to generate a new encryption key? (y/n): ');
        
        if (generateNew.toLowerCase() === 'y') {
            encryptionKey = generateEncryptionKey();
            console.log('\n✅ Generated new encryption key:\n');
            console.log('─'.repeat(64));
            console.log(encryptionKey);
            console.log('─'.repeat(64));
            console.log('\n⚠️  IMPORTANT: Save this key in your .env file:');
            console.log(`   ENCRYPTION_KEY=${encryptionKey}\n`);
            
            const continueEncrypt = await question('Continue with token encryption? (y/n): ');
            if (continueEncrypt.toLowerCase() !== 'y') {
                console.log('\n👋 Exiting. Remember to save your encryption key!');
                rl.close();
                return;
            }
        } else {
            console.log('\n❌ Cannot proceed without encryption key.');
            console.log('Generate one with: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"\n');
            rl.close();
            return;
        }
    } else {
        console.log('✅ Found encryption key in environment\n');
    }

    // Get token to encrypt
    console.log('Enter the EVO W12 API token to encrypt:');
    const token = await question('Token: ');

    if (!token || token.trim().length === 0) {
        console.log('\n❌ Token cannot be empty');
        rl.close();
        return;
    }

    // Encrypt
    console.log('\n🔐 Encrypting token...\n');
    const result = encryptToken(token.trim(), encryptionKey);

    if (!result.success) {
        console.log(`❌ Encryption failed: ${result.error}\n`);
        rl.close();
        return;
    }

    // Display results
    console.log('✅ Token encrypted successfully!\n');
    console.log('╔════════════════════════════════════════════════════════════════╗');
    console.log('║                      ENCRYPTION RESULTS                        ║');
    console.log('╚════════════════════════════════════════════════════════════════╝\n');

    console.log('📋 Encrypted Token (hex):');
    console.log('─'.repeat(64));
    console.log(result.encryptedToken);
    console.log('─'.repeat(64));
    
    console.log('\n📋 Initialization Vector (IV) (hex):');
    console.log('─'.repeat(32));
    console.log(result.iv);
    console.log('─'.repeat(32));

    // SQL Insert Example
    console.log('\n\n📝 SQL INSERT Example:\n');
    console.log('INSERT INTO api_integrations (');
    console.log('    id,');
    console.log('    tenant_id,');
    console.log('    dns,');
    console.log('    encrypted_token,');
    console.log('    encryption_iv,');
    console.log('    status,');
    console.log('    created_at,');
    console.log('    updated_at');
    console.log(') VALUES (');
    console.log(`    lower(hex(randomblob(16))),`);
    console.log(`    'gym-example-001',           -- Change this`);
    console.log(`    'your-evo-dns',              -- Change this`);
    console.log(`    '${result.encryptedToken}',`);
    console.log(`    '${result.iv}',`);
    console.log(`    'active',`);
    console.log(`    datetime('now'),`);
    console.log(`    datetime('now')`);
    console.log(');\n');

    console.log('⚠️  SECURITY NOTES:');
    console.log('   1. Store the encryption key securely (never commit to git)');
    console.log('   2. Each token needs its own unique IV (never reuse IVs)');
    console.log('   3. The encrypted token and IV should be stored together');
    console.log('   4. If you lose the encryption key, tokens cannot be decrypted\n');

    // Test decryption
    const testDecrypt = await question('Would you like to test decryption? (y/n): ');
    
    if (testDecrypt.toLowerCase() === 'y') {
        console.log('\n🔓 Testing decryption...\n');
        
        try {
            const combinedBuffer = Buffer.from(result.encryptedToken, 'hex');
            const authTagLength = 16;
            const authTag = combinedBuffer.slice(combinedBuffer.length - authTagLength);
            const ciphertext = combinedBuffer.slice(0, combinedBuffer.length - authTagLength);
            const iv = Buffer.from(result.iv, 'hex');
            const key = Buffer.from(encryptionKey, 'hex');

            const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
            decipher.setAuthTag(authTag);

            let decrypted = decipher.update(ciphertext);
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            const decryptedToken = decrypted.toString('utf8');

            if (decryptedToken === token.trim()) {
                console.log('✅ Decryption successful! Token matches original.\n');
            } else {
                console.log('⚠️  Decryption succeeded but token doesn\'t match original.\n');
                console.log('Original:', token.trim());
                console.log('Decrypted:', decryptedToken);
            }
        } catch (error) {
            console.log(`❌ Decryption failed: ${error.message}\n`);
        }
    }

    console.log('\n✅ Done! You can now add this integration to your database.\n');
    rl.close();
}

// Run if called directly
if (require.main === module) {
    main().catch(err => {
        console.error('Fatal error:', err);
        process.exit(1);
    });
}

module.exports = { encryptToken, generateEncryptionKey };
