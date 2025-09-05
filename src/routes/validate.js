const express = require('express');
const { validateDocumentRemote, detectDocumentType } = require('../validators');

const router = express.Router();

// Validar CPF/CNPJ
router.get('/', async (req, res) => {
  try {
    const { doc } = req.query;
    
    if (!doc) {
      return res.status(400).json({ 
        error: 'Documento é obrigatório',
        valid: false 
      });
    }

    // Remover formatação
    const cleanDoc = doc.replace(/[^\d]/g, '');
    
    // Validar documento
    const result = await validateDocumentRemote(cleanDoc);
    
    res.json({
      valid: result.valid,
      type: result.type,
      source: result.source,
      formatted: result.type === 'cpf' ? 
        cleanDoc.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4') :
        result.type === 'cnpj' ?
        cleanDoc.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5') :
        cleanDoc
    });
  } catch (error) {
    console.error('Erro na validação:', error);
    res.status(500).json({ 
      error: 'Erro interno do servidor',
      valid: false 
    });
  }
});

module.exports = router;