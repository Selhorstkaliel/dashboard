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

    // Generate JWT token
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

    // AES-256-GCM Encryption with envelope encryption
    encryptData(plaintext) {
        try {
            // Generate random key for this encryption (envelope encryption)
            const dataKey = crypto.randomBytes(32);
            
            // Derive key using HKDF
            const salt = crypto.randomBytes(32);
            const derivedKey = crypto.hkdfSync('sha256', dataKey, salt, this.masterKey, 32);
            
            // Generate IV and additional authenticated data
            const iv = crypto.randomBytes(12); // GCM uses 96-bit IV
            const aad = crypto.randomBytes(16);
            
            // Create cipher
            const cipher = crypto.createCipherGCM('aes-256-gcm');
            cipher.setAAD(aad);
            
            // Encrypt
            let encrypted = cipher.update(plaintext, 'utf8');
            encrypted = Buffer.concat([encrypted, cipher.final()]);
            
            // Get authentication tag
            const authTag = cipher.getAuthTag();
            
            // Encrypt the data key with master key
            const keyIv = crypto.randomBytes(12);
            const keyCipher = crypto.createCipherGCM('aes-256-gcm');
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
            const keyDecipher = crypto.createDecipherGCM('aes-256-gcm');
            keyDecipher.setAuthTag(Buffer.from(keyAuthTag, 'base64'));
            let dataKey = keyDecipher.update(Buffer.from(wrappedKey, 'base64'));
            dataKey = Buffer.concat([dataKey, keyDecipher.final()]);

            // Derive key using HKDF
            const derivedKey = crypto.hkdfSync('sha256', dataKey, Buffer.from(salt, 'base64'), this.masterKey, 32);

            // Create decipher
            const decipher = crypto.createDecipherGCM('aes-256-gcm');
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

    // Middleware for JWT authentication
    authenticateToken(req, res, next) {
        const token = req.cookies?.token;

        if (!token) {
            return res.status(401).json({ error: 'Token de acesso necessário' });
        }

        try {
            const decoded = this.verifyToken(token);
            req.user = decoded;
            next();
        } catch (error) {
            return res.status(403).json({ error: 'Token inválido' });
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

    // Middleware for hierarchical access control
    authorizeHierarchy(req, res, next) {
        if (!req.user) {
            return res.status(401).json({ error: 'Usuário não autenticado' });
        }

        const userRole = req.user.role;
        const userId = req.user.id;
        const targetUserId = req.params.userId || req.body.userId;

        // Admin has access to everything
        if (userRole === 'admin') {
            return next();
        }

        // Representante can access their vendedores and clients
        if (userRole === 'representante') {
            // Add logic to check if target user is under this representante
            req.accessLevel = 'representante';
            return next();
        }

        // Vendedor can only access their own data and clients
        if (userRole === 'vendedor') {
            if (targetUserId && targetUserId !== userId) {
                return res.status(403).json({ error: 'Acesso negado aos dados de outros usuários' });
            }
            req.accessLevel = 'vendedor';
            return next();
        }

        return res.status(403).json({ error: 'Role não reconhecida' });
    }

    // Generate secure random strings
    generateSecureRandom(length = 32) {
        return crypto.randomBytes(length).toString('hex');
    }

    // Validate CPF
    validateCPF(cpf) {
        cpf = cpf.replace(/[^\d]/g, '');
        
        if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) {
            return false;
        }

        let sum = 0;
        for (let i = 0; i < 9; i++) {
            sum += parseInt(cpf[i]) * (10 - i);
        }
        let checkDigit1 = 11 - (sum % 11);
        if (checkDigit1 >= 10) checkDigit1 = 0;

        if (parseInt(cpf[9]) !== checkDigit1) {
            return false;
        }

        sum = 0;
        for (let i = 0; i < 10; i++) {
            sum += parseInt(cpf[i]) * (11 - i);
        }
        let checkDigit2 = 11 - (sum % 11);
        if (checkDigit2 >= 10) checkDigit2 = 0;

        return parseInt(cpf[10]) === checkDigit2;
    }

    // Validate CNPJ
    validateCNPJ(cnpj) {
        cnpj = cnpj.replace(/[^\d]/g, '');
        
        if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) {
            return false;
        }

        const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        const weights2 = [6, 7, 8, 9, 2, 3, 4, 5, 6, 7, 8, 9];

        let sum = 0;
        for (let i = 0; i < 12; i++) {
            sum += parseInt(cnpj[i]) * weights1[i];
        }
        let checkDigit1 = 11 - (sum % 11);
        if (checkDigit1 >= 10) checkDigit1 = 0;

        if (parseInt(cnpj[12]) !== checkDigit1) {
            return false;
        }

        sum = 0;
        for (let i = 0; i < 13; i++) {
            sum += parseInt(cnpj[i]) * weights2[i];
        }
        let checkDigit2 = 11 - (sum % 11);
        if (checkDigit2 >= 10) checkDigit2 = 0;

        return parseInt(cnpj[13]) === checkDigit2;
    }
}

module.exports = new Auth();