const express = require('express');
const bcrypt = require('bcryptjs');
const { getDb } = require('../database');
const { generateToken, requireAuth } = require('../auth');

const router = express.Router();

// Login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username e senha são obrigatórios' });
    }

    const db = getDb();
    
    db.get(
      'SELECT * FROM users WHERE username = ?',
      [username],
      async (err, user) => {
        if (err) {
          console.error('Erro no login:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }

        if (!user) {
          return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        
        if (!isValidPassword) {
          return res.status(401).json({ error: 'Credenciais inválidas' });
        }

        // Gerar token
        const token = generateToken(user);

        // Configurar cookie httpOnly
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 8 * 60 * 60 * 1000 // 8 horas
        };

        res.cookie('auth_token', token, cookieOptions);

        res.json({
          success: true,
          user: {
            id: user.id,
            username: user.username,
            role: user.role,
            name: user.name,
            email: user.email,
            phone: user.phone
          }
        });
      }
    );
  } catch (error) {
    console.error('Erro no login:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax'
  });
  
  res.json({ success: true });
});

// Verificar autenticação atual
router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  
  db.get(
    'SELECT id, username, role, name, email, phone, representative_id, discount_value FROM users WHERE id = ?',
    [req.user.id],
    (err, user) => {
      if (err) {
        console.error('Erro ao buscar usuário:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }

      if (!user) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }

      res.json(user);
    }
  );
});

module.exports = router;