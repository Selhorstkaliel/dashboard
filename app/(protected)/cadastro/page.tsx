'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Checkbox } from '@/components/ui/checkbox';
import { RHFInput } from '@/components/forms/rhf-input';
import { RHFMaskedInput } from '@/components/forms/rhf-masked-input';
import { RHFSelect } from '@/components/forms/rhf-select';
import { RHFFile } from '@/components/forms/rhf-file';
import { FormSection } from '@/components/forms/form-section';
import { useToast } from '@/components/ui/use-toast';
import { apiPost, apiGet } from '@/lib/api';
import { fmtBRL } from '@/lib/format';
import { limpezaSchema, ratingPFSchema, ratingPJSchema, validateCPF, validateCNPJ } from '@/lib/schemas';
import { CreateEntryRequest, CreateEntryResponse, DocumentValidationResponse } from '@/types/entries';
import { PlusCircle, CheckCircle, FileText, Download } from 'lucide-react';

type LimpezaForm = {
  doc: string;
  nome: string;
  telefone?: string;
  vendedor: string;
  valor: number;
};

type RatingPFForm = {
  doc: string;
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  cep: string;
  cidade: string;
  estado: string;
  vendedor: string;
  aceitoTermos: boolean;
  fotoCNH?: File;
  selfie?: File;
};

type RatingPJForm = {
  doc: string;
  nome: string;
  telefone: string;
  email: string;
  endereco: string;
  cep: string;
  cidade: string;
  estado: string;
  faturamento: number;
  funcionarios: number;
  escrituracao: 'Simples' | 'Real' | 'Presumido';
  vendedor: string;
  aceitoTermos: boolean;
  documentosSocios?: File[];
};

