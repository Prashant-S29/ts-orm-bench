export interface EnvironmentSnapshot {
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemoryMB: number;
  timestamp: string;
}

export interface BenchmarkMetrics {
  latency: {
    mean: number;
    median: number;
    p95: number;
    p99: number;
    p999: number;
    min: number;
    max: number;
    stddev: number;
  };
  throughput: {
    rps: number;
    totalRequests: number;
  };
  memory: {
    heapUsed: number[];
    heapTotal: number[];
    rss: number[];
    external: number[];
  };
  cpu: {
    usage: number[];
  };
  errors: {
    count: number;
    types: Record<string, number>;
  };
}

export interface BenchmarkResult {
  metadata: BenchmarkMetadata;
  metrics: BenchmarkMetrics;
  rawData: RawMeasurement[];
}

export interface BenchmarkMetadata {
  runId: string;
  timestamp: string;
  ormId: string;
  ormName: string;
  ormVersion: string;
  scenarioId: string;
  scenarioName: string;
  scenarioCategory: string;
  environment: EnvironmentSnapshot;
  configuration: TestConfiguration;
}

export interface TestConfiguration {
  warmupIterations: number;
  measurementIterations: number;
  memoryMonitoringInterval: number;
  connectionPoolSize: number;
  database: {
    host: string;
    port: number;
    database: string;
  };
}

export interface RawMeasurement {
  iteration: number;
  timestamp: number;
  latencyMs: number;
  memoryMB?: number;
  cpuPercent?: number;
  error?: string;
}

export interface AggregatedResult {
  ormId: string;
  ormName: string;
  ormVersion: string;
  scenarios: ScenarioSummary[];
  overallStats: OverallStats;
  lastUpdated: string;
}

export interface ScenarioSummary {
  scenarioId: string;
  scenarioName: string;
  category: string;
  metrics: BenchmarkMetrics;
  runCount: number;
  lastRun: string;
}

export interface OverallStats {
  totalScenarios: number;
  totalRuns: number;
  averageLatencyP50: number;
  averageLatencyP95: number;
  averageThroughput: number;
}

export interface ComparisonResult {
  comparisonId: string;
  timestamp: string;
  orms: string[];
  scenario: string;
  winner: {
    ormId: string;
    metric: string;
    improvement: number; // percentage
  };
  results: Map<string, BenchmarkMetrics>;
  statisticalSignificance: StatisticalTest;
}

export interface StatisticalTest {
  testType: 'mann-whitney' | 't-test' | 'none';
  pValue: number;
  isSignificant: boolean;
  confidenceLevel: number;
}

export interface UIOptimizedData {
  summary: {
    totalRuns: number;
    orms: string[];
    scenarios: string[];
    lastUpdated: string;
  };
  results: BenchmarkResult[];
  comparisons: ComparisonResult[];
  aggregated: {
    byOrm: Map<string, AggregatedResult>;
    byScenario: Map<string, ScenarioComparison>;
  };
}

export interface ScenarioComparison {
  scenarioId: string;
  scenarioName: string;
  category: string;
  ormResults: Map<string, BenchmarkMetrics>;
  bestPerformer: {
    latency: string;
    throughput: string;
    memory: string;
  };
}
