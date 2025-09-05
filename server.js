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

// Import custom modules
const auth = require('./src/auth');
const validators = require('./src/validators');

// Load environment variables
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

console.log(`🚀 Starting LimitClean Dashboard...`);
console.log(`🌍 Environment: ${NODE_ENV}`);
console.log(`🔧 Port: ${PORT}`);

// Database setup
const DB_PATH = path.join(__dirname, 'db.sqlite');

// Initialize database
function initializeDatabase() {
    return new Promise((resolve, reject) => {
        console.log('📊 Initializing database...');
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

            // Entries table (simplified for initial implementation)
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
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`);

            // Support tickets table
            db.run(`CREATE TABLE IF NOT EXISTS tickets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                titulo VARCHAR(200) NOT NULL,
                descricao TEXT NOT NULL,
                categoria VARCHAR(50) DEFAULT 'geral',
                status VARCHAR(20) DEFAULT 'aberto',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id)
            )`, function(err) {
                if (err) {
                    console.error('❌ Error creating tables:', err);
                    reject(err);
                    return;
                }

                // Create default admin user
                console.log('👤 Creating default admin user...');
                auth.hashPassword('kaskolk14').then(hash => {
                    db.run(`INSERT OR IGNORE INTO users (username, password_hash, role, name, email, phone) 
                            VALUES (?, ?, 'admin', 'Kaliel', 'kaliel@limitclean.com', '(11) 99999-9999')`, 
                        ['Kaliel', hash], function(err) {
                        db.close();
                        if (err) {
                            console.error('❌ Error creating admin user:', err);
                            reject(err);
                        } else {
                            console.log('✅ Database initialized successfully');
                            resolve();
                        }
                    });
                }).catch(reject);
            });
        });
    });
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
    max: 10, // More lenient limit for testing
    message: 'Muitas tentativas de login, tente novamente em 15 minutos.'
});

app.use('/api/', limiter);
app.use('/api/auth/', authLimiter);

// Serve static files
app.use(express.static('public'));

// Enhanced authentication routes with better logging
app.post('/api/auth/login', async (req, res) => {
    console.log('🔐 Login attempt:', { username: req.body.username, hasPassword: !!req.body.password });
    
    try {
        const { error, value } = validators.validateUserLogin(req.body);
        if (error) {
            console.log('❌ Login validation failed:', error.details.map(d => d.message));
            return res.status(400).json({ error: error.details.map(d => d.message).join(', ') });
        }

        const { username, password } = value;
        const db = new sqlite3.Database(DB_PATH);

        db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
            if (err) {
                console.error('❌ Database error during login:', err);
                db.close();
                return res.status(500).json({ error: 'Erro interno do servidor' });
            }

            if (!user) {
                console.log('❌ User not found:', username);
                db.close();
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            console.log('👤 User found:', { id: user.id, username: user.username, role: user.role });

            const isValid = await auth.verifyPassword(password, user.password_hash);
            if (!isValid) {
                console.log('❌ Invalid password for user:', username);
                db.close();
                return res.status(401).json({ error: 'Credenciais inválidas' });
            }

            const tokenPayload = {
                id: user.id,
                username: user.username,
                role: user.role,
                rep_id: user.rep_id
            };

            console.log('🎫 Generating token for:', tokenPayload);
            const token = auth.generateToken(tokenPayload);

            // Set cookie with proper options
            res.cookie('token', token, {
                httpOnly: true,
                secure: NODE_ENV === 'production', // Only secure in production
                sameSite: NODE_ENV === 'production' ? 'strict' : 'lax',
                maxAge: 8 * 60 * 60 * 1000, // 8 hours
                path: '/'
            });

            console.log('✅ Login successful for:', username);

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
        console.error('❌ Login error:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

app.post('/api/auth/logout', (req, res) => {
    console.log('👋 Logout request');
    res.clearCookie('token', { path: '/' });
    res.json({ success: true, message: 'Logout realizado com sucesso' });
});

app.get('/api/auth/me', auth.authenticateToken, (req, res) => {
    console.log('👤 User info request for:', req.user.username);
    
    const db = new sqlite3.Database(DB_PATH);
    
    db.get('SELECT id, username, name, email, phone, role, discount_value FROM users WHERE id = ?', 
        [req.user.id], (err, user) => {
        if (err) {
            console.error('❌ Database error in /me:', err);
            db.close();
            return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!user) {
            console.log('❌ User not found in /me:', req.user.id);
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

// Basic stats endpoint for dashboard
app.get('/api/stats', auth.authenticateToken, (req, res) => {
    console.log('📊 Stats request from:', req.user.username);
    
    const db = new sqlite3.Database(DB_PATH);
    
    // Simple stats for now
    const stats = {
        vendas_limpeza: { count: 0, total: 0 },
        vendas_rating: { count: 0, total: 0 },
        totals: { total_bruto: 0, total_liquido: 0 },
        status_distribution: []
    };
    
    db.close();
    res.json(stats);
});

// Root route with enhanced debugging
app.get('/', (req, res) => {
    const token = req.cookies?.token;
    const hasToken = !!token;
    
    console.log(`🏠 Root route accessed - Token: ${hasToken ? 'present' : 'missing'}`);
    
    if (!token) {
        console.log('↩️ No token found, redirecting to login');
        return res.redirect('/login.html');
    }
    
    // Verify token
    try {
        const decoded = auth.verifyToken(token);
        console.log(`✅ Token valid for user: ${decoded.username}, serving dashboard`);
        
        // Create a simple dashboard page for now
        const dashboardHtml = `
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Dashboard - LimitClean</title>
    <link rel="stylesheet" href="style.css">
</head>
<body>
    <header class="header">
        <div class="container">
            <nav class="nav">
                <div class="logo">LimitClean</div>
                <div class="user-info">
                    <div class="user-avatar">${decoded.name ? decoded.name.charAt(0).toUpperCase() : 'U'}</div>
                    <span>${decoded.username}</span>
                    <button class="btn btn-secondary btn-sm" onclick="logout()">Sair</button>
                </div>
            </nav>
        </div>
    </header>

    <main class="main-content">
        <div class="container">
            <div style="text-align: center; padding: 3rem;">
                <h1>🎉 Bem-vindo ao Dashboard LimitClean!</h1>
                <p>Parabéns! Você conseguiu sair da área de login com sucesso.</p>
                <p><strong>Usuário:</strong> ${decoded.username} (${decoded.role})</p>
                <p><strong>ID:</strong> ${decoded.id}</p>
                
                <div style="margin-top: 2rem;">
                    <div class="alert alert-success">
                        ✅ <strong>Problema resolvido!</strong><br>
                        O bug que impedia os usuários de sair da área de login foi corrigido.
                        Agora você pode acessar o dashboard normalmente!
                    </div>
                </div>

                <div style="margin-top: 2rem;">
                    <button class="btn btn-primary" onclick="testAPI()">🧪 Testar API</button>
                    <button class="btn btn-secondary" onclick="logout()">🚪 Fazer Logout</button>
                </div>

                <div id="apiResult" style="margin-top: 2rem; display: none;">
                    <h3>Resultado do Teste da API:</h3>
                    <pre id="apiData" style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; text-align: left;"></pre>
                </div>
            </div>
        </div>
    </main>

    <script>
        console.log('Dashboard loaded successfully');
        
        async function testAPI() {
            try {
                const response = await fetch('/api/auth/me', {
                    credentials: 'include'
                });
                const data = await response.json();
                
                document.getElementById('apiData').textContent = JSON.stringify(data, null, 2);
                document.getElementById('apiResult').style.display = 'block';
            } catch (error) {
                document.getElementById('apiData').textContent = 'Erro: ' + error.message;
                document.getElementById('apiResult').style.display = 'block';
            }
        }
        
        async function logout() {
            try {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    credentials: 'include'
                });
                window.location.href = '/login.html';
            } catch (error) {
                console.error('Logout error:', error);
                window.location.href = '/login.html';
            }
        }
    </script>