export default function CadastroPage() {
  const { toast } = useToast();
  const [serviceType, setServiceType] = useState<'limpeza' | 'rating-pf' | 'rating-pj'>('limpeza');
  const [submissionResult, setSubmissionResult] = useState<CreateEntryResponse | null>(null);

  // Mock vendedores - in real app this would come from API
  const vendedoresOptions = [
    { value: 'vendedor1', label: 'João Silva' },
    { value: 'vendedor2', label: 'Maria Santos' },
    { value: 'vendedor3', label: 'Pedro Oliveira' },
  ];

  const estadosOptions = [
    { value: 'SP', label: 'São Paulo' },
    { value: 'RJ', label: 'Rio de Janeiro' },
    { value: 'MG', label: 'Minas Gerais' },
    { value: 'RS', label: 'Rio Grande do Sul' },
    { value: 'SC', label: 'Santa Catarina' },
    { value: 'PR', label: 'Paraná' },
  ];

  const escrituracaoOptions = [
    { value: 'Simples', label: 'Simples Nacional' },
    { value: 'Real', label: 'Lucro Real' },
    { value: 'Presumido', label: 'Lucro Presumido' },
  ];

  // Forms
  const limpezaForm = useForm<LimpezaForm>({
    resolver: zodResolver(limpezaSchema),
    defaultValues: {
      doc: '',
      nome: '',
      telefone: '',
      vendedor: '',
      valor: 0,
    },
  });

  const ratingPFForm = useForm<RatingPFForm>({
    resolver: zodResolver(ratingPFSchema),
    defaultValues: {
      doc: '',
      nome: '',
      telefone: '',
      email: '',
      endereco: '',
      cep: '',
      cidade: '',
      estado: '',
      vendedor: '',
      aceitoTermos: false,
    },
  });

  const ratingPJForm = useForm<RatingPJForm>({
    resolver: zodResolver(ratingPJSchema),
    defaultValues: {
      doc: '',
      nome: '',
      telefone: '',
      email: '',
      endereco: '',
      cep: '',
      cidade: '',
      estado: '',
      faturamento: 0,
      funcionarios: 0,
      escrituracao: 'Simples',
      vendedor: '',
      aceitoTermos: false,
    },
  });

  // Document validation
  const validateDocument = async (doc: string) => {
    try {
      const response = await apiGet<DocumentValidationResponse>(`/validate?doc=${doc}`);
      return response.valid;
    } catch {
      // Fallback to client-side validation
      const cleaned = doc.replace(/\D/g, '');
      if (cleaned.length === 11) {
        return validateCPF(doc);
      } else if (cleaned.length === 14) {
        return validateCNPJ(doc);
      }
      return false;
    }
  };

  // Submission
  const submitMutation = useMutation({
    mutationFn: async (data: CreateEntryRequest) => {
      // Check if we have files to upload
      const hasFiles = serviceType === 'rating-pf' || serviceType === 'rating-pj';
      
      if (hasFiles) {
        const formData = new FormData();
        Object.entries(data).forEach(([key, value]) => {
          if (value instanceof File) {
            formData.append(key, value);
          } else if (value instanceof Array && value.length > 0 && value[0] instanceof File) {
            value.forEach((file, index) => {
              formData.append(`${key}[${index}]`, file);
            });
          } else {
            formData.append(key, String(value));
          }
        });
        return apiPost<CreateEntryResponse>('/entries', formData);
      } else {
        return apiPost<CreateEntryResponse>('/entries', data);
      }
    },
    onSuccess: (response) => {
      setSubmissionResult(response);
      toast({
        title: 'Cadastro realizado com sucesso!',
        description: `Valor líquido: ${fmtBRL(response.valorLiquido)}`,
        variant: 'default',
      });
    },
    onError: (error) => {
      toast({
        title: 'Erro no cadastro',
        description: error instanceof Error ? error.message : 'Ocorreu um erro inesperado',
        variant: 'destructive',
      });
    },
  });

  const handleLimpezaSubmit = async (data: LimpezaForm) => {
    const isValidDoc = await validateDocument(data.doc);
    if (!isValidDoc) {
      limpezaForm.setError('doc', { message: 'Documento inválido' });
      return;
    }

    const requestData: CreateEntryRequest = {
      tipo: 'limpeza',
      ...data,
    };

    submitMutation.mutate(requestData);
  };

  const handleRatingPFSubmit = async (data: RatingPFForm) => {
    const isValidDoc = await validateDocument(data.doc);
    if (!isValidDoc) {
      ratingPFForm.setError('doc', { message: 'CPF inválido' });
      return;
    }

    const requestData: CreateEntryRequest = {
      tipo: 'rating',
      ...data,
    };

    submitMutation.mutate(requestData);
  };

  const handleRatingPJSubmit = async (data: RatingPJForm) => {
    const isValidDoc = await validateDocument(data.doc);
    if (!isValidDoc) {
      ratingPJForm.setError('doc', { message: 'CNPJ inválido' });
      return;
    }

    const requestData: CreateEntryRequest = {
      tipo: 'rating',
      ...data,
    };

    submitMutation.mutate(requestData);
  };

  const resetForm = () => {
    setSubmissionResult(null);
    limpezaForm.reset();
    ratingPFForm.reset();
    ratingPJForm.reset();
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Cadastro de Serviços
        </h1>
        <p className="text-slate-400 mt-1">
          Cadastre novos serviços de limpeza ou rating de crédito
        </p>
      </div>

      {submissionResult ? (
        <Card className="glass neon-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-400">
              <CheckCircle className="h-6 w-6" />
              Cadastro Finalizado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-slate-400">Valor Bruto</p>
                <p className="text-lg font-semibold text-slate-200">
                  {fmtBRL(submissionResult.valorBruto)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Desconto</p>
                <p className="text-lg font-semibold text-slate-200">
                  {fmtBRL(submissionResult.valorBruto - submissionResult.valorLiquido)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">Valor Líquido</p>
                <p className="text-lg font-semibold text-cyan-400">
                  {fmtBRL(submissionResult.valorLiquido)}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-400">% Desconto</p>
                <p className="text-lg font-semibold text-slate-200">
                  {submissionResult.desconto.toFixed(1)}%
                </p>
              </div>
            </div>

            {submissionResult.contratoUrl && (
              <div className="flex justify-center pt-4 border-t border-slate-700">
                <Button asChild variant="outline" className="flex items-center gap-2">
                  <a
                    href={submissionResult.contratoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Download className="h-4 w-4" />
                    Baixar Contrato
                  </a>
                </Button>
              </div>
            )}

            <div className="flex justify-center pt-4">
              <Button onClick={resetForm} className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Novo Cadastro
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card className="glass neon-glow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-cyan-400" />
              Tipo de Serviço
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Tabs value={serviceType} onValueChange={(value) => setServiceType(value as typeof serviceType)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="limpeza">Limpeza</TabsTrigger>
                <TabsTrigger value="rating-pf">Rating PF</TabsTrigger>
                <TabsTrigger value="rating-pj">Rating PJ</TabsTrigger>
              </TabsList>

              <TabsContent value="limpeza">
                <form onSubmit={limpezaForm.handleSubmit(handleLimpezaSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <RHFMaskedInput
                      control={limpezaForm.control}
                      name="doc"
                      label="CPF/CNPJ"
                      mask="999.999.999-99"
                      placeholder="000.000.000-00"
                      required
                    />
                    <RHFInput
                      control={limpezaForm.control}
                      name="nome"
                      label="Nome Completo"
                      placeholder="Digite o nome completo"
                      required
                    />
                    <RHFMaskedInput
                      control={limpezaForm.control}
                      name="telefone"
                      label="Telefone"
                      mask="(99) 99999-9999"
                      placeholder="(00) 00000-0000"
                    />
                    <RHFSelect
                      control={limpezaForm.control}
                      name="vendedor"
                      label="Vendedor"
                      options={vendedoresOptions}
                      required
                    />
                    <RHFInput
                      control={limpezaForm.control}
                      name="valor"
                      label="Valor"
                      type="number"
                      placeholder="0.00"
                      required
                      className="md:col-span-2"
                    />
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={submitMutation.isPending}
                      className="min-w-32"
                    >
                      {submitMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="rating-pf">
                <form onSubmit={ratingPFForm.handleSubmit(handleRatingPFSubmit)} className="space-y-6">
                  <FormSection title="Dados Pessoais">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RHFMaskedInput
                        control={ratingPFForm.control}
                        name="doc"
                        label="CPF"
                        mask="999.999.999-99"
                        placeholder="000.000.000-00"
                        required
                      />
                      <RHFInput
                        control={ratingPFForm.control}
                        name="nome"
                        label="Nome Completo"
                        placeholder="Digite o nome completo"
                        required
                      />
                      <RHFMaskedInput
                        control={ratingPFForm.control}
                        name="telefone"
                        label="Telefone"
                        mask="(99) 99999-9999"
                        placeholder="(00) 00000-0000"
                        required
                      />
                      <RHFInput
                        control={ratingPFForm.control}
                        name="email"
                        label="E-mail"
                        type="email"
                        placeholder="email@exemplo.com"
                        required
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Endereço">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RHFInput
                        control={ratingPFForm.control}
                        name="endereco"
                        label="Endereço"
                        placeholder="Rua, número, bairro"
                        required
                        className="md:col-span-2"
                      />
                      <RHFMaskedInput
                        control={ratingPFForm.control}
                        name="cep"
                        label="CEP"
                        mask="99999-999"
                        placeholder="00000-000"
                        required
                      />
                      <RHFInput
                        control={ratingPFForm.control}
                        name="cidade"
                        label="Cidade"
                        placeholder="Nome da cidade"
                        required
                      />
                      <RHFSelect
                        control={ratingPFForm.control}
                        name="estado"
                        label="Estado"
                        options={estadosOptions}
                        required
                      />
                      <RHFSelect
                        control={ratingPFForm.control}
                        name="vendedor"
                        label="Vendedor"
                        options={vendedoresOptions}
                        required
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Documentos">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RHFFile
                        control={ratingPFForm.control}
                        name="fotoCNH"
                        label="Foto da CNH/RG"
                        accept="image/*"
                        maxSize={2 * 1024 * 1024} // 2MB
                        required
                      />
                      <RHFFile
                        control={ratingPFForm.control}
                        name="selfie"
                        label="Selfie"
                        accept="image/*"
                        maxSize={2 * 1024 * 1024} // 2MB
                        required
                      />
                    </div>
                  </FormSection>

                  <div className="flex items-center space-x-2 p-4 border border-slate-700 rounded-xl">
                    <Checkbox
                      id="termos-pf"
                      checked={ratingPFForm.watch('aceitoTermos')}
                      onCheckedChange={(checked) => ratingPFForm.setValue('aceitoTermos', !!checked)}
                    />
                    <label htmlFor="termos-pf" className="text-sm text-slate-300">
                      Li e aceito os termos e condições do serviço *
                    </label>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={submitMutation.isPending}
                      className="min-w-32"
                    >
                      {submitMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </TabsContent>

              <TabsContent value="rating-pj">
                <form onSubmit={ratingPJForm.handleSubmit(handleRatingPJSubmit)} className="space-y-6">
                  <FormSection title="Dados da Empresa">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RHFMaskedInput
                        control={ratingPJForm.control}
                        name="doc"
                        label="CNPJ"
                        mask="99.999.999/9999-99"
                        placeholder="00.000.000/0000-00"
                        required
                      />
                      <RHFInput
                        control={ratingPJForm.control}
                        name="nome"
                        label="Razão Social"
                        placeholder="Digite a razão social"
                        required
                      />
                      <RHFMaskedInput
                        control={ratingPJForm.control}
                        name="telefone"
                        label="Telefone"
                        mask="(99) 99999-9999"
                        placeholder="(00) 00000-0000"
                        required
                      />
                      <RHFInput
                        control={ratingPJForm.control}
                        name="email"
                        label="E-mail"
                        type="email"
                        placeholder="email@empresa.com"
                        required
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Endereço">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <RHFInput
                        control={ratingPJForm.control}
                        name="endereco"
                        label="Endereço"
                        placeholder="Rua, número, bairro"
                        required
                        className="md:col-span-2"
                      />
                      <RHFMaskedInput
                        control={ratingPJForm.control}
                        name="cep"
                        label="CEP"
                        mask="99999-999"
                        placeholder="00000-000"
                        required
                      />
                      <RHFInput
                        control={ratingPJForm.control}
                        name="cidade"
                        label="Cidade"
                        placeholder="Nome da cidade"
                        required
                      />
                      <RHFSelect
                        control={ratingPJForm.control}
                        name="estado"
                        label="Estado"
                        options={estadosOptions}
                        required
                      />
                      <RHFSelect
                        control={ratingPJForm.control}
                        name="vendedor"
                        label="Vendedor"
                        options={vendedoresOptions}
                        required
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Informações Financeiras">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <RHFInput
                        control={ratingPJForm.control}
                        name="faturamento"
                        label="Faturamento Anual"
                        type="number"
                        placeholder="0.00"
                        required
                      />
                      <RHFInput
                        control={ratingPJForm.control}
                        name="funcionarios"
                        label="Número de Funcionários"
                        type="number"
                        placeholder="0"
                        required
                      />
                      <RHFSelect
                        control={ratingPJForm.control}
                        name="escrituracao"
                        label="Tipo de Escrituração"
                        options={escrituracaoOptions}
                        required
                      />
                    </div>
                  </FormSection>

                  <FormSection title="Documentos dos Sócios">
                    <RHFFile
                      control={ratingPJForm.control}
                      name="documentosSocios"
                      label="Documentos dos Sócios"
                      accept="image/*,.pdf"
                      multiple
                      maxSize={5 * 1024 * 1024} // 5MB
                    />
                  </FormSection>

                  <div className="flex items-center space-x-2 p-4 border border-slate-700 rounded-xl">
                    <Checkbox
                      id="termos-pj"
                      checked={ratingPJForm.watch('aceitoTermos')}
                      onCheckedChange={(checked) => ratingPJForm.setValue('aceitoTermos', !!checked)}
                    />
                    <label htmlFor="termos-pj" className="text-sm text-slate-300">
                      Li e aceito os termos e condições do serviço *
                    </label>
                  </div>
                  
                  <div className="flex justify-end">
                    <Button 
                      type="submit" 
                      disabled={submitMutation.isPending}
                      className="min-w-32"
                    >
                      {submitMutation.isPending ? 'Salvando...' : 'Salvar'}
                    </Button>
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}