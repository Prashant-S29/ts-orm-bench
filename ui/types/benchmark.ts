// Core type definitions for benchmark data

export interface BenchmarkSummary {
  generated: string;
  summary: {
    totalRuns: number;
    totalScenarios: number;
    totalORMs: number;
    lastRunDate: string;
  };
  latestResults: {
    runId: string;
    timestamp: string;
    topPerformers: {
      latency: {
        ormId: string;
        ormName: string;
        value: number;
      };
      throughput: {
        ormId: string;
        ormName: string;
        value: number;
      };
    };
    categoryWinners: Record<string, unknown>;
  };
  trends: {
    period: string;
    performanceChanges: unknown[];
  };
  recentRegressions: unknown[];
}

export interface LatencyMetrics {
  mean: number;
  median: number;
  p95: number;
  p99: number;
  p999: number;
  min: number;
  max: number;
  stddev: number;
}

export interface ThroughputMetrics {
  rps: number;
  totalRequests: number;
}

export interface MemoryMetrics {
  heapUsed: number[];
  heapTotal: number[];
  rss: number[];
  external: number[];
}

export interface CPUMetrics {
  usage: number[];
}

export interface ErrorMetrics {
  count: number;
  types: Record<string, number>;
}

export interface BenchmarkMetrics {
  latency: LatencyMetrics;
  throughput: ThroughputMetrics;
  memory: MemoryMetrics;
  cpu: CPUMetrics;
  errors: ErrorMetrics;
}

export interface ORMResult {
  ormId: string;
  ormName: string;
  ormVersion: string;
  metrics: BenchmarkMetrics;
  timestamp: string;
  runId: string;
}

export interface ScenarioComparison {
  scenarioId: string;
  scenarioName: string;
  category: string;
  winner: {
    ormId: string;
    reason: string;
  };
  results: ORMResult[];
}

export interface ORMInfo {
  ormId: string;
  name: string;
  version: string;
}

export interface ComparisonData {
  comparisonId: string;
  generated: string;
  baselineRun: string;
  orms: ORMInfo[];
  scenarios: ScenarioComparison[];
}

export interface ORMSelection {
  ormId: string;
  name: string;
  version: string;
  selected: boolean;
}

export interface BenchCategory {
  id: string;
  name: string;
  description: string;
  available: boolean;
}
