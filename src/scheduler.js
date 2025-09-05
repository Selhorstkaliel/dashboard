const { getDb } = require('./database');

// Atualizar status dos cadastros automaticamente
function updateStatus() {
  const db = getDb();
  const now = new Date();
  
  console.log('🔄 Executando atualização automática de status...');

  // Atualizar para "Finalizado" após 30 dias
  db.run(`
    UPDATE entries 
    SET status = 'Finalizado', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'Restrição' 
    AND date(created_at, '+30 days') <= date('now')
  `, function(err) {
    if (err) {
      console.error('Erro ao atualizar para Finalizado:', err);
    } else if (this.changes > 0) {
      console.log(`✅ ${this.changes} registro(s) atualizados para "Finalizado"`);
    }
  });

  // Atualizar para "Reprotocolo" após 6 meses
  db.run(`
    UPDATE entries 
    SET status = 'Reprotocolo', updated_at = CURRENT_TIMESTAMP
    WHERE status = 'Finalizado' 
    AND date(created_at, '+6 months') <= date('now')
  `, function(err) {
    if (err) {
      console.error('Erro ao atualizar para Reprotocolo:', err);
    } else if (this.changes > 0) {
      console.log(`✅ ${this.changes} registro(s) atualizados para "Reprotocolo"`);
    }
  });
}

// Obter estatísticas dos status
function getStatusStats() {
  return new Promise((resolve, reject) => {
    const db = getDb();
    
    db.all(`
      SELECT 
        status,
        COUNT(*) as count,
        COUNT(CASE WHEN type = 'limpeza' THEN 1 END) as limpeza_count,
        COUNT(CASE WHEN type = 'rating' THEN 1 END) as rating_count
      FROM entries 
      GROUP BY status
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

// Verificar cadastros que precisam de atualização
function getUpcomingUpdates() {
  return new Promise((resolve, reject) => {
    const db = getDb();
    
    db.all(`
      SELECT 
        id, nome, doc, status, created_at,
        CASE 
          WHEN status = 'Restrição' AND date(created_at, '+30 days') <= date('now', '+7 days') 
          THEN 'Será finalizado em ' || (julianday(date(created_at, '+30 days')) - julianday(date('now'))) || ' dias'
          WHEN status = 'Finalizado' AND date(created_at, '+6 months') <= date('now', '+30 days')
          THEN 'Será reprotocolado em ' || (julianday(date(created_at, '+6 months')) - julianday(date('now'))) || ' dias'
        END as next_update
      FROM entries 
      WHERE (
        (status = 'Restrição' AND date(created_at, '+30 days') <= date('now', '+7 days'))
        OR 
        (status = 'Finalizado' AND date(created_at, '+6 months') <= date('now', '+30 days'))
      )
      ORDER BY created_at
    `, (err, rows) => {
      if (err) {
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}

module.exports = {
  updateStatus,
  getStatusStats,
  getUpcomingUpdates
};