const express = require('express');
const { getDb } = require('../database');
const { requireAuth } = require('../auth');

const router = express.Router();

// Get dashboard statistics
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    
    // Build role-based query constraints
    let whereClause = '';
    const params = [];
    
    if (req.user.role === 'vendedor') {
      whereClause = 'WHERE e.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'representante') {
      whereClause = 'WHERE u.representative_id = ?';
      params.push(req.user.id);
    }
    // Admin sees all data
    
    const query = `
      SELECT 
        COUNT(CASE WHEN e.type = 'limpeza' THEN 1 END) as limpezas_count,
        COUNT(CASE WHEN e.type = 'rating' THEN 1 END) as ratings_count,
        COALESCE(SUM(e.valor_bruto), 0) as total_bruto,
        COALESCE(SUM(e.valor_liquido), 0) as total_liquido,
        COUNT(*) as total_entries,
        COUNT(CASE WHEN e.status = 'Restrição' THEN 1 END) as restricao_count,
        COUNT(CASE WHEN e.status = 'Finalizado' THEN 1 END) as finalizado_count,
        COUNT(CASE WHEN e.status = 'Reprotocolo' THEN 1 END) as reprotocolo_count
      FROM entries e
      JOIN users u ON e.user_id = u.id
      ${whereClause}
    `;
    
    db.get(query, params, (err, stats) => {
      if (err) {
        console.error('Error fetching stats:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      res.json({
        limpezas_count: stats.limpezas_count || 0,
        ratings_count: stats.ratings_count || 0,
        total_bruto: stats.total_bruto || 0,
        total_liquido: stats.total_liquido || 0,
        total_entries: stats.total_entries || 0,
        status_breakdown: {
          restricao: stats.restricao_count || 0,
          finalizado: stats.finalizado_count || 0,
          reprotocolo: stats.reprotocolo_count || 0
        }
      });
    });
  } catch (error) {
    console.error('Error in GET /stats:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get period-specific statistics
router.get('/period', requireAuth, (req, res) => {
  try {
    const { year, month, half } = req.query;
    const db = getDb();
    
    // Build date filter
    let dateFilter = '';
    const params = [];
    
    if (year) {
      dateFilter += " AND strftime('%Y', e.created_at) = ?";
      params.push(year);
    }
    
    if (month) {
      dateFilter += " AND strftime('%m', e.created_at) = ?";
      params.push(month.padStart(2, '0'));
    }
    
    if (half && month && year) {
      if (half === '1') {
        dateFilter += " AND strftime('%d', e.created_at) BETWEEN '01' AND '15'";
      } else if (half === '2') {
        dateFilter += " AND strftime('%d', e.created_at) >= '16'";
      }
    }
    
    // Build role-based query constraints
    let whereClause = `WHERE 1=1 ${dateFilter}`;
    
    if (req.user.role === 'vendedor') {
      whereClause += ' AND e.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'representante') {
      whereClause += ' AND u.representative_id = ?';
      params.push(req.user.id);
    }
    
    const query = `
      SELECT 
        COUNT(CASE WHEN e.type = 'limpeza' THEN 1 END) as limpezas_count,
        COUNT(CASE WHEN e.type = 'rating' THEN 1 END) as ratings_count,
        COALESCE(SUM(e.valor_bruto), 0) as total_bruto,
        COALESCE(SUM(e.valor_liquido), 0) as total_liquido,
        COUNT(*) as total_entries
      FROM entries e
      JOIN users u ON e.user_id = u.id
      ${whereClause}
    `;
    
    db.get(query, params, (err, stats) => {
      if (err) {
        console.error('Error fetching period stats:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      res.json({
        period: { year, month, half },
        limpezas_count: stats.limpezas_count || 0,
        ratings_count: stats.ratings_count || 0,
        total_bruto: stats.total_bruto || 0,
        total_liquido: stats.total_liquido || 0,
        total_entries: stats.total_entries || 0
      });
    });
  } catch (error) {
    console.error('Error in GET /stats/period:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get top performers (for admin/representative)
router.get('/performers', requireAuth, (req, res) => {
  try {
    // Only admin and representatives can see this
    if (req.user.role === 'vendedor') {
      return res.status(403).json({ error: 'Acesso negado' });
    }
    
    const db = getDb();
    let whereClause = '';
    const params = [];
    
    if (req.user.role === 'representante') {
      whereClause = 'WHERE u.representative_id = ?';
      params.push(req.user.id);
    }
    
    const query = `
      SELECT 
        u.name,
        u.username,
        COUNT(e.id) as total_entries,
        COUNT(CASE WHEN e.type = 'limpeza' THEN 1 END) as limpezas,
        COUNT(CASE WHEN e.type = 'rating' THEN 1 END) as ratings,
        COALESCE(SUM(e.valor_bruto), 0) as total_bruto,
        COALESCE(SUM(e.valor_liquido), 0) as total_liquido
      FROM users u
      LEFT JOIN entries e ON u.id = e.user_id
      ${whereClause}
      GROUP BY u.id, u.name, u.username
      HAVING total_entries > 0
      ORDER BY total_liquido DESC
      LIMIT 10
    `;
    
    db.all(query, params, (err, performers) => {
      if (err) {
        console.error('Error fetching performers:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      res.json(performers || []);
    });
  } catch (error) {
    console.error('Error in GET /stats/performers:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;