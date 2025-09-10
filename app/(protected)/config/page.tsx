'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Settings, User, Users, Shield } from 'lucide-react';

export default function ConfigPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Configurações
        </h1>
        <p className="text-slate-400 mt-1">
          Gerencie seu perfil e configurações do sistema
        </p>
      </div>

      <Card className="glass neon-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-cyan-400" />
            Configurações
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="profile" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="profile">Perfil</TabsTrigger>
              <TabsTrigger value="representantes">Representantes</TabsTrigger>
              <TabsTrigger value="vendedores">Vendedores</TabsTrigger>
              <TabsTrigger value="sistema">Sistema</TabsTrigger>
            </TabsList>

            <TabsContent value="profile" className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <div className="w-16 h-16 bg-gradient-to-r from-cyan-500 to-purple-500 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Usuário Demo</h3>
                  <p className="text-slate-400">usuario@demo.com</p>
                  <p className="text-sm text-cyan-400 capitalize">Admin</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nome Completo
                  </label>
                  <Input defaultValue="Usuário Demo" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    E-mail
                  </label>
                  <Input defaultValue="usuario@demo.com" type="email" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Telefone
                  </label>
                  <Input placeholder="(00) 00000-0000" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Nova Senha
                  </label>
                  <Input type="password" placeholder="Digite uma nova senha" />
                </div>
              </div>

              <div className="flex justify-end">
                <Button>Salvar Alterações</Button>
              </div>
            </TabsContent>

            <TabsContent value="representantes" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Representantes</h3>
                  <p className="text-sm text-slate-400">Gerencie os representantes do sistema</p>
                </div>
                <Button className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Novo Representante
                </Button>
              </div>

              <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <Users className="mx-auto h-12 w-12 text-slate-500 mb-4" />
                <p className="text-slate-400">Nenhum representante cadastrado</p>
                <p className="text-sm text-slate-500 mt-1">
                  Cadastre representantes para gerenciar vendedores
                </p>
              </div>
            </TabsContent>

            <TabsContent value="vendedores" className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Vendedores</h3>
                  <p className="text-sm text-slate-400">Gerencie os vendedores vinculados</p>
                </div>
                <Button className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  Novo Vendedor
                </Button>
              </div>

              <div className="text-center py-12 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <User className="mx-auto h-12 w-12 text-slate-500 mb-4" />
                <p className="text-slate-400">Nenhum vendedor cadastrado</p>
                <p className="text-sm text-slate-500 mt-1">
                  Cadastre vendedores para realizar vendas
                </p>
              </div>
            </TabsContent>

            <TabsContent value="sistema" className="space-y-6">
              <div className="flex items-center gap-4 p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                <Shield className="h-8 w-8 text-cyan-400" />
                <div>
                  <h3 className="text-lg font-semibold text-slate-200">Configurações do Sistema</h3>
                  <p className="text-slate-400">Configurações avançadas e segurança</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <div>
                    <h4 className="font-medium text-slate-200">Notificações por Email</h4>
                    <p className="text-sm text-slate-400">Receber notificações sobre novos cadastros</p>
                  </div>
                  <Button variant="outline" size="sm">Ativado</Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <div>
                    <h4 className="font-medium text-slate-200">Backup Automático</h4>
                    <p className="text-sm text-slate-400">Backup diário dos dados</p>
                  </div>
                  <Button variant="outline" size="sm">Configurar</Button>
                </div>

                <div className="flex items-center justify-between p-4 bg-slate-800/30 rounded-xl border border-slate-700/50">
                  <div>
                    <h4 className="font-medium text-slate-200">Auditoria de Acessos</h4>
                    <p className="text-sm text-slate-400">Log de acessos ao sistema</p>
                  </div>
                  <Button variant="outline" size="sm">Visualizar</Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}