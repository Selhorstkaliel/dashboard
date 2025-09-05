const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('./database/database');

class Auth {
    static generateToken(payload) {
        return jwt.sign(payload, process.env.JWT_SECRET || 'default_secret', { expiresIn: '24h' });
    }

    static verifyToken(token) {
        try {
            return jwt.verify(token, process.env.JWT_SECRET || 'default_secret');
        } catch (error) {
            return null;
        }
    }

    static async hashPassword(password) {
        return await bcrypt.hash(password, 10);
    }

    static async comparePassword(password, hash) {
        return await bcrypt.compare(password, hash);
    }

    static authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ error: 'Token de acesso requerido' });
        }

        const decoded = Auth.verifyToken(token);
        if (!decoded) {
            return res.status(403).json({ error: 'Token inválido' });
        }

        req.user = decoded;
        next();
    }

    static authorizeRoles(...roles) {
        return (req, res, next) => {
            if (!roles.includes(req.user.user_type)) {
                return res.status(403).json({ error: 'Acesso negado' });
            }
            next();
        };
    }

    static getUserHierarchy(userId, callback) {
        const database = db.getDb();
        
        // Get user with their parent information
        database.get(`
            SELECT u.*, p.username as parent_username, p.user_type as parent_type
            FROM users u
            LEFT JOIN users p ON u.parent_id = p.id
            WHERE u.id = ?
        `, [userId], (err, user) => {
            if (err) {
                return callback(err, null);
            }
            
            if (!user) {
                return callback(new Error('Usuário não encontrado'), null);
            }

            // Get all children (subordinates)
            database.all(`
                WITH RECURSIVE subordinates AS (
                    SELECT id, username, email, user_type, parent_id, discount_percentage, created_at
                    FROM users
                    WHERE parent_id = ?
                    UNION ALL
                    SELECT u.id, u.username, u.email, u.user_type, u.parent_id, u.discount_percentage, u.created_at
                    FROM users u
                    INNER JOIN subordinates s ON u.parent_id = s.id
                )
                SELECT * FROM subordinates
            `, [userId], (err, subordinates) => {
                if (err) {
                    return callback(err, null);
                }

                callback(null, {
                    user: user,
                    subordinates: subordinates || []
                });
            });
        });
    }

    static canUserRegister(parentType, newUserType) {
        const permissions = {
            'admin': ['representante', 'vendedor'],
            'representante': ['vendedor', 'cliente'],
            'vendedor': ['cliente']
        };

        return permissions[parentType] && permissions[parentType].includes(newUserType);
    }
}

module.exports = Auth;