'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/components/ui/use-toast';
import { loginSchema } from '@/lib/schemas';
import { LoginRequest } from '@/types/auth';
import { Eye, EyeOff, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const { login, loginLoading, loginError } = useAuth();
  const { toast } = useToast();
  
  const form = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      usuario: '',
      senha: '',
    },
  });

  const onSubmit = async (data: LoginRequest) => {
    try {
      await login(data);
      toast({
        title: 'Login realizado com sucesso',
        description: 'Redirecionando para o dashboard...',
        variant: 'default',
      });
    } catch (error) {
      toast({
        title: 'Erro no login',
        description: error instanceof Error ? error.message : 'Credenciais inválidas',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="glass neon-glow">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 w-12 h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-purple-500 flex items-center justify-center neon-glow">
              <LogIn className="h-6 w-6 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-center bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
              LIMITCLEAN
            </CardTitle>
            <CardDescription className="text-slate-400">
              Entre com suas credenciais para acessar o sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label htmlFor="usuario" className="block text-sm font-medium text-slate-300 mb-2">
                  Usuário
                </label>
                <Input
                  id="usuario"
                  type="text"
                  placeholder="Digite seu usuário"
                  {...form.register('usuario')}
                  className="focus-ring"
                  aria-invalid={!!form.formState.errors.usuario}
                />
                {form.formState.errors.usuario && (
                  <p className="mt-1 text-sm text-red-400" role="alert">
                    {form.formState.errors.usuario.message}
                  </p>
                )}
              </div>
              
              <div>
                <label htmlFor="senha" className="block text-sm font-medium text-slate-300 mb-2">
                  Senha
                </label>
                <div className="relative">
                  <Input
                    id="senha"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Digite sua senha"
                    {...form.register('senha')}
                    className="focus-ring pr-10"
                    aria-invalid={!!form.formState.errors.senha}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 focus:outline-none focus:text-slate-300"
                    aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {form.formState.errors.senha && (
                  <p className="mt-1 text-sm text-red-400" role="alert">
                    {form.formState.errors.senha.message}
                  </p>
                )}
              </div>

              <Button
                type="submit"
                disabled={loginLoading}
                className="w-full"
              >
                {loginLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Entrando...</span>
                  </div>
                ) : (
                  <span>Entrar</span>
                )}
              </Button>

              {loginError && (
                <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-500/50">
                  <p className="text-sm text-red-300 text-center">
                    {loginError.message}
                  </p>
                </div>
              )}
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}