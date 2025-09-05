const express = require('express');
const router = express.Router();
const Auth = require('../../src/auth');
const db = require('../../src/database/database');

// Get entries based on user type and permissions
router.get('/', Auth.authenticateToken, (req, res) => {
    const database = db.getDb();
    const userId = req.user.id;
    const userType = req.user.user_type;

    let query;
    let params;

    switch (userType) {
        case 'admin':
            // Admin sees all users
            query = `
                SELECT u.id, u.username, u.email, u.user_type, u.discount_percentage, u.created_at,
                       p.username as parent_username
                FROM users u
                LEFT JOIN users p ON u.parent_id = p.id
                WHERE u.user_type != 'admin'
                ORDER BY u.created_at DESC
            `;
            params = [];
            break;
        
        case 'representante':
            // Representative sees their subordinates
            query = `
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
                ORDER BY created_at DESC
            `;
            params = [userId];
            break;
        
        case 'vendedor':
            // Seller sees only their clients
            query = `
                SELECT id, username, email, user_type, discount_percentage, created_at
                FROM users
                WHERE parent_id = ? AND user_type = 'cliente'
                ORDER BY created_at DESC
            `;
            params = [userId];
            break;
        
        default:
            return res.status(403).json({ error: 'Acesso negado' });
    }

    database.all(query, params, (err, entries) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar entradas' });
        }
        res.json(entries);
    });
});

module.exports = router;