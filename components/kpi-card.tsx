import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  change?: number;
  changeLabel?: string;
  loading?: boolean;
  className?: string;
}

export function KpiCard({ 
  title, 
  value, 
  icon: Icon, 
  change, 
  changeLabel,
  loading,
  className 
}: KpiCardProps) {
  if (loading) {
    return (
      <Card className={cn("glass neon-glow", className)}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium text-slate-300">
            {title}
          </CardTitle>
          <div className="w-4 h-4 bg-slate-700 animate-pulse rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-8 bg-slate-700 animate-pulse rounded mb-2"></div>
          {changeLabel && (
            <div className="h-4 w-24 bg-slate-700 animate-pulse rounded"></div>
          )}
        </CardContent>
      </Card>
    );
  }

  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className={cn("glass neon-glow neon-glow-hover transition-all duration-300", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-slate-300">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-cyan-400" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-slate-100 mb-1">
          {typeof value === 'number' ? value.toLocaleString('pt-BR') : value}
        </div>
        {changeLabel && (
          <p className="text-xs text-slate-400 flex items-center gap-1">
            {change !== undefined && (
              <span className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                isPositive && "bg-green-500/10 text-green-400",
                isNegative && "bg-red-500/10 text-red-400",
                change === 0 && "bg-slate-500/10 text-slate-400"
              )}>
                {change > 0 && "+"}{change?.toFixed(1)}%
              </span>
            )}
            <span>{changeLabel}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}