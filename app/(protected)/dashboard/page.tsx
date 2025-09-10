'use client';

import { useQuery } from '@tanstack/react-query';
import { 
  DollarSign, 
  TrendingUp, 
  Users, 
  Activity,
  Edit 
} from 'lucide-react';
import { KpiCard } from '@/components/kpi-card';
import { ChartCard } from '@/components/chart-card';
import { DataTable } from '@/components/data-table';
import { StatusBadge } from '@/components/status-badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/useAuth';
import { useFilters } from '@/store/filters';
import { useToast } from '@/components/ui/use-toast';
import { apiGet } from '@/lib/api';
import { fmtBRL, fmtDate } from '@/lib/format';
import { getYearOptions, getMonthOptions, getQuinzenaOptions, getMonthLabel } from '@/lib/charts';
import { StatsResponse, VendasChartData, RatingChartData } from '@/types/charts';
import { Entry } from '@/types/entries';
import { ChartData } from 'chart.js';

export default function DashboardPage() {
  const { user, isAdmin } = useAuth();
  const { toast } = useToast();
  const { year, month, half, setYear, setMonth, setHalf } = useFilters();

  // KPIs Query
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['stats'],
    queryFn: () => apiGet<StatsResponse>('/stats'),
  });

  // Charts Queries
  const { data: vendasChart, isLoading: vendasLoading, error: vendasError } = useQuery({
    queryKey: ['charts', 'vendas', year, month, half],
    queryFn: () => apiGet<VendasChartData>(`/charts/vendas?year=${year}&month=${month}${half ? `&half=${half}` : ''}`),
  });

  const { data: ratingChart, isLoading: ratingLoading, error: ratingError } = useQuery({
    queryKey: ['charts', 'rating', year, month, half],
    queryFn: () => apiGet<RatingChartData>(`/charts/rating?year=${year}&month=${month}${half ? `&half=${half}` : ''}`),
  });

  // Entries Query
  const { data: entries, isLoading: entriesLoading, error: entriesError } = useQuery({
    queryKey: ['entries'],
    queryFn: () => apiGet<Entry[]>('/entries?limit=50'),
  });

  // Chart data preparation
  const vendasChartData: ChartData<'line'> = {
    labels: vendasChart?.limpezas.map(d => `Dia ${d.day}`) || [],
    datasets: [
      {
        label: 'Limpezas',
        data: vendasChart?.limpezas.map(d => d.value) || [],
        borderColor: 'rgb(6, 182, 212)',
        backgroundColor: 'rgba(6, 182, 212, 0.1)',
        pointBackgroundColor: 'rgb(6, 182, 212)',
        pointBorderColor: 'rgb(139, 92, 246)',
      },
    ],
  };

  const ratingChartData: ChartData<'line'> = {
    labels: ratingChart?.feito.map(d => `Dia ${d.day}`) || [],
    datasets: [
      {
        label: 'Rating Realizado',
        data: ratingChart?.feito.map(d => d.value) || [],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        pointBackgroundColor: 'rgb(34, 197, 94)',
        pointBorderColor: 'rgb(139, 92, 246)',
      },
      {
        label: 'Rating Não Realizado',
        data: ratingChart?.naoFeito.map(d => d.value) || [],
        borderColor: 'rgb(239, 68, 68)',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        pointBackgroundColor: 'rgb(239, 68, 68)',
        pointBorderColor: 'rgb(139, 92, 246)',
      },
    ],
  };

  // Table configuration
  const columns = [
    {
      key: 'nome' as keyof Entry,
      title: 'Nome',
      width: '20%',
    },
    {
      key: 'doc' as keyof Entry,
      title: 'Documento',
      width: '15%',
    },
    {
      key: 'tipo' as keyof Entry,
      title: 'Tipo',
      width: '10%',
      render: (value: Entry[keyof Entry]) => (
        <span className="capitalize">{String(value)}</span>
      ),
    },
    {
      key: 'vendedor' as keyof Entry,
      title: 'Vendedor',
      width: '15%',
    },
    {
      key: 'status' as keyof Entry,
      title: 'Status',
      width: '15%',
      render: (value: Entry[keyof Entry]) => (
        <StatusBadge status={String(value) as Entry['status']} />
      ),
    },
    {
      key: 'createdAt' as keyof Entry,
      title: 'Data',
      width: '15%',
      render: (value: Entry[keyof Entry]) => fmtDate(String(value)),
    },
    {
      key: 'valor' as keyof Entry,
      title: 'Valor',
      width: '10%',
      render: (value: Entry[keyof Entry]) => fmtBRL(Number(value)),
      className: 'text-right',
    },
  ];

  const handleEditStatus = (_entry: Entry) => {
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'A edição de status será implementada em breve',
    });
  };

  return (
    <div className="container mx-auto px-4 py-6 space-y-6">
      {/* Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-1">
            Bem-vindo, {user?.name}
          </p>
        </div>
        
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <Select value={year.toString()} onValueChange={(value) => setYear(parseInt(value))}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Ano" />
            </SelectTrigger>
            <SelectContent>
              {getYearOptions().map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={month.toString()} onValueChange={(value) => setMonth(parseInt(value))}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Mês" />
            </SelectTrigger>
            <SelectContent>
              {getMonthOptions().map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={half?.toString() || 'all'} onValueChange={(value) => setHalf(value === 'all' ? undefined : parseInt(value) as 1 | 2)}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Quinzena" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Mês todo</SelectItem>
              {getQuinzenaOptions().map((option) => (
                <SelectItem key={option.value} value={option.value.toString()}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard
          title="Vendas Limpezas"
          value={stats?.vendasLimpezas || 0}
          icon={Users}
          loading={statsLoading}
        />
        <KpiCard
          title="Vendas Rating"
          value={stats?.vendasRating || 0}
          icon={TrendingUp}
          loading={statsLoading}
        />
        <KpiCard
          title="Total Bruto"
          value={stats ? fmtBRL(stats.totalBruto) : '-'}
          icon={DollarSign}
          loading={statsLoading}
        />
        <KpiCard
          title="Total Líquido"
          value={stats ? fmtBRL(stats.totalLiquido) : '-'}
          icon={Activity}
          loading={statsLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard
          title={`Vendas de Limpezas - ${getMonthLabel(month)} ${year}${half ? ` (${half}ª Quinzena)` : ''}`}
          data={vendasChartData}
          loading={vendasLoading}
          error={vendasError?.message}
          height={350}
        />
        <ChartCard
          title={`Rating de Crédito - ${getMonthLabel(month)} ${year}${half ? ` (${half}ª Quinzena)` : ''}`}
          data={ratingChartData}
          loading={ratingLoading}
          error={ratingError?.message}
          height={350}
        />
      </div>

      {/* Entries Table */}
      <DataTable<Entry>
        title="Últimos Lançamentos"
        data={entries || []}
        columns={columns}
        loading={entriesLoading}
        error={entriesError?.message}
        emptyMessage="Nenhum lançamento encontrado"
        actions={isAdmin ? (row) => (
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleEditStatus(row)}
            className="flex items-center gap-1"
          >
            <Edit className="h-3 w-3" />
            Editar Status
          </Button>
        ) : undefined}
      />
    </div>
  );
}