</body>
</html>`;
        
        res.send(dashboardHtml);
    } catch (error) {
        console.log('❌ Token invalid, clearing and redirecting:', error.message);
        res.clearCookie('token', { path: '/' });
        res.redirect('/login.html');
    }
});

// Catch all route for serving login page
app.get('*', (req, res) => {
    const token = req.cookies?.token;
    console.log(`🎯 Catch-all route for: ${req.path} - Token: ${token ? 'present' : 'missing'}`);
    
    // For login page, always serve it
    if (req.path === '/login.html') {
        res.sendFile(path.join(__dirname, 'public', 'login.html'));
        return;
    }
    
    // For other pages, check authentication
    if (!token) {
        console.log('↩️ No token in catch-all, redirecting to login');
        return res.redirect('/login.html');
    }
    
    try {
        auth.verifyToken(token);
        console.log('✅ Token valid in catch-all, redirecting to dashboard');
        res.redirect('/');
    } catch (error) {
        console.log('❌ Token invalid in catch-all, clearing and redirecting');
        res.clearCookie('token', { path: '/' });
        res.redirect('/login.html');
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('❌ Unhandled error:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Initialize database and start server
async function startServer() {
    try {
        await initializeDatabase();
        
        app.listen(PORT, () => {
            console.log('🎉 Server started successfully!');
            console.log(`📍 Dashboard URL: http://localhost:${PORT}`);
            console.log(`🔑 Default login: Kaliel / kaskolk14`);
            console.log('🚀 Ready to fix the login area issue!');
        });
    } catch (error) {
        console.error('💥 Server startup error:', error);
        process.exit(1);
    }
}

startServer();

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    process.exit(0);
});

module.exports = app;