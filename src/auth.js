const jwt = require('jsonwebtoken');
const { getDb } = require('./database');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_key';

// Middleware para autenticação obrigatória
function requireAuth(req, res, next) {
  const token = req.cookies.auth_token;
  
  if (!token) {
    return res.status(401).json({ error: 'Token de acesso necessário' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

// Middleware para autenticação opcional (usado nas rotas da API)
function optionalAuth(req, res, next) {
  const token = req.cookies.auth_token;
  
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (error) {
      // Token inválido, mas continuamos sem autenticação
      req.user = null;
    }
  } else {
    req.user = null;
  }
  
  next();
}

// Middleware para verificar roles específicas
function requireRole(roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Autenticação necessária' });
    }

    const userRoles = Array.isArray(roles) ? roles : [roles];
    
    if (!userRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Permissão insuficiente' });
    }

    next();
  };
}

// Middleware para verificar se usuário pode acessar dados de outro usuário
function canAccessUser(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const targetUserId = req.params.userId || req.body.userId || req.query.userId;
  
  // Admin pode acessar qualquer usuário
  if (req.user.role === 'admin') {
    return next();
  }

  // Representante pode acessar seus vendedores
  if (req.user.role === 'representante') {
    if (targetUserId) {
      // Verificar se o usuário alvo é vendedor do representante
      const db = getDb();
      db.get(
        'SELECT id FROM users WHERE id = ? AND representative_id = ?',
        [targetUserId, req.user.id],
        (err, row) => {
          if (err) {
            return res.status(500).json({ error: 'Erro interno' });
          }
          if (!row) {
            return res.status(403).json({ error: 'Acesso negado' });
          }
          next();
        }
      );
      return;
    }
    return next();
  }

  // Vendedor só pode acessar próprios dados
  if (req.user.role === 'vendedor') {
    if (targetUserId && parseInt(targetUserId) !== req.user.id) {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    return next();
  }

  return res.status(403).json({ error: 'Acesso negado' });
}

// Middleware para verificar acesso a cadastros
function canAccessEntry(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Autenticação necessária' });
  }

  const entryId = req.params.id;
  
  // Admin pode acessar qualquer cadastro
  if (req.user.role === 'admin') {
    return next();
  }

  if (!entryId) {
    // Para listagem, usar filtros por role
    return next();
  }

  const db = getDb();
  
  // Verificar se o usuário pode acessar este cadastro
  db.get(
    `SELECT e.*, u.representative_id 
     FROM entries e 
     JOIN users u ON e.user_id = u.id 
     WHERE e.id = ?`,
    [entryId],
    (err, entry) => {
      if (err) {
        return res.status(500).json({ error: 'Erro interno' });
      }
      
      if (!entry) {
        return res.status(404).json({ error: 'Cadastro não encontrado' });
      }

      // Vendedor só pode acessar seus próprios cadastros
      if (req.user.role === 'vendedor' && entry.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      // Representante pode acessar cadastros de seus vendedores
      if (req.user.role === 'representante' && entry.representative_id !== req.user.id) {
        return res.status(403).json({ error: 'Acesso negado' });
      }

      req.entry = entry;
      next();
    }
  );
}

// Gerar token JWT
function generateToken(user) {
  const payload = {
    id: user.id,
    username: user.username,
    role: user.role,
    name: user.name,
    representative_id: user.representative_id
  };

  return jwt.sign(payload, JWT_SECRET, { expiresIn: '8h' });
}

// Verificar se token está válido
function verifyToken(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
}

module.exports = {
  requireAuth,
  optionalAuth,
  requireRole,
  canAccessUser,
  canAccessEntry,
  generateToken,
  verifyToken
};