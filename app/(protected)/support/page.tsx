'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HeadphonesIcon, Plus, MessageCircle } from 'lucide-react';

export default function SupportPage() {
  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Suporte
        </h1>
        <p className="text-slate-400 mt-1">
          Abra chamados de suporte ou veja seus tickets existentes
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* New Ticket */}
        <Card className="glass neon-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-cyan-400" />
              Novo Chamado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Título *
              </label>
              <Input placeholder="Descreva resumidamente o problema" />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Descrição *
              </label>
              <textarea
                className="flex min-h-[100px] w-full rounded-xl border border-slate-700 bg-slate-900/50 backdrop-blur-sm px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/50 focus:border-cyan-400/50 disabled:cursor-not-allowed disabled:opacity-50 neon-glow"
                placeholder="Descreva o problema detalhadamente..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Anexo (opcional)
              </label>
              <div className="border-2 border-dashed border-slate-700 hover:border-cyan-400/50 rounded-xl p-4 text-center transition-colors">
                <HeadphonesIcon className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                <p className="text-sm text-slate-400">
                  Clique para selecionar arquivos
                </p>
              </div>
            </div>

            <Button className="w-full">
              Abrir Chamado
            </Button>
          </CardContent>
        </Card>

        {/* Existing Tickets */}
        <Card className="glass neon-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-cyan-400" />
              Meus Chamados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-12">
              <HeadphonesIcon className="mx-auto h-12 w-12 text-slate-500 mb-4" />
              <p className="text-slate-400">Nenhum chamado encontrado</p>
              <p className="text-sm text-slate-500 mt-1">
                Seus chamados de suporte aparecerão aqui
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}