/**
 * Enhanced Types for Improved Storage System
 * Supports run-level grouping, historical tracking, and comprehensive comparisons
 */


// ============================================================================
// Run-Level Types
// ============================================================================


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

export interface RunMetadata {
  runId: string; // Format: YYYY-MM-DD_HH-MM-SS
  timestamp: string; // ISO 8601
  startTime: string;
  endTime: string;
  duration: number; // milliseconds
  status: 'running' | 'completed' | 'failed' | 'partial';
  triggeredBy: 'manual' | 'ci' | 'scheduled' | 'unknown';

  environment: EnvironmentSnapshot;
  configuration: RunConfiguration;

  testedORMs: TestedORMSummary[];
  summary: RunSummary;

  gitInfo?: GitInfo;
  notes?: string;
}

export interface EnvironmentSnapshot {
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemoryMB: number;

  // Database info
  postgresVersion?: string;
  databaseSize?: string;
  connectionPoolSize: number;

  timestamp: string;
}

export interface RunConfiguration {
  warmupIterations: number;
  testIterations: number;
  memoryMonitoringInterval: number;
  enabledCategories: string[];
  enabledScenarios: string[];
  databaseConfig: {
    host: string;
    port: number;
    database: string;
    poolSize: number;
  };
}

export interface TestedORMSummary {
  ormId: string;
  name: string;
  version: string;
  scenariosRun: number;
  scenariosSucceeded: number;
  scenariosFailed: number;
  totalDuration: number;
}

export interface RunSummary {
  totalScenarios: number;
  totalMeasurements: number;
  successfulTests: number;
  failedTests: number;
  totalDuration: number;
}

export interface GitInfo {
  branch: string;
  commit: string;
  isDirty: boolean;
  author?: string;
  message?: string;
}

// ============================================================================
// Individual Test Result Types (stored in runs/{timestamp}/{orm}/{category}/)
// ============================================================================

export interface BenchmarkResult {
  metadata: BenchmarkMetadata;
  metrics: BenchmarkMetrics;
  configuration: TestConfiguration;
  rawData?: RawMeasurement[];
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
  duration: number;
  success: boolean;
  error?: string;
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

// ============================================================================
// Aggregation Types (by-orm, by-scenario, by-category)
// ============================================================================

export interface AggregatedORMResult {
  ormId: string;
  ormName: string;
  ormVersion: string;

  // Latest run data
  scenarios: ScenarioSummary[];
  overallStats: OverallStats;

  // Historical data
  history: HistoricalDataPoint[];

  firstSeen: string;
  lastTested: string;
  totalRuns: number;

  generated: string;
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
  totalErrors: number;
}

export interface HistoricalDataPoint {
  runId: string;
  timestamp: string;
  scenarios: Map<string, BenchmarkMetrics>;
  overallStats: OverallStats;
  environment?: EnvironmentSnapshot;
}

export interface AggregatedScenarioResult {
  scenarioId: string;
  scenarioName: string;
  category: string;

  ormResults: ORMScenarioResult[];

  lastUpdated: string;
  totalRuns: number;
}

export interface ORMScenarioResult {
  ormId: string;
  ormName: string;
  ormVersion: string;
  metrics: BenchmarkMetrics;
  timestamp: string;
  runId: string;
}

export interface AggregatedCategoryResult {
  category: string;
  scenarios: string[];
  ormResults: Map<string, CategoryORMStats>;
  lastUpdated: string;
}

export interface CategoryORMStats {
  ormId: string;
  ormName: string;
  ormVersion: string;
  scenarioCount: number;
  averageLatencyP50: number;
  averageLatencyP95: number;
  averageThroughput: number;
  totalRuns: number;
}

// ============================================================================
// Comparison Types
// ============================================================================

export interface ORMComparison {
  comparisonId: string;
  generated: string;
  baselineRun: string;

  orms: ComparedORM[];
  scenarios: ScenarioComparison[];

  overallWinner: {
    ormId: string;
    winsCount: number;
    tiesCount: number;
    lossesCount: number;
    categories: Record<string, { wins: number; losses: number; ties: number }>;
  };

  summary: ComparisonSummary;
}

export interface ComparedORM {
  ormId: string;
  name: string;
  version: string;
}

export interface ScenarioComparison {
  scenarioId: string;
  scenarioName: string;
  category: string;

  winner: {
    ormId: string;
    reason: 'latency_p50' | 'latency_p95' | 'throughput' | 'memory';
  };

  results: ORMScenarioResult[];

  comparison: {
    latencyDiff: {
      p50: ComparisonMetric;
      p95: ComparisonMetric;
      p99: ComparisonMetric;
    };
    throughputDiff: ComparisonMetric;
    memoryDiff?: ComparisonMetric;
  };
}

export interface ComparisonMetric {
  absolute: number;
  percentage: number;
  faster?: string; // ORM ID
  higher?: string; // ORM ID
  lower?: string; // ORM ID
}

export interface ComparisonSummary {
  totalScenarios: number;
  categoriesCompared: string[];
  significantDifferences: number;
  averagePerformanceDiff: number; // percentage
}

export interface VersionComparison {
  comparisonId: string;
  ormName: string;
  versions: string[];
  generated: string;

  scenarios: VersionScenarioComparison[];

  summary: {
    improvementCount: number;
    regressionCount: number;
    noChangeCount: number;
    significantChanges: SignificantChange[];
  };
}

export interface VersionScenarioComparison {
  scenarioId: string;
  scenarioName: string;
  category: string;

