import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { apiGet, apiPost, ApiException } from '@/lib/api';
import { Me, LoginRequest } from '@/types/auth';

export function useAuth() {
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => apiGet<Me>('/auth/me'),
    retry: false,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: (credentials: LoginRequest) => apiPost('/auth/login', credentials),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth'] });
      router.push('/dashboard');
    },
  });

  const logoutMutation = useMutation({
    mutationFn: () => apiPost('/auth/logout', {}),
    onSuccess: () => {
      queryClient.clear();
      router.push('/login');
    },
  });

  const isAuthenticated = !!user && !error;
  const isAdmin = user?.role === 'admin';
  const isRep = user?.role === 'representante';
  const isVendedor = user?.role === 'vendedor';

  return {
    user,
    isLoading,
    error,
    isAuthenticated,
    isAdmin,
    isRep,
    isVendedor,
    login: loginMutation.mutate,
    logout: logoutMutation.mutate,
    loginLoading: loginMutation.isPending,
    loginError: loginMutation.error,
  };
}