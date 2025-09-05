const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

class Auth {
    constructor() {
        this.jwtSecret = process.env.JWT_SECRET || 'default-secret-change-in-production';
        this.masterKey = process.env.MASTER_KEY || 'default-master-key-change-in-production';
    }

    // Hash password with bcrypt
    async hashPassword(password) {
        const saltRounds = 12;
        return await bcrypt.hash(password, saltRounds);
    }

    // Verify password
    async verifyPassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    // Generate JWT token with proper expiration
    generateToken(payload) {
        return jwt.sign(payload, this.jwtSecret, { 
            expiresIn: '8h',
            issuer: 'limitclean-dashboard',
            audience: 'limitclean-users'
        });
    }

    // Verify JWT token
    verifyToken(token) {
        try {
            return jwt.verify(token, this.jwtSecret);
        } catch (error) {
            throw new Error('Token inválido');
        }
    }

    // Enhanced middleware for JWT authentication with better error handling
    authenticateToken(req, res, next) {
        const token = req.cookies?.token;

        if (!token) {
            // For API routes, return JSON error
            if (req.path.startsWith('/api/')) {
                return res.status(401).json({ error: 'Token de acesso necessário' });
            }
            // For page requests, redirect to login
            return res.redirect('/login.html');
        }

        try {
            const decoded = this.verifyToken(token);
            req.user = decoded;
            next();
        } catch (error) {
            console.log('Token verification failed:', error.message);
            
            // Clear invalid cookie
            res.clearCookie('token');
            
            // For API routes, return JSON error
            if (req.path.startsWith('/api/')) {
                return res.status(403).json({ error: 'Token inválido' });
            }
            // For page requests, redirect to login
            return res.redirect('/login.html');
        }
    }

    // Middleware for role-based authorization
    authorizeRoles(...roles) {
        return (req, res, next) => {
            if (!req.user) {
                return res.status(401).json({ error: 'Usuário não autenticado' });
            }

            if (!roles.includes(req.user.role)) {
                return res.status(403).json({ error: 'Acesso negado' });
            }

            next();
        };
    }

    // AES-256-GCM Encryption with envelope encryption (simplified for this context)
    encryptData(plaintext) {
        try {
            // Generate random key for this encryption
            const dataKey = crypto.randomBytes(32);
            const salt = crypto.randomBytes(32);
            const derivedKey = crypto.hkdfSync('sha256', dataKey, salt, this.masterKey, 32);
            const iv = crypto.randomBytes(12);
            const aad = crypto.randomBytes(16);
            
            const cipher = crypto.createCipherGCM('aes-256-gcm', derivedKey);
            cipher.setAAD(aad);
            
            let encrypted = cipher.update(plaintext, 'utf8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            const authTag = cipher.getAuthTag();
            
            // Encrypt the data key with master key
            const keyIv = crypto.randomBytes(12);
            const keyCipher = crypto.createCipherGCM('aes-256-gcm', Buffer.from(this.masterKey.slice(0, 32), 'utf8'));
            let wrappedKey = keyCipher.update(dataKey);
            wrappedKey = Buffer.concat([wrappedKey, keyCipher.final()]);
            const keyAuthTag = keyCipher.getAuthTag();
            
            return {
                encrypted: encrypted.toString('base64'),
                wrappedKey: wrappedKey.toString('base64'),
                iv: iv.toString('base64'),
                keyIv: keyIv.toString('base64'),
                authTag: authTag.toString('base64'),
                keyAuthTag: keyAuthTag.toString('base64'),
                aad: aad.toString('base64'),
                salt: salt.toString('base64')
            };
        } catch (error) {
            throw new Error('Erro na criptografia: ' + error.message);
        }
    }

    // AES-256-GCM Decryption
    decryptData(encryptedData) {
        try {
            const {
                encrypted,
                wrappedKey,
                iv,
                keyIv,
                authTag,
                keyAuthTag,
                aad,
                salt
            } = encryptedData;

            // Decrypt the data key
            const keyDecipher = crypto.createDecipherGCM('aes-256-gcm', Buffer.from(this.masterKey.slice(0, 32), 'utf8'));
            keyDecipher.setAuthTag(Buffer.from(keyAuthTag, 'base64'));
            let dataKey = keyDecipher.update(Buffer.from(wrappedKey, 'base64'));
            dataKey = Buffer.concat([dataKey, keyDecipher.final()]);

            // Derive key using HKDF
            const derivedKey = crypto.hkdfSync('sha256', dataKey, Buffer.from(salt, 'base64'), this.masterKey, 32);

            // Create decipher
            const decipher = crypto.createDecipherGCM('aes-256-gcm', derivedKey);
            decipher.setAAD(Buffer.from(aad, 'base64'));
            decipher.setAuthTag(Buffer.from(authTag, 'base64'));

            // Decrypt
            let decrypted = decipher.update(Buffer.from(encrypted, 'base64'));
            decrypted = Buffer.concat([decrypted, decipher.final()]);

            return decrypted.toString('utf8');
        } catch (error) {
            throw new Error('Erro na descriptografia: ' + error.message);
        }
    }
}

module.exports = new Auth();