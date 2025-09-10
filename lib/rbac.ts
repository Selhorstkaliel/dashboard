import { Role } from '@/types/auth';

export function isAdmin(role: Role): boolean {
  return role === 'admin';
}

export function isRep(role: Role): boolean {
  return role === 'representante';
}

export function isVendedor(role: Role): boolean {
  return role === 'vendedor';
}

export function canManageReps(role: Role): boolean {
  return isAdmin(role);
}

export function canManageVendedores(role: Role): boolean {
  return isAdmin(role) || isRep(role);
}

export function canEditEntryStatus(role: Role): boolean {
  return isAdmin(role);
}

export function hasAccessToConfig(_role: Role): boolean {
  return true; // All users can access config page (different tabs based on role)
}

export function hasAccessToDashboard(_role: Role): boolean {
  return true; // All users can access dashboard
}

export function hasAccessToCadastro(_role: Role): boolean {
  return true; // All users can access cadastro
}

export function hasAccessToSupport(_role: Role): boolean {
  return true; // All users can access support
}