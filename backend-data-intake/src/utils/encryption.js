/**
 * Cifrado AES-256-GCM para credenciales sensibles
 * Usado por apiSetup.js para cifrar tokens de APIs externas
 *
 * REQUIERE: ENCRYPTION_KEY en .env (hex 64 chars = 32 bytes)
 * Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */
const crypto = require('crypto');

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

function getKey() {
  const key = process.env.ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      'ENCRYPTION_KEY no configurado en variables de entorno. ' +
      'Genera una con: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'hex\'))"'
    );
  }
  if (key.length !== 64) {
    throw new Error('ENCRYPTION_KEY debe ser un string hex de 64 caracteres (32 bytes)');
  }
  return Buffer.from(key, 'hex');
}

/**
 * Cifra un string con AES-256-GCM
 * @param {string} plaintext - Texto a cifrar
 * @returns {string} Formato: "iv:authTag:ciphertext" (todo en hex)
 */
function encrypt(plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('encrypt() requiere un string no vacio');
  }
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');
  return iv.toString('hex') + ':' + authTag + ':' + encrypted;
}

/**
 * Descifra un string cifrado con encrypt()
 * @param {string} encryptedString - Formato: "iv:authTag:ciphertext"
 * @returns {string} Texto original
 */
function decrypt(encryptedString) {
  if (!encryptedString || typeof encryptedString !== 'string') {
    throw new Error('decrypt() requiere un string no vacio');
  }
  const parts = encryptedString.split(':');
  if (parts.length !== 3) {
    throw new Error('Formato de cifrado invalido (esperado iv:authTag:ciphertext)');
  }
  const [ivHex, authTagHex, ciphertext] = parts;
  const key = getKey();
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  if (authTag.length !== AUTH_TAG_LENGTH) {
    throw new Error('Auth tag invalido para AES-256-GCM');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  return decrypted;
}

module.exports = { encrypt, decrypt };
