const express = require('express');
const router = express.Router();
const Auth = require('../../src/auth');
const db = require('../../src/database/database');

// Get all tickets for admin or user's own tickets
router.get('/', Auth.authenticateToken, (req, res) => {
    const database = db.getDb();
    const userId = req.user.id;
    const userType = req.user.user_type;

    let query;
    let params;

    if (userType === 'admin') {
        query = `
            SELECT t.*, u.username, u.email
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            ORDER BY t.created_at DESC
        `;
        params = [];
    } else {
        query = `
            SELECT t.*, u.username, u.email
            FROM tickets t
            JOIN users u ON t.user_id = u.id
            WHERE t.user_id = ?
            ORDER BY t.created_at DESC
        `;
        params = [userId];
    }

    database.all(query, params, (err, tickets) => {
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar tickets' });
        }
        res.json(tickets);
    });
});

// Create new ticket
router.post('/', Auth.authenticateToken, (req, res) => {
    const { subject, message, priority = 'medium' } = req.body;
    const userId = req.user.id;

    if (!subject || !message) {
        return res.status(400).json({ error: 'Assunto e mensagem são obrigatórios' });
    }

    const database = db.getDb();
    
    database.run(`
        INSERT INTO tickets (user_id, subject, message, priority)
        VALUES (?, ?, ?, ?)
    `, [userId, subject, message, priority], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao criar ticket' });
        }

        res.status(201).json({
            message: 'Ticket criado com sucesso',
            ticket: {
                id: this.lastID,
                subject,
                message,
                priority,
                status: 'open'
            }
        });
    });
});

// Update ticket status (admin only)
router.put('/:id/status', Auth.authenticateToken, Auth.authorizeRoles('admin'), (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    const validStatuses = ['open', 'in_progress', 'resolved', 'closed'];
    if (!validStatuses.includes(status)) {
        return res.status(400).json({ error: 'Status inválido' });
    }

    const database = db.getDb();
    
    database.run(`
        UPDATE tickets SET status = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `, [status, id], function(err) {
        if (err) {
            return res.status(500).json({ error: 'Erro ao atualizar ticket' });
        }

        if (this.changes === 0) {
            return res.status(404).json({ error: 'Ticket não encontrado' });
        }

        res.json({ message: 'Status do ticket atualizado com sucesso' });
    });
});

module.exports = router;