const express = require('express');
const router = express.Router();
const Auth = require('../../src/auth');
const db = require('../../src/database/database');

// Get all users (admin only)
router.get('/users', Auth.authenticateToken, Auth.authorizeRoles('admin'), (req, res) => {
    const database = db.getDb();
    
    database.all(`
        SELECT u.id, u.username, u.email, u.user_type, u.discount_percentage, u.created_at,
               p.username as parent_username
        FROM users u
        LEFT JOIN users p ON u.parent_id = p.id
        ORDER BY u.created_at DESC
    `, (err, users) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar usuários' });
        }
        res.json(users);
    });
});

// Get system statistics (admin only)
router.get('/statistics', Auth.authenticateToken, Auth.authorizeRoles('admin'), (req, res) => {
    const database = db.getDb();
    
    // Get user counts by type
    database.all(`
        SELECT user_type, COUNT(*) as count
        FROM users
        GROUP BY user_type
    `, (err, userStats) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar estatísticas' });
        }

        // Get contract statistics
        database.all(`
            SELECT status, COUNT(*) as count, SUM(net_value) as total_value
            FROM contracts
            GROUP BY status
        `, (err, contractStats) => {
            if (err) {
                return res.status(500).json({ error: 'Erro ao buscar estatísticas de contratos' });
            }

            res.json({
                users: userStats,
                contracts: contractStats
            });
        });
    });
});

// Update user discount (admin only)
router.put('/users/:id/discount', Auth.authenticateToken, Auth.authorizeRoles('admin'), (req, res) => {
    const { id } = req.params;
    const { discount_percentage } = req.body;

    if (discount_percentage < 0 || discount_percentage > 100) {
        return res.status(400).json({ error: 'Desconto deve estar entre 0 e 100%' });
    }

    const database = db.getDb();
    
    database.run(`
        UPDATE users SET discount_percentage = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [discount_percentage, id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar desconto' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }

        res.json({ message: 'Desconto atualizado com sucesso' });
    });
});

module.exports = router;