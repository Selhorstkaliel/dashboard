const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const cron = require('node-cron');

// Importa módulos locais
const { initDatabase, getDb } = require('./src/database');
const auth = require('./src/auth');
const scheduler = require('./src/scheduler');

// Carrega variáveis de ambiente
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações de segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"]
    }
  }
}));

// CORS - restrito à origem configurada
app.use(cors({
  origin: process.env.ORIGIN || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100 // máximo 100 requests por IP por janela
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5 // máximo 5 tentativas de login por IP
});

app.use(limiter);
app.use('/api/auth/login', authLimiter);

// Middlewares de parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// Proteção contra ataques
app.use(hpp());
app.use(xss());

// Servir arquivos estáticos
app.use(express.static('public'));

// Middleware de autenticação para rotas protegidas
app.use('/api', auth.optionalAuth);

// Importa e usa as rotas da API
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/entries', require('./src/routes/entries'));
app.use('/api/stats', require('./src/routes/stats'));
app.use('/api/charts', require('./src/routes/charts'));
app.use('/api/admin', require('./src/routes/admin'));
app.use('/api/rep', require('./src/routes/representative'));
app.use('/api/profile', require('./src/routes/profile'));
app.use('/api/tickets', require('./src/routes/tickets'));
app.use('/api/validate', require('./src/routes/validate'));
app.use('/api/scheduler', require('./src/routes/scheduler'));

// Servir contratos com verificação de permissão
app.get('/contracts/:filename', auth.requireAuth, async (req, res) => {
  try {
    const { filename } = req.params;
    const filepath = path.join(__dirname, 'contracts', filename);
    
    // Verificar se arquivo existe
    await fs.access(filepath);
    
    // TODO: Implementar verificação de permissão baseada no usuário
    res.sendFile(filepath);
  } catch (error) {
    res.status(404).json({ error: 'Arquivo não encontrado' });
  }
});

// Rota catch-all para SPA
app.get('*', (req, res) => {
  if (req.path.startsWith('/api')) {
    return res.status(404).json({ error: 'Rota não encontrada' });
  }
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Handler de erro global
app.use((err, req, res, next) => {
  console.error('Erro:', err.stack);
  res.status(500).json({ 
    error: process.env.NODE_ENV === 'development' ? err.message : 'Erro interno do servidor' 
  });
});

// Inicializar servidor
async function startServer() {
  try {
    // Inicializar banco de dados
    await initDatabase();
    console.log('✅ Banco de dados inicializado');
    
    // Configurar scheduler para atualização automática de status
    cron.schedule('0 * * * *', () => { // A cada hora
      scheduler.updateStatus();
    });
    
    // Iniciar servidor
    app.listen(PORT, () => {
      console.log(`🚀 Servidor LIMITCLEAN rodando em http://localhost:${PORT}`);
      console.log(`📊 Dashboard: http://localhost:${PORT}`);
      console.log(`🔐 Login: http://localhost:${PORT}/login.html`);
    });
  } catch (error) {
    console.error('❌ Erro ao iniciar servidor:', error);
    process.exit(1);
  }
}

// Lidar com shutdown graceful
process.on('SIGINT', () => {
  console.log('\n🛑 Encerrando servidor...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Encerrando servidor...');
  process.exit(0);
});

startServer();