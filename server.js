const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const cookieParser = require('cookie-parser');
const compression = require('compression');
const multer = require('multer');
const crypto = require('crypto');

// Import custom modules
const auth = require('./src/auth');
const contractGenerator = require('./src/contrato');
const scheduler = require('./src/scheduler');
const validators = require('./src/validators');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Database setup
const DB_PATH = path.join(__dirname, 'db.sqlite');

// Initialize database
function initializeDatabase() {
    const db = new sqlite3.Database(DB_PATH);

    db.serialize(() => {
        // Users table
        db.run(`CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username VARCHAR(50) UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            role VARCHAR(20) NOT NULL DEFAULT 'vendedor',
            rep_id INTEGER,
            name VARCHAR(100) NOT NULL,
            email VARCHAR(100) NOT NULL,
            phone VARCHAR(20) NOT NULL,
            discount_value REAL DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (rep_id) REFERENCES users(id)
        )`);

        // Entries table
        db.run(`CREATE TABLE IF NOT EXISTS entries (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            type VARCHAR(20) NOT NULL,
            doc VARCHAR(20) NOT NULL,
            doc_type VARCHAR(10) NOT NULL,
            nome VARCHAR(200) NOT NULL,
            telefone VARCHAR(20) NOT NULL,
            vendedor VARCHAR(100) NOT NULL,
            valor_bruto REAL NOT NULL,
            desconto_aplicado REAL NOT NULL,
            valor_liquido REAL NOT NULL,
            status VARCHAR(20) DEFAULT 'pendente',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            encrypted_json TEXT,
            wrapped_key TEXT,
            iv TEXT,
            auth_tag TEXT,
            aad TEXT,
            salt TEXT,
            contract_filename VARCHAR(255),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Attachments table
        db.run(`CREATE TABLE IF NOT EXISTS attachments (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            entry_id INTEGER NOT NULL,
            filename VARCHAR(255) NOT NULL,
            original_name VARCHAR(255) NOT NULL,
            mimetype VARCHAR(100) NOT NULL,
            size INTEGER NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (entry_id) REFERENCES entries(id)
        )`);

        // Tickets table
        db.run(`CREATE TABLE IF NOT EXISTS tickets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            titulo VARCHAR(200) NOT NULL,
            descricao TEXT NOT NULL,
            categoria VARCHAR(50) DEFAULT 'geral',
            status VARCHAR(20) DEFAULT 'aberto',
            attachment_path VARCHAR(255),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )`);

        // Create default admin user
        const adminHash = auth.hashPassword('kaskolk14');
        adminHash.then(hash => {
            db.run(`INSERT OR IGNORE INTO users (username, password_hash, role, name, email, phone) 
                    VALUES (?, ?, 'admin', 'Kaliel', 'kaliel@limitclean.com', '(11) 99999-9999')`, 
                ['Kaliel', hash]);
        });
    });

    db.close();
    console.log('Database initialized successfully');
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://cdnjs.cloudflare.com"],
            scriptSrc: ["'self'", "https://cdnjs.cloudflare.com", "https://cdn.jsdelivr.net"],
            imgSrc: ["'self'", "data:", "blob:"],
            connectSrc: ["'self'"],
            fontSrc: ["'self'", "https://cdnjs.cloudflare.com"],
        },
    },
}));

app.use(cors({
    origin: process.env.ORIGIN || 'http://localhost:3000',
    credentials: true
}));

app.use(compression());
app.use(hpp());
app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Muitas requisições deste IP, tente novamente em 15 minutos.'
});

const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5, // limit each IP to 5 login attempts per 15 minutes
    message: 'Muitas tentativas de login, tente novamente em 15 minutos.'
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// File upload configuration
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + crypto.randomUUID();
        cb(null, uniqueSuffix + path.extname(file.originalname));
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    },
    fileFilter: function (req, file, cb) {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Tipo de arquivo não permitido'));
        }
    }
});

// Serve static files
app.use(express.static('public'));

// Authentication routes
app.post('/api/auth/login', async (req, res) => {
    try {
        const { error, value } = validators.validateUserLogin(req.body);
        if (error) {
            return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
        }

        const { username, password } = value;
        const db = new sqlite3.Database(DB_PATH);

        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                db.close();
                return res.status(500).json({ error: 'Erro interno do servidor' });
            }

            if (!user) {
                db.close();
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const isValid = await auth.verifyPassword(password, user.password_hash);
            if (!isValid) {
                db.close();
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const token = auth.generateToken({
                id: user.id,
                username: user.username,
                role: user.role,
                rep_id: user.rep_id
            });

            res.cookie('token', token, {
                httpOnly: true,
                secure: NODE_ENV === 'production',
                sameSite: 'Lax',
                maxAge: 8 * 60 * 60 * 1000 // 8 hours
            });

            db.close();
            res.json({
                success: true,
                user: {
                    id: user.id,
                    username: user.username,
                    name: user.name,
                    email: user.email,
                    role: user.role
                }
            });
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logout realizado com sucesso' });
});

app.get('/api/auth/me', auth.authenticateToken, (req, res) => {
    const db = new sqlite3.Database(DB_PATH);
    
    db.get('SELECT id, username, name, email, phone, role, discount_value FROM users WHERE id = ?', 
        [req.user.id], (err, user) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!user) {
            db.close();
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        db.close();
        res.json(user);
    });
});

// Document validation endpoint
app.get('/api/validate', (req, res) => {
    const { doc } = req.query;
    
    if (!doc) {
        return res.status(400).json({ error: 'Documento não fornecido' });
    }
    
    const cleanDoc = doc.replace(/[^\d]/g, '');
    let isValid = false;
    let type = '';
    
    if (cleanDoc.length === 11) {
        type = 'cpf';
        isValid = validators.validateCPF(doc);
    } else if (cleanDoc.length === 14) {
        type = 'cnpj';
        isValid = validators.validateCNPJ(doc);
    }
    
    res.json({
        valid: isValid,
        type: type,
        formatted: isValid ? validators.formatDocument(doc, type) : doc
    });
});

// Entries routes
app.get('/api/entries', auth.authenticateToken, (req, res) => {
    const { error, value } = validators.validateSearchFilters(req.query);
    if (error) {
        return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
    }

    const db = new sqlite3.Database(DB_PATH);
    let query = 'SELECT id, type, doc, doc_type, nome, telefone, vendedor, valor_bruto, desconto_aplicado, valor_liquido, status, created_at FROM entries WHERE 1=1';
    let params = [];

    // Role-based filtering
    if (req.user.role === 'vendedor') {
        query += ' AND user_id = ?';
        params.push(req.user.id);
    } else if (req.user.role === 'representante') {
        // Show entries from vendedores under this representante
        query += ' AND user_id IN (SELECT id FROM users WHERE rep_id = ? OR id = ?)';
        params.push(req.user.id, req.user.id);
    }

    // Apply filters
    if (value.status) {
        query += ' AND status = ?';
        params.push(value.status);
    }
    if (value.type) {
        query += ' AND type = ?';
        params.push(value.type);
    }
    if (value.vendedor) {
        query += ' AND vendedor LIKE ?';
        params.push(`%${value.vendedor}%`);
    }
    if (value.doc_type) {
        query += ' AND doc_type = ?';
        params.push(value.doc_type);
    }
    if (value.date_start) {
        query += ' AND DATE(created_at) >= ?';
        params.push(value.date_start);
    }
    if (value.date_end) {
        query += ' AND DATE(created_at) <= ?';
        params.push(value.date_end);
    }
    if (value.search) {
        query += ' AND (nome LIKE ? OR doc LIKE ? OR vendedor LIKE ?)';
        params.push(`%${value.search}%`, `%${value.search}%`, `%${value.search}%`);
    }

    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(value.limit, (value.page - 1) * value.limit);

    db.all(query, params, (err, rows) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Erro ao buscar entradas' });
        }

        db.close();
        res.json({ entries: rows, page: value.page, limit: value.limit });
    });
});

app.get('/api/entries/:id', auth.authenticateToken, auth.authorizeRoles('admin'), (req, res) => {
    const db = new sqlite3.Database(DB_PATH);
    
    db.get('SELECT * FROM entries WHERE id = ?', [req.params.id], (err, entry) => {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!entry) {
            db.close();
            return res.status(404).json({ error: 'Entrada não encontrada' });
        }
        
        // Decrypt sensitive data if exists
        if (entry.encrypted_json) {
            try {
                const encryptedData = {
                    encrypted: entry.encrypted_json,
                    wrappedKey: entry.wrapped_key,
                    iv: entry.iv,
                    authTag: entry.auth_tag,
                    aad: entry.aad,
                    salt: entry.salt
                };
                
                const decryptedJson = auth.decryptData(encryptedData);
                const sensitiveData = JSON.parse(decryptedJson);
                entry.sensitive_data = sensitiveData;
            } catch (decryptError) {
                console.error('Erro ao descriptografar dados:', decryptError);
            }
        }
        
        // Get attachments
        db.all('SELECT * FROM attachments WHERE entry_id = ?', [entry.id], (err, attachments) => {
            db.close();
            
            if (err) {
                return res.status(500).json({ error: 'Erro ao buscar anexos' });
            }
            
            entry.attachments = attachments;
            res.json(entry);
        });
    });
});

app.post('/api/entries', auth.authenticateToken, upload.array('attachments', 10), async (req, res) => {
    try {
        const { error, value } = validators.validateEntryRegistration(req.body);
        if (error) {
            return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
        }

        // Validate document
        if (!validators.validateDocument(value.doc, value.doc_type)) {
            return res.status(400).json({ error: 'Documento inválido' });
        }

        const db = new sqlite3.Database(DB_PATH);

        // Prepare sensitive data for encryption
        const sensitiveData = {
            email: value.email,
            endereco: value.endereco,
            cidade: value.cidade,
            estado: value.estado,
            cep: value.cep,
            rg: value.rg,
            data_nascimento: value.data_nascimento,
            razao_social: value.razao_social,
            nome_fantasia: value.nome_fantasia,
            inscricao_estadual: value.inscricao_estadual,
            inscricao_municipal: value.inscricao_municipal
        };

        const encryptedData = auth.encryptData(JSON.stringify(sensitiveData));

        // Generate contract if requested
        let contractFilename = null;
        if (req.body.generate_contract === 'true') {
            try {
                const contractData = {
                    ...value,
                    ...sensitiveData,
                    tipo_servico: value.type === 'limpeza' ? 'Limpeza' : value.type === 'rating_pf' ? 'Rating Pessoa Física' : 'Rating Pessoa Jurídica'
                };
                const contractResult = await contractGenerator.generateContract(contractData);
                contractFilename = contractResult.filename;
            } catch (contractError) {
                console.error('Erro ao gerar contrato:', contractError);
            }
        }

        // Insert entry
        const insertQuery = `
            INSERT INTO entries (
                user_id, type, doc, doc_type, nome, telefone, vendedor, 
                valor_bruto, desconto_aplicado, valor_liquido, 
                encrypted_json, wrapped_key, iv, auth_tag, aad, salt, contract_filename
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertParams = [
            req.user.id, value.type, value.doc, value.doc_type, value.nome, value.telefone, value.vendedor,
            value.valor_bruto, value.desconto_aplicado, value.valor_liquido,
            encryptedData.encrypted, encryptedData.wrappedKey, encryptedData.iv,
            encryptedData.authTag, encryptedData.aad, encryptedData.salt, contractFilename
        ];

        db.run(insertQuery, insertParams, function(err) {
            if (err) {
                db.close();
                console.error('Database error:', err);
                return res.status(500).json({ error: 'Erro ao salvar entrada' });
            }

            const entryId = this.lastID;

            // Save attachments
            if (req.files && req.files.length > 0) {
                const attachmentPromises = req.files.map(file => {
                    return new Promise((resolve, reject) => {
                        db.run('INSERT INTO attachments (entry_id, filename, original_name, mimetype, size) VALUES (?, ?, ?, ?, ?)',
                            [entryId, file.filename, file.originalname, file.mimetype, file.size],
                            function(err) {
                                if (err) reject(err);
                                else resolve(this.lastID);
                            });
                    });
                });

                Promise.all(attachmentPromises)
                    .then(() => {
                        db.close();
                        res.status(201).json({
                            success: true,
                            id: entryId,
                            contract: contractFilename ? `/api/contracts/${contractFilename}` : null,
                            message: 'Entrada criada com sucesso'
                        });
                    })
                    .catch(attachmentError => {
                        db.close();
                        console.error('Attachment error:', attachmentError);
                        res.status(201).json({
                            success: true,
                            id: entryId,
                            warning: 'Entrada criada, mas houve erro nos anexos',
                            contract: contractFilename ? `/api/contracts/${contractFilename}` : null
                        });
                    });
            } else {
                db.close();
                res.status(201).json({
                    success: true,
                    id: entryId,
                    contract: contractFilename ? `/api/contracts/${contractFilename}` : null,
                    message: 'Entrada criada com sucesso'
                });
            }
        });

    } catch (error) {
        console.error('Entry creation error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.patch('/api/entries/:id/status', auth.authenticateToken, auth.authorizeRoles('admin'), (req, res) => {
    const { error, value } = validators.validateStatusUpdate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
    }

    const db = new sqlite3.Database(DB_PATH);

    db.run('UPDATE entries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [value.status, req.params.id], function(err) {
        if (err) {
            db.close();
            return res.status(500).json({ error: 'Erro ao atualizar status' });
        }

        if (this.changes === 0) {
            db.close();
            return res.status(404).json({ error: 'Entrada não encontrada' });
        }

        db.close();
        res.json({ success: true, message: 'Status atualizado com sucesso' });
    });
});

// Stats endpoint
app.get('/api/stats', auth.authenticateToken, (req, res) => {
    const db = new sqlite3.Database(DB_PATH);
    let queries = [];

    // Base query modification based on role
    let baseWhere = '';
    let baseParams = [];

    if (req.user.role === 'vendedor') {
        baseWhere = 'WHERE user_id = ?';
        baseParams = [req.user.id];
    } else if (req.user.role === 'representante') {
        baseWhere = 'WHERE user_id IN (SELECT id FROM users WHERE rep_id = ? OR id = ?)';
        baseParams = [req.user.id, req.user.id];
    }

    // KPI queries
    const kpiQueries = [
        // Total limpeza sales
        `SELECT COUNT(*) as count, COALESCE(SUM(valor_liquido), 0) as total 
         FROM entries ${baseWhere} AND type = 'limpeza'`,
        
        // Total rating sales
        `SELECT COUNT(*) as count, COALESCE(SUM(valor_liquido), 0) as total 
         FROM entries ${baseWhere} AND type IN ('rating_pf', 'rating_pj')`,
        
        // Total values
        `SELECT 
            COALESCE(SUM(valor_bruto), 0) as total_bruto,
            COALESCE(SUM(valor_liquido), 0) as total_liquido 
         FROM entries ${baseWhere.replace('AND', 'WHERE').replace(/^WHERE WHERE/, 'WHERE') || 'WHERE 1=1'}`,
        
        // Status distribution
        `SELECT status, COUNT(*) as count 
         FROM entries ${baseWhere.replace('AND', 'WHERE').replace(/^WHERE WHERE/, 'WHERE') || 'WHERE 1=1'} 
         GROUP BY status`
    ];

    let results = {};
    let completed = 0;

    kpiQueries.forEach((query, index) => {
        db.all(query, baseParams, (err, rows) => {
            if (!err) {
                switch(index) {
                    case 0:
                        results.vendas_limpeza = rows[0];
                        break;
                    case 1:
                        results.vendas_rating = rows[0];
                        break;
                    case 2:
                        results.totals = rows[0];
                        break;
                    case 3:
                        results.status_distribution = rows;
                        break;
                }
            }
            
            completed++;
            if (completed === kpiQueries.length) {
                db.close();
                res.json(results);
            }
        });
    });
});

// Charts endpoint
app.get('/api/charts/vendas', auth.authenticateToken, (req, res) => {
    const { period = 'month' } = req.query;
    const db = new sqlite3.Database(DB_PATH);
    
    let dateFormat;
    switch(period) {
        case 'year':
            dateFormat = "%Y";
            break;
        case 'quinzena':
            dateFormat = "%Y-%m";
            break;
        default:
            dateFormat = "%Y-%m";
    }

    let baseWhere = '';
    let baseParams = [];

    if (req.user.role === 'vendedor') {
        baseWhere = 'WHERE user_id = ?';
        baseParams = [req.user.id];
    } else if (req.user.role === 'representante') {
        baseWhere = 'WHERE user_id IN (SELECT id FROM users WHERE rep_id = ? OR id = ?)';
        baseParams = [req.user.id, req.user.id];
    }

    const query = `
        SELECT 
            strftime('${dateFormat}', created_at) as period,
            type,
            COUNT(*) as count,
            SUM(valor_liquido) as total
        FROM entries 
        ${baseWhere}
        GROUP BY period, type 
        ORDER BY period DESC 
        LIMIT 12
    `;

    db.all(query, baseParams, (err, rows) => {
        db.close();
        
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar dados do gráfico' });
        }
        
        res.json(rows);
    });
});

