const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { getDb } = require('../database');
const { requireAuth, canAccessEntry } = require('../auth');
const { encryptData, serializeEncryptedData, decryptData, deserializeEncryptedData } = require('../encryption');
const { generateContract } = require('../contrato');
const { validateDocumentRemote, parseMoney, formatMoney, isValidCPF, isValidCNPJ } = require('../validators');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only images and PDFs
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

// Get entries with filtering and pagination
router.get('/', requireAuth, async (req, res) => {
  try {
    const { limit = 50, offset = 0, type, status } = req.query;
    const db = getDb();
    
    let query = `
      SELECT 
        e.*,
        u.name as user_name,
        u.representative_id
      FROM entries e
      JOIN users u ON e.user_id = u.id
    `;
    
    const params = [];
    const conditions = [];
    
    // Apply role-based filtering
    if (req.user.role === 'vendedor') {
      conditions.push('e.user_id = ?');
      params.push(req.user.id);
    } else if (req.user.role === 'representante') {
      conditions.push('u.representative_id = ?');
      params.push(req.user.id);
    }
    // Admin sees all entries
    
    // Apply additional filters
    if (type) {
      conditions.push('e.type = ?');
      params.push(type);
    }
    
    if (status) {
      conditions.push('e.status = ?');
      params.push(status);
    }
    
    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY e.created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Error fetching entries:', err);
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
      
      // Format entries for frontend
      const entries = rows.map(entry => ({
        id: entry.id,
        type: entry.type,
        doc: entry.doc,
        doc_type: entry.doc_type,
        nome: entry.nome,
        telefone: entry.telefone,
        vendedor: entry.vendedor,
        valor_bruto: entry.valor_bruto,
        desconto_aplicado: entry.desconto_aplicado,
        valor_liquido: entry.valor_liquido,
        status: entry.status,
        rating_subtype: entry.rating_subtype,
        contract_path: entry.contract_path,
        created_at: entry.created_at,
        updated_at: entry.updated_at,
        user_name: entry.user_name
      }));
      
      res.json(entries);
    });
  } catch (error) {
    console.error('Error in GET /entries:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Create new entry
router.post('/', requireAuth, upload.any(), async (req, res) => {
  try {
    const db = getDb();
    const { body, files } = req;
    
    // Validate document
    const docValidation = await validateDocumentRemote(body.documento || body.cpf || body.cnpj);
    if (!docValidation.valid) {
      return res.status(400).json({ error: 'Documento inválido' });
    }
    
    // Parse value
    const valorBruto = parseMoney(body.valor);
    if (!valorBruto || valorBruto <= 0) {
      return res.status(400).json({ error: 'Valor inválido' });
    }
    
    // Calculate discount (simplified for now)
    const descontoAplicado = 0; // TODO: Implement dynamic discount calculation
    const valorLiquido = valorBruto - descontoAplicado;
    
    // Prepare entry data
    const entryData = {
      user_id: req.user.id,
      type: body.type,
      doc: body.documento || body.cpf || body.cnpj,
      doc_type: docValidation.type,
      nome: body.nome_completo || body.razao_social || body.nome,
      telefone: body.telefone,
      vendedor: body.vendedor || req.user.username,
      valor_bruto: valorBruto,
      desconto_aplicado: descontoAplicado,
      valor_liquido: valorLiquido,
      status: 'Restrição',
      rating_subtype: body.subtype || null
    };
    
    // Encrypt sensitive data if it exists
    let encryptedData = null;
    const sensitiveFields = extractSensitiveData(body);
    
    if (Object.keys(sensitiveFields).length > 0) {
      const encrypted = encryptData(sensitiveFields, req.user.id.toString(), body.type);
      const serialized = serializeEncryptedData(encrypted);
      
      entryData.encrypted_json = serialized.ciphertext;
      entryData.wrapped_key = serialized.wrappedKey;
      entryData.iv = serialized.iv;
      entryData.auth_tag = serialized.authTag;
      entryData.aad = serialized.aad;
      entryData.salt = serialized.salt;
    }
    
    // Generate contract if terms accepted
    let contractPath = null;
    if (body.aceito_termos === 'on' || body.aceito_termos === true) {
      try {
        const contractData = {
          nome: entryData.nome,
          documento: entryData.doc,
          email: body.email || '',
          tipo: body.type,
          subtipo: body.subtype,
          valor: valorLiquido,
          cidade: body.cidade || 'São Paulo',
          estado: body.estado || 'SP'
        };
        
        contractPath = await generateContract(contractData);
      } catch (contractError) {
        console.error('Error generating contract:', contractError);
        // Continue without contract - don't fail the entire process
      }
    }
    
    if (contractPath) {
      entryData.contract_path = contractPath;
    }
    
    // Insert entry into database
    const insertQuery = `
      INSERT INTO entries (
        user_id, type, doc, doc_type, nome, telefone, vendedor,
        valor_bruto, desconto_aplicado, valor_liquido, status,
        rating_subtype, contract_path,
        encrypted_json, wrapped_key, iv, auth_tag, aad, salt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const insertParams = [
      entryData.user_id,
      entryData.type,
      entryData.doc,
      entryData.doc_type,
      entryData.nome,
      entryData.telefone,
      entryData.vendedor,
      entryData.valor_bruto,
      entryData.desconto_aplicado,
      entryData.valor_liquido,
      entryData.status,
      entryData.rating_subtype,
      entryData.contract_path,
      entryData.encrypted_json || null,
      entryData.wrapped_key || null,
      entryData.iv || null,
      entryData.auth_tag || null,
      entryData.aad || null,
      entryData.salt || null
    ];
    
    db.run(insertQuery, insertParams, function(err) {
      if (err) {
        console.error('Error inserting entry:', err);
        return res.status(500).json({ error: 'Erro ao salvar cadastro' });
      }
      
      const entryId = this.lastID;
      
      // Handle file uploads
      if (files && files.length > 0) {
        const attachmentPromises = files.map(file => {
          return new Promise((resolve, reject) => {
            const attachmentQuery = `
              INSERT INTO attachments (entry_id, path, mime, original_name)
              VALUES (?, ?, ?, ?)
            `;
            
            db.run(attachmentQuery, [
              entryId,
              file.filename,
              file.mimetype,
              file.originalname
            ], function(attachErr) {
              if (attachErr) {
                reject(attachErr);
              } else {
                resolve();
              }
            });
          });
        });
        
        Promise.all(attachmentPromises)
          .then(() => {
            res.json({
              success: true,
              entry_id: entryId,
              contract_url: contractPath ? `/contracts/${contractPath}` : null,
              message: 'Cadastro salvo com sucesso!'
            });
          })
          .catch(attachErr => {
            console.error('Error saving attachments:', attachErr);
            res.json({
              success: true,
              entry_id: entryId,
              contract_url: contractPath ? `/contracts/${contractPath}` : null,
              message: 'Cadastro salvo com sucesso, mas houve erro nos anexos.',
              warning: 'Alguns arquivos podem não ter sido salvos.'
            });
          });
      } else {
        res.json({
          success: true,
          entry_id: entryId,
          contract_url: contractPath ? `/contracts/${contractPath}` : null,
          message: 'Cadastro salvo com sucesso!'
        });
      }
    });
  } catch (error) {
    console.error('Error in POST /entries:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Update entry status (admin only)
router.patch('/:id/status', requireAuth, canAccessEntry, (req, res) => {
  try {
    // Only admin can change status
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Apenas administradores podem alterar status' });
    }
    
    const { status } = req.body;
    const entryId = req.params.id;
    
    // Validate status
    const validStatuses = ['Restrição', 'Finalizado', 'Reprotocolo'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Status inválido' });
    }
    
    const db = getDb();
    
    db.run(
      'UPDATE entries SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, entryId],
      function(err) {
        if (err) {
          console.error('Error updating entry status:', err);
          return res.status(500).json({ error: 'Erro ao atualizar status' });
        }
        
        if (this.changes === 0) {
          return res.status(404).json({ error: 'Cadastro não encontrado' });
        }
        
        res.json({
          success: true,
          message: 'Status atualizado com sucesso'
        });
      }
    );
  } catch (error) {
    console.error('Error in PATCH /entries/:id/status:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Get single entry (with decrypted data if authorized)
router.get('/:id', requireAuth, canAccessEntry, (req, res) => {
  try {
    const entryId = req.params.id;
    const db = getDb();
    
    db.get(
      `SELECT e.*, u.name as user_name 
       FROM entries e 
       JOIN users u ON e.user_id = u.id 
       WHERE e.id = ?`,
      [entryId],
      (err, entry) => {
        if (err) {
          console.error('Error fetching entry:', err);
          return res.status(500).json({ error: 'Erro interno do servidor' });
        }
        
        if (!entry) {
          return res.status(404).json({ error: 'Cadastro não encontrado' });
        }
        
        // Decrypt sensitive data if present
        let sensitiveData = null;
        if (entry.encrypted_json) {
          try {
            const encryptedData = {
              ciphertext: entry.encrypted_json,
              iv: entry.iv,
              authTag: entry.auth_tag,
              wrappedKey: entry.wrapped_key,
              salt: entry.salt,
              aad: entry.aad,
              algorithm: 'aes-256-gcm'
            };
            
            sensitiveData = decryptData(encryptedData, entry.user_id.toString(), entry.type);
          } catch (decryptError) {
            console.error('Error decrypting sensitive data:', decryptError);
            // Continue without sensitive data
          }
        }
        
        // Format response
        const response = {
          id: entry.id,
          type: entry.type,
          doc: entry.doc,
          doc_type: entry.doc_type,
          nome: entry.nome,
          telefone: entry.telefone,
          vendedor: entry.vendedor,
          valor_bruto: entry.valor_bruto,
          desconto_aplicado: entry.desconto_aplicado,
          valor_liquido: entry.valor_liquido,
          status: entry.status,
          rating_subtype: entry.rating_subtype,
          contract_path: entry.contract_path,
          created_at: entry.created_at,
          updated_at: entry.updated_at,
          user_name: entry.user_name,
          sensitive_data: sensitiveData
        };
        
        res.json(response);
      }
    );
  } catch (error) {
    console.error('Error in GET /entries/:id:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Helper function to extract sensitive data from form
function extractSensitiveData(body) {
  const sensitive = {};
  
  // Common sensitive fields
  const sensitiveFields = [
    'senha_serasa',
    'email',
    'endereco',
    'renda_familiar',
    'renda_comprovada',
    'bancos',
    'ref1_nome', 'ref1_telefone',
    'ref2_nome', 'ref2_telefone', 
    'ref3_nome', 'ref3_telefone',
    'titulo_eleitor',
    'nome_pai',
    'empresa',
    'ocupacao',
    'data_admissao',
    'rg',
    'data_expedicao',
    'estado_rg',
    'estado_civil',
    'escolaridade'
  ];
  
  sensitiveFields.forEach(field => {
    if (body[field]) {
      sensitive[field] = body[field];
    }
  });
  
  return sensitive;
}

module.exports = router;