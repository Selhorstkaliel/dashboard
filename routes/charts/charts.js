const express = require('express');
const router = express.Router();
const Auth = require('../../src/auth');
const db = require('../../src/database/database');

// Get charts data based on user permissions
router.get('/users', Auth.authenticateToken, (req, res) => {
    const database = db.getDb();
    const userId = req.user.id;
    const userType = req.user.user_type;

    let query;
    let params;

    if (userType === 'admin') {
        // Admin sees all user statistics
        query = `
            SELECT user_type, COUNT(*) as count
            FROM users
            WHERE user_type != 'admin'
            GROUP BY user_type
        `;
        params = [];
    } else if (userType === 'representante') {
        // Representative sees their hierarchy statistics
        query = `
            WITH RECURSIVE subordinates AS (
                SELECT id, user_type FROM users WHERE parent_id = ?
                UNION ALL
                SELECT u.id, u.user_type FROM users u
                INNER JOIN subordinates s ON u.parent_id = s.id
            )
            SELECT user_type, COUNT(*) as count
            FROM subordinates
            GROUP BY user_type
        `;
        params = [userId];
    } else {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    database.all(query, params, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar dados do gráfico' });
        }
        res.json(data);
    });
});

// Get contracts chart data
router.get('/contracts', Auth.authenticateToken, (req, res) => {
    const database = db.getDb();
    const userId = req.user.id;
    const userType = req.user.user_type;

    let query;
    let params;

    if (userType === 'admin') {
        query = `
            SELECT status, COUNT(*) as count, SUM(net_value) as total_value
            FROM contracts
            GROUP BY status
        `;
        params = [];
    } else if (userType === 'representante') {
        query = `
            SELECT status, COUNT(*) as count, SUM(net_value) as total_value
            FROM contracts
            WHERE representative_id = ?
            GROUP BY status
        `;
        params = [userId];
    } else {
        return res.status(403).json({ error: 'Acesso negado' });
    }

    database.all(query, params, (err, data) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar dados de contratos' });
        }
        res.json(data);
    });
});

module.exports = router;