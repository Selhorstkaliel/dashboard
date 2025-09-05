const express = require('express');
const router = express.Router();
const Auth = require('../../src/auth');
const db = require('../../src/database/database');

// Get user profile
router.get('/', Auth.authenticateToken, (req, res) => {
    const database = db.getDb();
    
    database.get(`
        SELECT id, username, email, user_type, discount_percentage, created_at
        FROM users WHERE id = ?
    `, [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar perfil' });
        }
        res.json(user);
    });
});

// Update profile
router.put('/', Auth.authenticateToken, (req, res) => {
    const { email } = req.body;
    const database = db.getDb();
    
    database.run(`
        UPDATE users SET email = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [email, req.user.id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar perfil' });
        }
        res.json({ message: 'Perfil atualizado com sucesso' });
    });
});

module.exports = router;