export interface ChartDataPoint {
  day: number;
  value: number;
}

export interface VendasChartData {
  limpezas: ChartDataPoint[];
}

export interface RatingChartData {
  feito: ChartDataPoint[];
  naoFeito: ChartDataPoint[];
}

export interface StatsResponse {
  vendasLimpezas: number;
  vendasRating: number;
  totalBruto: number;
  totalLiquido: number;
}