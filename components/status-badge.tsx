import { Badge } from '@/components/ui/badge';
import { EntryStatus } from '@/types/entries';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

interface StatusBadgeProps {
  status: EntryStatus;
}

export function StatusBadge({ status }: StatusBadgeProps) {
  switch (status) {
    case 'Restrição':
      return (
        <Badge variant="destructive" className="flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Restrição
        </Badge>
      );
    case 'Finalizado':
      return (
        <Badge variant="success" className="flex items-center gap-1">
          <CheckCircle className="h-3 w-3" />
          Finalizado
        </Badge>
      );
    case 'Reprotocolo':
      return (
        <Badge variant="warning" className="flex items-center gap-1">
          <RefreshCw className="h-3 w-3" />
          Reprotocolo
        </Badge>
      );
    default:
      return (
        <Badge variant="outline">
          {status}
        </Badge>
      );
  }
}