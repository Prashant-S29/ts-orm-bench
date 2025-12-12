// Utility functions for formatting data

export function formatNumber(value: number, decimals: number = 2): string {
  return value.toFixed(decimals);
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatLatency(ms: number): string {
  if (ms < 1) {
    return `${(ms * 1000).toFixed(2)}μs`;
  }
  return `${ms.toFixed(2)}ms`;
}

export function formatThroughput(rps: number): string {
  if (rps >= 1000) {
    return `${(rps / 1000).toFixed(2)}k req/s`;
  }
  return `${rps.toFixed(2)} req/s`;
}

export function formatMemory(bytes: number): string {
  const mb = bytes / (1024 * 1024);
  if (mb >= 1024) {
    return `${(mb / 1024).toFixed(2)} GB`;
  }
  return `${mb.toFixed(2)} MB`;
}

export function calculatePercentageDiff(
  value1: number,
  value2: number,
): string {
  const diff = ((value1 - value2) / value2) * 100;
  const sign = diff > 0 ? '+' : '';
  return `${sign}${diff.toFixed(2)}%`;
}

export function getWinnerColor(isWinner: boolean): string {
  return isWinner ? 'text-green-600' : 'text-gray-600';
}

export function calculateAverage(values: number[]): number {
  if (values.length === 0) return 0;
  const sum = values.reduce((acc, val) => acc + val, 0);
  return sum / values.length;
}
