export type Role = 'admin' | 'representante' | 'vendedor';

export interface Me {
  id: string;
  name: string;
  email: string;
  role: Role;
}

export interface LoginRequest {
  usuario: string;
  senha: string;
}

export interface LoginResponse {
  success: boolean;
  message?: string;
}