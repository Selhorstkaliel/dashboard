const express = require('express');
const router = express.Router();
const Auth = require('../../src/auth');
const db = require('../../src/database/database');

// Get representative's subordinates and clients
router.get('/subordinates', Auth.authenticateToken, Auth.authorizeRoles('representante'), (req, res) => {
    Auth.getUserHierarchy(req.user.id, (err, hierarchy) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar subordinados' });
        }
        res.json(hierarchy);
    });
});

// Get representative's contracts
router.get('/contracts', Auth.authenticateToken, Auth.authorizeRoles('representante'), (req, res) => {
    const database = db.getDb();
    
    database.all(`
        SELECT c.*, 
               cl.username as client_name, cl.email as client_email,
               s.username as seller_name, s.email as seller_email
        FROM contracts c
        JOIN users cl ON c.client_id = cl.id
        JOIN users s ON c.seller_id = s.id
        WHERE c.representative_id = ?
        ORDER BY c.created_at DESC
    `, [req.user.id], (err, contracts) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar contratos' });
        }
        res.json(contracts);
    });
});

module.exports = router;