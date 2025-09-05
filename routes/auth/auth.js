const express = require('express');
const router = express.Router();
const Auth = require('../../src/auth');
const db = require('../../src/database/database');

// Login route
router.post('/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Username e senha são obrigatórios' });
    }

    const database = db.getDb();
    
    database.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
        if (err) {
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        if (!user) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const isValidPassword = await Auth.comparePassword(password, user.password_hash);
        if (!isValidPassword) {
            return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const token = Auth.generateToken({
            id: user.id,
            username: user.username,
            email: user.email,
            user_type: user.user_type,
            parent_id: user.parent_id
        });

        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                user_type: user.user_type,
                discount_percentage: user.discount_percentage
            }
        });
    });
});

// Register route
router.post('/register', Auth.authenticateToken, async (req, res) => {
    const { username, email, password, user_type, discount_percentage = 0 } = req.body;
    const parentUser = req.user;

    // Validate required fields
    if (!username || !email || !password || !user_type) {
        return res.status(400).json({ error: 'Todos os campos são obrigatórios' });
    }

    // Check if parent can register this user type
    if (!Auth.canUserRegister(parentUser.user_type, user_type)) {
        return res.status(403).json({ 
            error: `${parentUser.user_type} não pode registrar usuário do tipo ${user_type}` 
        });
    }

    try {
        const passwordHash = await Auth.hashPassword(password);
        const database = db.getDb();

        database.run(`
            INSERT INTO users (username, email, password_hash, user_type, parent_id, discount_percentage)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [username, email, passwordHash, user_type, parentUser.id, discount_percentage], function(err) {
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT') {
                    return res.status(409).json({ error: 'Username ou email já existem' });
                }
                return res.status(500).json({ error: 'Erro ao criar usuário' });
            }

            res.status(201).json({
                message: 'Usuário criado com sucesso',
                user: {
                    id: this.lastID,
                    username,
                    email,
                    user_type,
                    discount_percentage
                }
            });
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Validate token route
router.get('/validate', Auth.authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

module.exports = router;