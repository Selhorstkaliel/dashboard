const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcryptjs');
const path = require('path');

let db = null;

const DB_PATH = process.env.DB_PATH || './db.sqlite';

// Inicializar o banco de dados
async function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log('📁 Conectado ao banco SQLite:', DB_PATH);
    });

    // Criar tabelas
    db.serialize(() => {
      // Tabela de usuários
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          role TEXT NOT NULL CHECK(role IN ('admin', 'representante', 'vendedor')),
          representative_id INTEGER,
          name TEXT NOT NULL,
          email TEXT,
          phone TEXT,
          discount_value REAL DEFAULT 0,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (representative_id) REFERENCES users(id)
        )
      `);

      // Tabela de cadastros (entries)
      db.run(`
        CREATE TABLE IF NOT EXISTS entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          type TEXT NOT NULL CHECK(type IN ('limpeza', 'rating')),
          doc TEXT NOT NULL,
          doc_type TEXT NOT NULL CHECK(doc_type IN ('cpf', 'cnpj')),
          nome TEXT NOT NULL,
          telefone TEXT,
          vendedor TEXT,
          valor_bruto REAL NOT NULL,
          desconto_aplicado REAL DEFAULT 0,
          valor_liquido REAL NOT NULL,
          status TEXT DEFAULT 'Restrição' CHECK(status IN ('Restrição', 'Finalizado', 'Reprotocolo')),
          contract_path TEXT,
          rating_subtype TEXT CHECK(rating_subtype IN ('PF', 'PJ')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          encrypted_json BLOB,
          wrapped_key BLOB,
          iv BLOB,
          auth_tag BLOB,
          aad BLOB,
          salt BLOB,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Tabela de anexos
      db.run(`
        CREATE TABLE IF NOT EXISTS attachments (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          entry_id INTEGER NOT NULL,
          path TEXT NOT NULL,
          mime TEXT NOT NULL,
          original_name TEXT NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (entry_id) REFERENCES entries(id)
        )
      `);

      // Tabela de tickets de suporte
      db.run(`
        CREATE TABLE IF NOT EXISTS tickets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER NOT NULL,
          titulo TEXT NOT NULL,
          descricao TEXT NOT NULL,
          attachment_path TEXT,
          status TEXT DEFAULT 'aberto' CHECK(status IN ('aberto', 'em_andamento', 'fechado')),
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (user_id) REFERENCES users(id)
        )
      `);

      // Criar índices
      db.run('CREATE INDEX IF NOT EXISTS idx_entries_user_id ON entries(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at)');
      db.run('CREATE INDEX IF NOT EXISTS idx_entries_status ON entries(status)');
      db.run('CREATE INDEX IF NOT EXISTS idx_entries_type ON entries(type)');
      db.run('CREATE INDEX IF NOT EXISTS idx_users_representative_id ON users(representative_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_tickets_user_id ON tickets(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_attachments_entry_id ON attachments(entry_id)');

      // Verificar se usuário admin existe, senão criar
      db.get('SELECT id FROM users WHERE username = ?', ['Kaliel'], async (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (!row) {
          // Criar usuário admin seed
          const passwordHash = await bcrypt.hash('kaskolk14', 12);
          
          db.run(`
            INSERT INTO users (username, password_hash, role, name, email, phone) 
            VALUES (?, ?, ?, ?, ?, ?)
          `, 
          ['Kaliel', passwordHash, 'admin', 'Kaliel Admin', 'admin@limitclean.com', '11999999999'], 
          function(err) {
            if (err) {
              reject(err);
              return;
            }
            console.log('👤 Usuário admin criado - Login: Kaliel | Senha: kaskolk14');
            resolve();
          });
        } else {
          console.log('👤 Usuário admin já existe');
          resolve();
        }
      });
    });
  });
}

// Obter instância do banco
function getDb() {
  if (!db) {
    throw new Error('Banco de dados não inicializado. Chame initDatabase() primeiro.');
  }
  return db;
}

// Fechar conexão
function closeDatabase() {
  return new Promise((resolve) => {
    if (db) {
      db.close((err) => {
        if (err) {
          console.error('Erro ao fechar banco:', err);
        } else {
          console.log('📁 Banco de dados fechado');
        }
        resolve();
      });
    } else {
      resolve();
    }
  });
}

module.exports = {
  initDatabase,
  getDb,
  closeDatabase
};