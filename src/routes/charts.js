const express = require('express');
const { getDb } = require('../database');
const { requireAuth } = require('../auth');

const router = express.Router();

// Get vendas (limpezas) chart data
router.get('/vendas', requireAuth, (req, res) => {
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
    let whereClause = `WHERE e.type = 'limpeza' ${dateFilter}`;
    
    if (req.user.role === 'vendedor') {
      whereClause += ' AND e.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'representante') {
      whereClause += ' AND u.representative_id = ?';
      params.push(req.user.id);
    }
    
    // Group by period based on filters
    let groupBy;
    let selectPeriod;
    
    if (year && month && half) {
      // Group by day within the half-month
      groupBy = "strftime('%Y-%m-%d', e.created_at)";
      selectPeriod = "strftime('%d', e.created_at) as period_label";
    } else if (year && month) {
      // Group by day within month
      groupBy = "strftime('%Y-%m-%d', e.created_at)";
      selectPeriod = "strftime('%d', e.created_at) as period_label";
    } else if (year) {
      // Group by month within year
      groupBy = "strftime('%Y-%m', e.created_at)";
      selectPeriod = "strftime('%m', e.created_at) as period_label";
    } else {
      // Group by month for last 12 months
      groupBy = "strftime('%Y-%m', e.created_at)";
      selectPeriod = "strftime('%Y-%m', e.created_at) as period_label";
      whereClause += " AND e.created_at >= date('now', '-12 months')";
    }
    
    const query = `
      SELECT 
        ${selectPeriod},
        ${groupBy} as ym,
        COUNT(*) as count
      FROM entries e
      JOIN users u ON e.user_id = u.id
      ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY ym
    `;
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching vendas chart data:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      // Format data for Chart.js
      const chartData = (rows || []).map(row => ({
        label: formatPeriodLabel(row.period_label, { year, month, half }),
        ym: row.ym,
        count: row.count
      }));
      
      res.json(chartData);
    });
  } catch (error) {
    console.error('Error in GET /charts/vendas:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get rating chart data
router.get('/rating', requireAuth, (req, res) => {
  try {
    const { year, month, half } = req.query;
    const db = getDb();
    
    // Build date filter (same as vendas)
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
    let whereClause = `WHERE e.type = 'rating' ${dateFilter}`;
    
    if (req.user.role === 'vendedor') {
      whereClause += ' AND e.user_id = ?';
      params.push(req.user.id);
    } else if (req.user.role === 'representante') {
      whereClause += ' AND u.representative_id = ?';
      params.push(req.user.id);
    }
    
    // Group by period (same logic as vendas)
    let groupBy;
    let selectPeriod;
    
    if (year && month && half) {
      groupBy = "strftime('%Y-%m-%d', e.created_at)";
      selectPeriod = "strftime('%d', e.created_at) as period_label";
    } else if (year && month) {
      groupBy = "strftime('%Y-%m-%d', e.created_at)";
      selectPeriod = "strftime('%d', e.created_at) as period_label";
    } else if (year) {
      groupBy = "strftime('%Y-%m', e.created_at)";
      selectPeriod = "strftime('%m', e.created_at) as period_label";
    } else {
      groupBy = "strftime('%Y-%m', e.created_at)";
      selectPeriod = "strftime('%Y-%m', e.created_at) as period_label";
      whereClause += " AND e.created_at >= date('now', '-12 months')";
    }
    
    const query = `
      SELECT 
        ${selectPeriod},
        ${groupBy} as ym,
        COUNT(CASE WHEN e.status = 'Finalizado' THEN 1 END) as feito,
        COUNT(CASE WHEN e.status != 'Finalizado' THEN 1 END) as nao_feito
      FROM entries e
      JOIN users u ON e.user_id = u.id
      ${whereClause}
      GROUP BY ${groupBy}
      ORDER BY ym
    `;
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching rating chart data:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      // Format data for Chart.js
      const chartData = (rows || []).map(row => ({
        label: formatPeriodLabel(row.period_label, { year, month, half }),
        ym: row.ym,
        feito: row.feito,
        nao_feito: row.nao_feito
      }));
      
      res.json(chartData);
    });
  } catch (error) {
    console.error('Error in GET /charts/rating:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Helper function to format period labels
function formatPeriodLabel(periodValue, filters) {
  if (!periodValue) return '';
  
  const { year, month, half } = filters;
  
  if (year && month && half) {
    // Day within half-month
    return `Dia ${periodValue}`;
  } else if (year && month) {
    // Day within month
    return `Dia ${periodValue}`;
  } else if (year) {
    // Month within year
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    const monthIndex = parseInt(periodValue) - 1;
    return monthNames[monthIndex] || periodValue;
  } else {
    // Year-Month for last 12 months
    const [yearPart, monthPart] = periodValue.split('-');
    const monthNames = [
      'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
      'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
    ];
    const monthIndex = parseInt(monthPart) - 1;
    return `${monthNames[monthIndex]} ${yearPart}`;
  }
}

module.exports = router;