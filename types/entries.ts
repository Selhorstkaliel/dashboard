export type EntryStatus = 'Restrição' | 'Finalizado' | 'Reprotocolo';
export type EntryType = 'limpeza' | 'rating';

export interface Entry extends Record<string, unknown> {
  id: string;
  tipo: EntryType;
  doc: string;
  nome: string;
  telefone?: string;
  vendedor?: string;
  valor: number;
  desconto: number;
  liquido: number;
  status: EntryStatus;
  createdAt: string;
  contratoUrl?: string;
}

export interface CreateEntryRequest {
  tipo: EntryType;
  doc: string;
  nome: string;
  telefone?: string;
  vendedor?: string;
  valor?: number; // Optional for rating entries
  // Additional fields for rating
  email?: string;
  endereco?: string;
  cep?: string;
  cidade?: string;
  estado?: string;
  faturamento?: number;
  funcionarios?: number;
  escrituracao?: 'Simples' | 'Real' | 'Presumido';
}

export interface CreateEntryResponse {
  id: string;
  valorBruto: number;
  valorLiquido: number;
  desconto: number;
  contratoUrl?: string;
}

export interface UpdateEntryStatusRequest {
  status: EntryStatus;
}

export interface DocumentValidationResponse {
  valid: boolean;
  message?: string;
}