  versionResults: Map<string, BenchmarkMetrics>;

  trend: 'improving' | 'degrading' | 'stable';
  changePercentage: number;
}

export interface SignificantChange {
  scenarioId: string;
  scenarioName: string;
  type: 'improvement' | 'regression';
  metric: 'latency' | 'throughput' | 'memory';
  changePercentage: number;
  fromVersion: string;
  toVersion: string;
}

// ============================================================================
// Historical Timeline Types
// ============================================================================

export interface ORMTimeline {
  ormId: string;
  ormName: string;
  ormVersion: string;
  generated: string;

  dataPoints: TimelineDataPoint[];
  trends: Map<string, ScenarioTrend>;
  regressions: RegressionAlert[];
}

export interface TimelineDataPoint {
  runId: string;
  timestamp: string;
  scenarios: Map<string, BenchmarkMetrics>;
  environment: EnvironmentSnapshot;
}

export interface ScenarioTrend {
  scenarioId: string;
  scenarioName: string;
  trend: 'improving' | 'degrading' | 'stable';
  avgLatencyP50: number;
  avgLatencyP95: number;
  avgThroughput: number;
  latencyChange: number; // percentage, negative = improvement
  throughputChange: number; // percentage, positive = improvement
  dataPoints: number;
}

export interface RegressionAlert {
  scenarioId: string;
  scenarioName: string;
  metric: 'latency' | 'throughput' | 'memory';
  severity: 'critical' | 'warning' | 'minor';
  changePercentage: number;
  fromRun: string;
  toRun: string;
  timestamp: string;
}

// ============================================================================
// UI Data Types
// ============================================================================

export interface UIIndex {
  version: string;
  generated: string;

  latestRun: {
    runId: string;
    timestamp: string;
  };

  availableRuns: RunListItem[];
  orms: ORMListItem[];
  categories: CategoryListItem[];
  scenarios: ScenarioListItem[];
}

export interface RunListItem {
  runId: string;
  timestamp: string;
  label: string;
  orms: string[];
  categories: string[];
  scenarioCount: number;
  status: RunMetadata['status'];
}

export interface ORMListItem {
  id: string;
  name: string;
  version: string;
  firstSeen: string;
  lastTested: string;
  totalRuns: number;
}

export interface CategoryListItem {
  id: string;
  name: string;
  scenarioCount: number;
}

export interface ScenarioListItem {
  id: string;
  name: string;
  category: string;
  description?: string;
}

export interface UIDashboard {
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
      latency: { ormId: string; ormName: string; value: number };
      throughput: { ormId: string; ormName: string; value: number };
    };
    categoryWinners: Map<string, string>; // category -> ormId
  };

  trends: {
    period: 'week' | 'month';
    performanceChanges: PerformanceChange[];
  };

  recentRegressions: RegressionAlert[];
}

export interface PerformanceChange {
  ormId: string;
  ormName: string;
  scenarioId: string;
  scenarioName: string;
  metric: string;
  change: number; // percentage
  trend: 'up' | 'down' | 'stable';
}

// ============================================================================
// Metadata Registry Types
// ============================================================================

export interface RunsIndex {
  runs: RunIndexEntry[];
  totalRuns: number;
  oldestRun: string;
  newestRun: string;
  lastUpdated: string;
}

export interface RunIndexEntry {
  runId: string;
  timestamp: string;
  status: RunMetadata['status'];
  orms: string[];
  scenarios: number;
  duration: number;
}

export interface ORMRegistry {
  orms: ORMRegistryEntry[];
  lastUpdated: string;
}

export interface ORMRegistryEntry {
  ormId: string;
  name: string;
  version: string;
  firstSeen: string;
  lastTested: string;
  totalRuns: number;
  status: 'active' | 'deprecated' | 'archived';
}

export interface ScenarioRegistry {
  scenarios: ScenarioRegistryEntry[];
  categories: string[];
  lastUpdated: string;
}

export interface ScenarioRegistryEntry {
  scenarioId: string;
  name: string;
  category: string;
  description?: string;
  firstRun: string;
  lastRun: string;
  totalRuns: number;
}

export interface EnvironmentHistory {
  environments: EnvironmentHistoryEntry[];
  lastUpdated: string;
}

export interface EnvironmentHistoryEntry {
  runId: string;
  timestamp: string;
  environment: EnvironmentSnapshot;
  changes: EnvironmentChange[];
}

export interface EnvironmentChange {
  field: string;
  oldValue: string;
  newValue: string;
  impact: 'high' | 'medium' | 'low';
}

// ============================================================================
// Storage Operation Types
// ============================================================================

export interface SaveResultOptions {
  includeRawData?: boolean;
  compress?: boolean;
  generateAggregations?: boolean;
}

export interface AggregationOptions {
  targetRun?: string;
  allRuns?: boolean;
  ormIds?: string[];
  scenarioIds?: string[];
  categories?: string[];
}

export interface ComparisonOptions {
  run1: string;
  run2?: string;
  ormIds?: string[];
  scenarioIds?: string[];
  statisticalTests?: boolean;
}

export interface CleanupOptions {
  olderThan?: number; // days
  keepLatest?: number; // keep N latest runs
  dryRun?: boolean;
  archiveBeforeDelete?: boolean;
}

export interface StorageStats {
  totalRuns: number;
  totalResults: number;
  diskUsage: {
    runs: number; // bytes
    aggregated: number;
    uiData: number;
    total: number;
  };
  oldestRun: string;
  newestRun: string;
}
