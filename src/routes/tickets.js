const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { requireAuth } = require('../auth');

const router = express.Router();

// Configure multer for attachments
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, 'ticket_' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|pdf/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Apenas arquivos de imagem (JPG, PNG) e PDF são permitidos'));
    }
  }
});

// Get user tickets
router.get('/', requireAuth, (req, res) => {
  try {
    const db = getDb();
    
    db.all(
      `SELECT * FROM tickets 
       WHERE user_id = ? 
       ORDER BY created_at DESC`,
      [req.user.id],
      (err, tickets) => {
        if (err) {
          console.error('Error fetching tickets:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        res.json(tickets || []);
      }
    );
  } catch (error) {
    console.error('Error in GET /tickets:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create new ticket
router.post('/', requireAuth, upload.single('anexo'), (req, res) => {
  try {
    const { titulo, descricao } = req.body;
    
    if (!titulo || !descricao) {
      return res.status(400).json({ error: 'Título e descrição são obrigatórios' });
    }
    
    const db = getDb();
    const attachmentPath = req.file ? req.file.filename : null;
    
    db.run(
      `INSERT INTO tickets (user_id, titulo, descricao, attachment_path)
       VALUES (?, ?, ?, ?)`,
      [req.user.id, titulo, descricao, attachmentPath],
      function(err) {
        if (err) {
          console.error('Error creating ticket:', err);
          return res.status(500).json({ error: 'Erro ao criar chamado' });
        }
        
        res.json({
          success: true,
          ticket_id: this.lastID,
          message: 'Chamado criado com sucesso'
        });
      }
    );
  } catch (error) {
    console.error('Error in POST /tickets:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

module.exports = router;