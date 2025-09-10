'use client';

import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  ChartData,
  ChartOptions,
  TooltipItem,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

interface ChartCardProps {
  title: string;
  data: ChartData<'line'>;
  loading?: boolean;
  error?: string;
  height?: number;
}

export function ChartCard({ title, data, loading, error, height = 400 }: ChartCardProps) {
  const options: ChartOptions<'line'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
        labels: {
          color: '#e2e8f0',
          usePointStyle: true,
          padding: 20,
        },
      },
      tooltip: {
        backgroundColor: 'rgba(15, 23, 42, 0.95)',
        titleColor: '#e2e8f0',
        bodyColor: '#cbd5e1',
        borderColor: 'rgba(6, 182, 212, 0.3)',
        borderWidth: 1,
        cornerRadius: 12,
        displayColors: true,
        callbacks: {
          label: function(context: TooltipItem<'line'>) {
            const label = context.dataset.label || '';
            const value = context.parsed.y;
            return `${label}: ${value.toLocaleString('pt-BR')}`;
          },
        },
      },
    },
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.1)',
        },
        ticks: {
          color: '#94a3b8',
          callback: function(tickValue) {
            return typeof tickValue === 'number' ? tickValue.toLocaleString('pt-BR') : tickValue;
          },
        },
        beginAtZero: true,
      },
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 3,
      },
      point: {
        radius: 6,
        hoverRadius: 8,
        borderWidth: 2,
      },
    },
    interaction: {
      intersect: false,
      mode: 'index',
    },
  };

  if (loading) {
    return (
      <Card className="glass neon-glow">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Skeleton className="h-4 w-32" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="w-full" style={{ height: height }} />
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="glass neon-glow">
        <CardHeader>
          <CardTitle className="text-slate-200">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg p-8" style={{ height: height }}>
            <div className="text-center">
              <p className="font-medium">Erro ao carregar gráfico</p>
              <p className="text-sm text-red-300 mt-1">{error}</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="glass neon-glow neon-glow-hover transition-all duration-300">
      <CardHeader>
        <CardTitle className="text-slate-200">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div style={{ height: height }}>
          <Line data={data} options={options} />
        </div>
      </CardContent>
    </Card>
  );
}