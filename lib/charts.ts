import { startOfMonth, endOfMonth, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface QuinzenaRange {
  start: Date;
  end: Date;
  label: string;
}

export function getQuinzenaRange(year: number, month: number, half: 1 | 2): QuinzenaRange {
  const monthStart = startOfMonth(new Date(year, month - 1));
  const monthEnd = endOfMonth(new Date(year, month - 1));
  
  if (half === 1) {
    // First half: 1st to 15th
    const start = monthStart;
    const end = new Date(year, month - 1, 15, 23, 59, 59, 999);
    return {
      start,
      end,
      label: `1ª Quinzena de ${format(monthStart, 'MMMM yyyy', { locale: ptBR })}`
    };
  } else {
    // Second half: 16th to end of month
    const start = new Date(year, month - 1, 16);
    const end = monthEnd;
    return {
      start,
      end,
      label: `2ª Quinzena de ${format(monthStart, 'MMMM yyyy', { locale: ptBR })}`
    };
  }
}

export function splitIntoQuinzena(date: Date): 1 | 2 {
  const day = date.getDate();
  return day <= 15 ? 1 : 2;
}

export function getChartLabels(year: number, month: number, half?: 1 | 2): string[] {
  const daysInMonth = new Date(year, month, 0).getDate();
  
  if (half === 1) {
    // First half: days 1-15
    return Array.from({ length: 15 }, (_, i) => `${i + 1}`);
  } else if (half === 2) {
    // Second half: days 16 to end of month
    return Array.from({ length: daysInMonth - 15 }, (_, i) => `${i + 16}`);
  } else {
    // Full month
    return Array.from({ length: daysInMonth }, (_, i) => `${i + 1}`);
  }
}

export function getMonthLabel(month: number): string {
  const date = new Date(2024, month - 1);
  return format(date, 'MMMM', { locale: ptBR });
}

export function getYearOptions(): Array<{ value: number; label: string }> {
  const currentYear = new Date().getFullYear();
  const years = [];
  
  for (let i = currentYear; i >= currentYear - 5; i--) {
    years.push({ value: i, label: i.toString() });
  }
  
  return years;
}

export function getMonthOptions(): Array<{ value: number; label: string }> {
  return [
    { value: 1, label: 'Janeiro' },
    { value: 2, label: 'Fevereiro' },
    { value: 3, label: 'Março' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Maio' },
    { value: 6, label: 'Junho' },
    { value: 7, label: 'Julho' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Setembro' },
    { value: 10, label: 'Outubro' },
    { value: 11, label: 'Novembro' },
    { value: 12, label: 'Dezembro' },
  ];
}

export function getQuinzenaOptions(): Array<{ value: 1 | 2; label: string }> {
  return [
    { value: 1, label: '1ª Quinzena (1-15)' },
    { value: 2, label: '2ª Quinzena (16-fim)' },
  ];
}