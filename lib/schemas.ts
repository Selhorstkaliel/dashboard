import { z } from 'zod';

// Auth schemas
export const loginSchema = z.object({
  usuario: z.string().min(1, 'Usuário é obrigatório'),
  senha: z.string().min(1, 'Senha é obrigatória'),
});

// Profile schemas
export const updateProfileSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').optional(),
  email: z.string().email('Email inválido').optional(),
  telefone: z.string().optional(),
  senha: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').optional(),
});

// Entry schemas
export const limpezaSchema = z.object({
  doc: z.string().min(11, 'CPF/CNPJ inválido'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().optional(),
  vendedor: z.string().min(1, 'Vendedor é obrigatório'),
  valor: z.number().min(0, 'Valor deve ser positivo'),
});

export const ratingPFSchema = z.object({
  doc: z.string().min(11, 'CPF inválido'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido'),
  endereco: z.string().min(1, 'Endereço é obrigatório'),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().min(2, 'Estado inválido'),
  vendedor: z.string().min(1, 'Vendedor é obrigatório'),
  aceitoTermos: z.boolean().refine(val => val === true, 'Você deve aceitar os termos'),
  // Files are handled separately in the form
});

export const ratingPJSchema = z.object({
  doc: z.string().min(14, 'CNPJ inválido'),
  nome: z.string().min(1, 'Razão social é obrigatória'),
  telefone: z.string().min(1, 'Telefone é obrigatório'),
  email: z.string().email('Email inválido'),
  endereco: z.string().min(1, 'Endereço é obrigatório'),
  cep: z.string().regex(/^\d{5}-?\d{3}$/, 'CEP inválido'),
  cidade: z.string().min(1, 'Cidade é obrigatória'),
  estado: z.string().min(2, 'Estado inválido'),
  faturamento: z.number().min(0, 'Faturamento deve ser positivo'),
  funcionarios: z.number().min(0, 'Número de funcionários inválido'),
  escrituracao: z.enum(['Simples', 'Real', 'Presumido']),
  vendedor: z.string().min(1, 'Vendedor é obrigatório'),
  aceitoTermos: z.boolean().refine(val => val === true, 'Você deve aceitar os termos'),
});

// User management schemas
export const createRepresentanteSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  desconto: z.number().min(0, 'Desconto deve ser positivo').max(100, 'Desconto não pode ser maior que 100%'),
});

export const createVendedorSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  email: z.string().email('Email inválido'),
  representanteId: z.string().min(1, 'Representante é obrigatório'),
  desconto: z.number().min(0, 'Desconto deve ser positivo').max(100, 'Desconto não pode ser maior que 100%').optional(),
});

// Support schemas
export const createTicketSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().min(1, 'Descrição é obrigatória'),
});

// Validation helpers
export function validateCPF(cpf: string): boolean {
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{10}$/.test(cleaned)) return false;
  
  // Validate check digits
  let sum = 0;
  for (let i = 0; i < 9; i++) {
    sum += parseInt(cleaned.charAt(i)) * (10 - i);
  }
  let remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(9))) return false;
  
  sum = 0;
  for (let i = 0; i < 10; i++) {
    sum += parseInt(cleaned.charAt(i)) * (11 - i);
  }
  remainder = 11 - (sum % 11);
  if (remainder === 10 || remainder === 11) remainder = 0;
  if (remainder !== parseInt(cleaned.charAt(10))) return false;
  
  return true;
}

export function validateCNPJ(cnpj: string): boolean {
  const cleaned = cnpj.replace(/\D/g, '');
  if (cleaned.length !== 14) return false;
  
  // Check for known invalid patterns
  if (/^(\d)\1{13}$/.test(cleaned)) return false;
  
  // Validate check digits
  const weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights1[i];
  }
  let remainder = sum % 11;
  if (remainder < 2) remainder = 0;
  else remainder = 11 - remainder;
  if (remainder !== parseInt(cleaned.charAt(12))) return false;
  
  sum = 0;
  for (let i = 0; i < 13; i++) {
    sum += parseInt(cleaned.charAt(i)) * weights2[i];
  }
  remainder = sum % 11;
  if (remainder < 2) remainder = 0;
  else remainder = 11 - remainder;
  if (remainder !== parseInt(cleaned.charAt(13))) return false;
  
  return true;
}