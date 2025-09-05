const crypto = require('crypto');

// Master key from environment (should be 32 bytes in base64)
const MASTER_KEY = Buffer.from(process.env.MASTER_KEY || 'default_master_key_32_bytes_long!!', 'utf8');

// Algorithm for encryption
const ALGORITHM = 'aes-256-gcm';
const KEY_LENGTH = 32; // 256 bits
const IV_LENGTH = 12;  // 96 bits for GCM
const TAG_LENGTH = 16; // 128 bits
const SALT_LENGTH = 32; // 256 bits

/**
 * Derive a key using HKDF
 * @param {Buffer} masterKey - The master key
 * @param {Buffer} salt - Salt for key derivation
 * @param {string} info - Context information
 * @returns {Buffer} Derived key
 */
function deriveKey(masterKey, salt, info = 'data_encryption') {
  return crypto.hkdfSync('sha256', masterKey, salt, info, KEY_LENGTH);
}

/**
 * Generate a random data encryption key
 * @returns {Buffer} Random 32-byte key
 */
function generateDataKey() {
  return crypto.randomBytes(KEY_LENGTH);
}

/**
 * Generate random salt
 * @returns {Buffer} Random salt
 */
function generateSalt() {
  return crypto.randomBytes(SALT_LENGTH);
}

/**
 * Encrypt sensitive data using envelope encryption
 * @param {any} data - Data to encrypt
 * @param {string} userId - User ID for AAD context
 * @param {string} type - Data type for AAD context
 * @returns {Object} Encryption result
 */
function encryptData(data, userId, type = 'sensitive') {
  try {
    // Convert data to JSON string if it's an object
    const plaintext = typeof data === 'string' ? data : JSON.stringify(data);
    
    // Generate random data key and salt
    const dataKey = generateDataKey();
    const salt = generateSalt();
    const iv = crypto.randomBytes(IV_LENGTH);
    
    // Create AAD (Additional Authenticated Data) for context binding
    const timestamp = Date.now().toString();
    const aad = Buffer.from(`${userId}|${timestamp}|${type}`, 'utf8');
    
    // Encrypt the plaintext with the data key using GCM
    const cipher = crypto.createCipherGCM(ALGORITHM, dataKey, iv);
    cipher.setAAD(aad);
    
    const encrypted = cipher.update(plaintext, 'utf8');
    const final = cipher.final();
    const ciphertext = Buffer.concat([encrypted, final]);
    const authTag = cipher.getAuthTag();
    
    // Derive envelope key from master key using HKDF
    const envelopeKey = deriveKey(MASTER_KEY, salt);
    
    // Encrypt the data key with the envelope key (wrap the data key)
    const wrapIv = crypto.randomBytes(16);
    const wrapCipher = crypto.createCipher('aes-256-cbc', envelopeKey, wrapIv);
    
    const wrappedKeyPart1 = wrapCipher.update(dataKey);
    const wrappedKeyPart2 = wrapCipher.final();
    const wrappedKey = Buffer.concat([wrapIv, wrappedKeyPart1, wrappedKeyPart2]);
    
    return {
      ciphertext,
      iv,
      authTag,
      wrappedKey,
      salt,
      aad,
      algorithm: ALGORITHM
    };
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Failed to encrypt data');
  }
}

/**
 * Decrypt sensitive data using envelope encryption
 * @param {Object} encryptedData - Encrypted data object
 * @param {string} userId - User ID for AAD context verification
 * @param {string} type - Data type for AAD context verification
 * @returns {any} Decrypted data
 */
function decryptData(encryptedData, userId, type = 'sensitive') {
  try {
    const {
      ciphertext,
      iv,
      authTag,
      wrappedKey,
      salt,
      aad,
      algorithm
    } = encryptedData;
    
    // Verify algorithm
    if (algorithm !== ALGORITHM) {
      throw new Error('Unsupported encryption algorithm');
    }
    
    // Derive envelope key from master key using HKDF
    const envelopeKey = deriveKey(MASTER_KEY, salt);
    
    // Unwrap the data key
    const wrapIv = wrappedKey.slice(0, 16);
    const wrappedKeyData = wrappedKey.slice(16);
    
    const unwrapDecipher = crypto.createDecipher('aes-256-cbc', envelopeKey, wrapIv);
    
    const dataKeyPart1 = unwrapDecipher.update(wrappedKeyData);
    const dataKeyPart2 = unwrapDecipher.final();
    const dataKey = Buffer.concat([dataKeyPart1, dataKeyPart2]);
    
    // Decrypt the ciphertext with the data key
    const decipher = crypto.createDecipherGCM(algorithm, dataKey, iv);
    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);
    
    const decryptedPart1 = decipher.update(ciphertext);
    const decryptedPart2 = decipher.final();
    const plaintext = Buffer.concat([decryptedPart1, decryptedPart2]).toString('utf8');
    
    // Try to parse as JSON, if it fails return as string
    try {
      return JSON.parse(plaintext);
    } catch {
      return plaintext;
    }
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Failed to decrypt data');
  }
}

/**
 * Encrypt a single field (like password)
 * @param {string} value - Value to encrypt
 * @param {string} userId - User ID for context
 * @returns {Object} Encrypted field data
 */
function encryptField(value, userId) {
  if (!value) return null;
  
  return encryptData(value, userId, 'field');
}

/**
 * Decrypt a single field
 * @param {Object} encryptedField - Encrypted field data
 * @param {string} userId - User ID for context
 * @returns {string} Decrypted value
 */
function decryptField(encryptedField, userId) {
  if (!encryptedField) return null;
  
  return decryptData(encryptedField, userId, 'field');
}

/**
 * Hash a password using bcrypt-like method
 * @param {string} password - Password to hash
 * @param {number} rounds - Number of rounds (default 12)
 * @returns {Promise<string>} Hashed password
 */
async function hashPassword(password, rounds = 12) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.hash(password, rounds);
}

/**
 * Verify a password against a hash
 * @param {string} password - Plain password
 * @param {string} hash - Hashed password
 * @returns {Promise<boolean>} Verification result
 */
async function verifyPassword(password, hash) {
  const bcrypt = require('bcryptjs');
  return await bcrypt.compare(password, hash);
}

/**
 * Serialize encrypted data for database storage
 * @param {Object} encryptedData - Encrypted data object
 * @returns {Object} Serialized data for database
 */
function serializeEncryptedData(encryptedData) {
  if (!encryptedData) return null;
  
  return {
    ciphertext: encryptedData.ciphertext,
    iv: encryptedData.iv,
    authTag: encryptedData.authTag,
    wrappedKey: encryptedData.wrappedKey,
    salt: encryptedData.salt,
    aad: encryptedData.aad,
    algorithm: encryptedData.algorithm
  };
}

/**
 * Deserialize encrypted data from database
 * @param {Object} serializedData - Serialized data from database
 * @returns {Object} Encrypted data object
 */
function deserializeEncryptedData(serializedData) {
  if (!serializedData) return null;
  
  return {
    ciphertext: serializedData.ciphertext,
    iv: serializedData.iv,
    authTag: serializedData.authTag,
    wrappedKey: serializedData.wrappedKey,
    salt: serializedData.salt,
    aad: serializedData.aad,
    algorithm: serializedData.algorithm
  };
}

module.exports = {
  encryptData,
  decryptData,
  encryptField,
  decryptField,
  hashPassword,
  verifyPassword,
  serializeEncryptedData,
  deserializeEncryptedData,
  generateDataKey,
  generateSalt
};