import { Role } from './auth';

export interface User {
  id: string;
  name: string;
  email: string;
  role: Role;
  telefone?: string;
  desconto?: number;
  representanteId?: string;
}

export interface Representante {
  id: string;
  name: string;
  email: string;
  desconto: number;
  createdAt: string;
}

export interface Vendedor {
  id: string;
  name: string;
  email: string;
  representanteId: string;
  representanteName?: string;
  desconto?: number;
  createdAt: string;
}

export interface CreateRepresentanteRequest {
  name: string;
  email: string;
  desconto: number;
}

export interface CreateVendedorRequest {
  name: string;
  email: string;
  representanteId: string;
  desconto?: number;
}

export interface UpdateProfileRequest {
  name?: string;
  email?: string;
  telefone?: string;
  senha?: string;
}

export interface Ticket {
  id: string;
  title: string;
  description: string;
  status: 'open' | 'closed' | 'pending';
  createdAt: string;
  userId: string;
  anexoUrl?: string;
}

export interface CreateTicketRequest {
  title: string;
  description: string;
  anexo?: File;
}