// Support ticket routes
app.get('/api/tickets', auth.authenticateToken, (req, res) => {
    const db = new sqlite3.Database(DB_PATH);
    
    db.all('SELECT id, titulo, descricao, categoria, status, created_at FROM tickets WHERE user_id = ? ORDER BY created_at DESC', 
        [req.user.id], (err, tickets) => {
        db.close();
        
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar tickets' });
        }
        
        res.json(tickets);
    });
});

app.post('/api/tickets', auth.authenticateToken, upload.single('attachment'), (req, res) => {
    const { error, value } = validators.validateSupportTicket(req.body);
    if (error) {
        return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
    }

    const db = new sqlite3.Database(DB_PATH);
    const attachmentPath = req.file ? req.file.filename : null;

    db.run('INSERT INTO tickets (user_id, titulo, descricao, categoria, attachment_path) VALUES (?, ?, ?, ?, ?)',
        [req.user.id, value.titulo, value.descricao, value.categoria, attachmentPath], function(err) {
        db.close();
        
        if (err) {
            return res.status(500).json({ error: 'Erro ao criar ticket' });
        }
        
        res.status(201).json({ 
            success: true, 
            id: this.lastID, 
            message: 'Ticket criado com sucesso' 
        });
    });
});

// Profile routes
app.get('/api/profile', auth.authenticateToken, (req, res) => {
    const db = new sqlite3.Database(DB_PATH);
    
    db.get('SELECT id, username, name, email, phone, role, discount_value FROM users WHERE id = ?', 
        [req.user.id], (err, user) => {
        db.close();
        
        if (err) {
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!user) {
            return res.status(404).json({ error: 'Usuário não encontrado' });
        }
        
        res.json(user);
    });
});

