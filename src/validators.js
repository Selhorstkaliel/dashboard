const https = require('https');
const http = require('http');

// Validador de CPF (algoritmo local)
function isValidCPF(cpf) {
  if (!cpf) return false;
  
  // Remove pontuação
  cpf = cpf.replace(/[^\d]/g, '');
  
  // Verifica se tem 11 dígitos
  if (cpf.length !== 11) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cpf)) return false;
  
  // Calcula os dígitos verificadores
  let sum = 0;
  let remainder;
  
  // Primeiro dígito verificador
  for (let i = 1; i <= 9; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (11 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  
  // Segundo dígito verificador
  sum = 0;
  for (let i = 1; i <= 10; i++) {
    sum += parseInt(cpf.substring(i - 1, i)) * (12 - i);
  }
  
  remainder = (sum * 10) % 11;
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  
  return true;
}

// Validador de CNPJ (algoritmo local)
function isValidCNPJ(cnpj) {
  if (!cnpj) return false;
  
  // Remove pontuação
  cnpj = cnpj.replace(/[^\d]/g, '');
  
  // Verifica se tem 14 dígitos
  if (cnpj.length !== 14) return false;
  
  // Verifica se todos os dígitos são iguais
  if (/^(\d)\1+$/.test(cnpj)) return false;
  
  // Calcula os dígitos verificadores
  let length = cnpj.length - 2;
  let numbers = cnpj.substring(0, length);
  let digits = cnpj.substring(length);
  let sum = 0;
  let pos = length - 7;
  
  // Primeiro dígito verificador
  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  let result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(0))) return false;
  
  // Segundo dígito verificador
  length = length + 1;
  numbers = cnpj.substring(0, length);
  sum = 0;
  pos = length - 7;
  
  for (let i = length; i >= 1; i--) {
    sum += numbers.charAt(length - i) * pos--;
    if (pos < 2) pos = 9;
  }
  
  result = sum % 11 < 2 ? 0 : 11 - sum % 11;
  if (result !== parseInt(digits.charAt(1))) return false;
  
  return true;
}

// Detectar tipo de documento
function detectDocumentType(doc) {
  if (!doc) return null;
  
  const cleanDoc = doc.replace(/[^\d]/g, '');
  
  if (cleanDoc.length === 11) {
    return 'cpf';
  } else if (cleanDoc.length === 14) {
    return 'cnpj';
  }
  
  return null;
}

// Validação remota com fallback (opcional)
async function validateDocumentRemote(doc) {
  return new Promise((resolve) => {
    // Por enquanto, sempre retornar validação local como fallback
    // Em produção, implementar chamada para API externa se necessário
    const type = detectDocumentType(doc);
    
    if (type === 'cpf') {
      resolve({
        valid: isValidCPF(doc),
        type: 'cpf',
        source: 'local'
      });
    } else if (type === 'cnpj') {
      resolve({
        valid: isValidCNPJ(doc),
        type: 'cnpj', 
        source: 'local'
      });
    } else {
      resolve({
        valid: false,
        type: null,
        source: 'local'
      });
    }
  });
}

// Formatadores
function formatCPF(cpf) {
  if (!cpf) return '';
  cpf = cpf.replace(/[^\d]/g, '');
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

function formatCNPJ(cnpj) {
  if (!cnpj) return '';
  cnpj = cnpj.replace(/[^\d]/g, '');
  return cnpj.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
}

function formatDocument(doc) {
  const type = detectDocumentType(doc);
  
  if (type === 'cpf') {
    return formatCPF(doc);
  } else if (type === 'cnpj') {
    return formatCNPJ(doc);
  }
  
  return doc;
}

// Validador de email
function isValidEmail(email) {
  if (!email) return false;
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Validador de telefone
function isValidPhone(phone) {
  if (!phone) return false;
  
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  // Aceita telefones com 10 ou 11 dígitos (com ou sem 9 à frente do celular)
  return cleanPhone.length === 10 || cleanPhone.length === 11;
}

// Formatador de telefone
function formatPhone(phone) {
  if (!phone) return '';
  
  const cleanPhone = phone.replace(/[^\d]/g, '');
  
  if (cleanPhone.length === 11) {
    return cleanPhone.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
  } else if (cleanPhone.length === 10) {
    return cleanPhone.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  
  return phone;
}

// Validador de valor monetário
function isValidMoney(value) {
  if (!value) return false;
  
  const cleanValue = value.replace(/[^\d,\.]/g, '');
  const numericValue = parseFloat(cleanValue.replace(',', '.'));
  
  return !isNaN(numericValue) && numericValue >= 0;
}

// Formatador de valor monetário
function formatMoney(value) {
  if (!value) return 'R$ 0,00';
  
  const numericValue = typeof value === 'string' ? 
    parseFloat(value.replace(/[^\d,\.]/g, '').replace(',', '.')) : 
    parseFloat(value);
  
  if (isNaN(numericValue)) return 'R$ 0,00';
  
  return numericValue.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  });
}

// Parseador de valor monetário para número
function parseMoney(value) {
  if (!value) return 0;
  
  const cleanValue = value.toString().replace(/[^\d,\.]/g, '');
  const numericValue = parseFloat(cleanValue.replace(',', '.'));
  
  return isNaN(numericValue) ? 0 : numericValue;
}

module.exports = {
  isValidCPF,
  isValidCNPJ,
  detectDocumentType,
  validateDocumentRemote,
  formatCPF,
  formatCNPJ,
  formatDocument,
  isValidEmail,
  isValidPhone,
  formatPhone,
  isValidMoney,
  formatMoney,
  parseMoney
};