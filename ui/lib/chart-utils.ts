// Utility functions for chart data preparation

import { ORMResult, LatencyMetrics } from '@/types/benchmark';

export interface ChartDataPoint {
  name: string;
  [key: string]: string | number;
}

export function prepareLatencyChartData(
  results: ORMResult[],
  metric: keyof LatencyMetrics = 'median',
): ChartDataPoint[] {
  return results.map((result) => ({
    name: `${result.ormName} v${result.ormVersion}`,
    value: result.metrics.latency[metric],
    ormId: result.ormId,
  }));
}

export function prepareThroughputChartData(
  results: ORMResult[],
): ChartDataPoint[] {
  return results.map((result) => ({
    name: `${result.ormName} v${result.ormVersion}`,
    value: result.metrics.throughput.rps,
    ormId: result.ormId,
  }));
}

export function prepareMemoryChartData(results: ORMResult[]): ChartDataPoint[] {
  return results.map((result) => {
    const heapUsed = result.metrics.memory.heapUsed;
    const avgHeap =
      heapUsed.length > 0
        ? heapUsed.reduce((sum, val) => sum + val, 0) / heapUsed.length
        : 0;

    return {
      name: `${result.ormName} v${result.ormVersion}`,
      value: avgHeap / (1024 * 1024), // Convert to MB
      ormId: result.ormId,
    };
  });
}

export function prepareLatencyDistributionData(
  results: ORMResult[],
): ChartDataPoint[] {
  const metrics = ['p50', 'p95', 'p99', 'p999'];

  return results.map((result) => {
    const dataPoint: ChartDataPoint = {
      name: `${result.ormName} v${result.ormVersion}`,
    };

    dataPoint['p50'] = result.metrics.latency.median;
    dataPoint['p95'] = result.metrics.latency.p95;
    dataPoint['p99'] = result.metrics.latency.p99;
    dataPoint['p999'] = result.metrics.latency.p999;

    return dataPoint;
  });
}

export const ORM_COLORS: Record<string, string> = {
  drizzle: 'hsl(142, 76%, 36%)', // Green
  prisma: 'hsl(210, 100%, 50%)', // Blue
  typeorm: 'hsl(24, 100%, 50%)', // Orange
  mikro: 'hsl(280, 100%, 50%)', // Purple
  sequelize: 'hsl(340, 100%, 50%)', // Pink
};

export function getORMColor(ormName: string): string {
  return ORM_COLORS[ormName.toLowerCase()] || 'hsl(0, 0%, 50%)';
}