app.patch('/api/profile', auth.authenticateToken, async (req, res) => {
    const { error, value } = validators.validateProfileUpdate(req.body);
    if (error) {
        return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
    }

    const db = new sqlite3.Database(DB_PATH);
    
    try {
        // If changing password, verify current password
        if (value.new_password) {
            const user = await new Promise((resolve, reject) => {
                db.get('SELECT password_hash FROM users WHERE id = ?', [req.user.id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });
            
            if (!user || !await auth.verifyPassword(value.current_password, user.password_hash)) {
                db.close();
                return res.status(400).json({ error: 'Senha atual incorreta' });
            }
            
            value.password_hash = await auth.hashPassword(value.new_password);
            delete value.new_password;
            delete value.current_password;
        }

        // Update user
        const updateFields = [];
        const updateValues = [];
        
        Object.keys(value).forEach(key => {
            if (value[key] !== undefined) {
                updateFields.push(`${key} = ?`);
                updateValues.push(value[key]);
            }
        });
        
        if (updateFields.length === 0) {
            db.close();
            return res.status(400).json({ error: 'Nenhum campo para atualizar' });
        }
        
        updateValues.push(req.user.id);
        
        db.run(`UPDATE users SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            updateValues, function(err) {
            db.close();
            
            if (err) {
                return res.status(500).json({ error: 'Erro ao atualizar perfil' });
            }
            
            res.json({ success: true, message: 'Perfil atualizado com sucesso' });
        });
        
    } catch (error) {
        db.close();
        console.error('Profile update error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Admin routes for user management
app.get('/api/admin/users', auth.authenticateToken, auth.authorizeRoles('admin'), (req, res) => {
    const db = new sqlite3.Database(DB_PATH);
    
    db.all('SELECT id, username, name, email, phone, role, rep_id, discount_value, created_at FROM users ORDER BY created_at DESC', 
        (err, users) => {
        db.close();
        
        if (err) {
            return res.status(500).json({ error: 'Erro ao buscar usuários' });
        }
        
        res.json(users);
    });
});

app.post('/api/admin/users', auth.authenticateToken, auth.authorizeRoles('admin'), async (req, res) => {
    const { error, value } = validators.validateUserRegistration(req.body);
    if (error) {
        return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
    }

    try {
        const passwordHash = await auth.hashPassword(value.password);
        const db = new sqlite3.Database(DB_PATH);

        db.run('INSERT INTO users (username, password_hash, name, email, phone, role, rep_id, discount_value) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [value.username, passwordHash, value.name, value.email, value.phone, value.role, value.rep_id || null, value.discount_value],
            function(err) {
            db.close();
            
            if (err) {
                if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                    return res.status(400).json({ error: 'Nome de usuário já existe' });
                }
                return res.status(500).json({ error: 'Erro ao criar usuário' });
            }
            
            res.status(201).json({ 
                success: true, 
                id: this.lastID, 
                message: 'Usuário criado com sucesso' 
            });
        });
    } catch (error) {
        console.error('User creation error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Contract download endpoint
app.get('/api/contracts/:filename', auth.authenticateToken, async (req, res) => {
    try {
        const { filename } = req.params;
        
        // Validate filename to prevent directory traversal
        if (!/^[a-zA-Z0-9_-]+\.pdf$/.test(filename)) {
            return res.status(400).json({ error: 'Nome de arquivo inválido' });
        }
        
        const contractBytes = await contractGenerator.getContract(filename);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.send(contractBytes);
    } catch (error) {
        console.error('Contract download error:', error);
        res.status(404).json({ error: 'Contrato não encontrado' });
    }
});

// File upload endpoint  
app.get('/api/uploads/:filename', auth.authenticateToken, (req, res) => {
    const { filename } = req.params;
    
    // Validate filename to prevent directory traversal
    if (!/^[a-zA-Z0-9_-]+\.(jpg|jpeg|png|pdf)$/.test(filename)) {
        return res.status(400).json({ error: 'Nome de arquivo inválido' });
    }
    
    const filePath = path.join(__dirname, 'uploads', filename);
    
    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Arquivo não encontrado' });
    }
    
    res.sendFile(filePath);
});

// Scheduler endpoint
app.post('/api/scheduler/run', auth.authenticateToken, auth.authorizeRoles('admin'), async (req, res) => {
    try {
        const result = await scheduler.runStatusUpdate();
        res.json(result);
    } catch (error) {
        console.error('Scheduler error:', error);
        res.status(500).json({ error: 'Erro ao executar scheduler' });
    }
});

// Serve main dashboard for authenticated routes
app.get('/', (req, res) => {
    if (req.cookies.token) {
        res.sendFile(path.join(__dirname, 'public', 'index.html'));
    } else {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
    }
});

// Catch all route for SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Error:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Arquivo muito grande. Máximo 5MB.' });
        }
    }
    
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Initialize database and start server
initializeDatabase();

// Initialize scheduler
scheduler.init();

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${NODE_ENV}`);
    console.log(`Dashboard URL: http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    scheduler.stopAll();
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    scheduler.stopAll();
    process.exit(0);
});

module.exports = app;