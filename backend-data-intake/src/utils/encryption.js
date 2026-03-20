const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const SECRET_KEY = process.env.ENCRYPTION_KEY || crypto.randomBytes(32).toString('hex').slice(0, 32);
const IV_LENGTH = 16;

const encryption = {
  encrypt(text) {
    if (!text) return null;
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'utf8'), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');
    return `${iv.toString('hex')}:${authTag}:${encrypted}`;
  },

  decrypt(encryptedText) {
    if (!encryptedText) return null;
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 3) return null;
      const iv = Buffer.from(parts[0], 'hex');
      const authTag = Buffer.from(parts[1], 'hex');
      const encrypted = parts[2];
      const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY, 'utf8'), iv);
      decipher.setAuthTag(authTag);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      console.error('Error decrypting:', error.message);
      return null;
    }
  },

  hash(text) {
    if (!text) return null;
    return crypto.createHash('sha256').update(text).digest('hex');
  },

  generateToken(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  },

  compareHash(text, hashedText) {
    if (!text || !hashedText) return false;
    const hash = this.hash(text);
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(hashedText));
  }
};

module.exports = encryption;
