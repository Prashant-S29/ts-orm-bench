/**
 * Enhanced Results Storage System
 * Implements run-level grouping, historical tracking, and comprehensive aggregations
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  BenchmarkResult,
  BenchmarkMetadata,
  BenchmarkMetrics,
  RunMetadata,
  EnvironmentSnapshot,
  TestConfiguration,
  AggregatedORMResult,
  AggregatedScenarioResult,
  AggregatedCategoryResult,
  RunsIndex,
  RunIndexEntry,
  SaveResultOptions,
  StorageStats,
} from './enhanced-types';
import type { IORMAdapter } from '../adapters/orm-adapter.interface';
import { logger } from '../utils/logger';

export class ResultsStorage {
  private baseDir: string;
  private runsDir: string;
  private aggregatedDir: string;
  private uiDataDir: string;
  private metadataDir: string;

  // Current run state
  private currentRunId: string | null = null;
  private currentRunMetadata: RunMetadata | null = null;

  constructor(baseDir: string = 'benchmark-results') {
    this.baseDir = baseDir;
    this.runsDir = path.join(baseDir, 'runs');
    this.aggregatedDir = path.join(baseDir, 'aggregated');
    this.uiDataDir = path.join(baseDir, 'ui-data');
    this.metadataDir = path.join(baseDir, 'metadata');
  }

  /**
   * Initialize storage directories with enhanced structure
   */
  async initialize(): Promise<void> {
    // Main directories
    await fs.mkdir(this.runsDir, { recursive: true });
    await fs.mkdir(this.aggregatedDir, { recursive: true });
    await fs.mkdir(this.uiDataDir, { recursive: true });
    await fs.mkdir(this.metadataDir, { recursive: true });

    // Aggregated subdirectories
    await fs.mkdir(path.join(this.aggregatedDir, 'by-orm'), {
      recursive: true,
    });
    await fs.mkdir(path.join(this.aggregatedDir, 'by-scenario'), {
      recursive: true,
    });
    await fs.mkdir(path.join(this.aggregatedDir, 'by-category'), {
      recursive: true,
    });
    await fs.mkdir(path.join(this.aggregatedDir, 'comparisons'), {
      recursive: true,
    });
    await fs.mkdir(
      path.join(this.aggregatedDir, 'comparisons', 'version-comparisons'),
      { recursive: true },
    );
    await fs.mkdir(
      path.join(this.aggregatedDir, 'comparisons', 'orm-comparisons'),
      { recursive: true },
    );
    await fs.mkdir(path.join(this.aggregatedDir, 'comparisons', 'historical'), {
      recursive: true,
    });

    // UI data subdirectories
    await fs.mkdir(path.join(this.uiDataDir, 'latest'), { recursive: true });
    await fs.mkdir(path.join(this.uiDataDir, 'comparisons'), {
      recursive: true,
    });
    await fs.mkdir(path.join(this.uiDataDir, 'historical'), {
      recursive: true,
    });

    logger.success('✓ Storage directories initialized');
  }

  // ============================================================================
  // RUN MANAGEMENT
  // ============================================================================

  /**
   * Start a new benchmark run
   */
  async startRun(
    ormIds: string[],
    scenarioIds: string[],
    categories: string[],
    config: TestConfiguration,
    triggeredBy: 'manual' | 'ci' | 'scheduled' = 'manual',
  ): Promise<string> {
    const now = new Date();
    const runId = this.generateRunId(now);
    const runDir = path.join(this.runsDir, runId);

    await fs.mkdir(runDir, { recursive: true });

    this.currentRunId = runId;
    this.currentRunMetadata = {
      runId,
      timestamp: now.toISOString(),
      startTime: now.toISOString(),
      endTime: '', // Will be set on endRun
      duration: 0,
      status: 'running',
      triggeredBy,
      environment: this.captureEnvironment(),
      configuration: {
        warmupIterations: config.warmupIterations,
        testIterations: config.measurementIterations,
        memoryMonitoringInterval: config.memoryMonitoringInterval,
        enabledCategories: categories,
        enabledScenarios: scenarioIds,
        databaseConfig: {
          host: config.database.host,
          port: config.database.port,
          database: config.database.database,
          poolSize: config.connectionPoolSize,
        },
      },
      testedORMs: [],
      summary: {
        totalScenarios: 0,
        totalMeasurements: 0,
        successfulTests: 0,
        failedTests: 0,
        totalDuration: 0,
      },
      gitInfo: await this.captureGitInfo(),
    };

    // Save initial metadata
    await this.saveRunMetadata();

    logger.info(`Started run: ${runId}`);
    return runId;
  }

  /**
   * End the current benchmark run
   */
  async endRun(
    status: 'completed' | 'failed' | 'partial' = 'completed',
  ): Promise<void> {
    if (!this.currentRunId || !this.currentRunMetadata) {
      throw new Error('No active run to end');
    }

    const endTime = new Date();
    this.currentRunMetadata.endTime = endTime.toISOString();
    this.currentRunMetadata.duration =
      new Date(endTime).getTime() -
      new Date(this.currentRunMetadata.startTime).getTime();
    this.currentRunMetadata.status = status;

    await this.saveRunMetadata();

    // Update runs index
    await this.updateRunsIndex();

    logger.success(`✓ Run completed: ${this.currentRunId}`);

    this.currentRunId = null;
    this.currentRunMetadata = null;
  }

  /**
   * Get current run ID
   */
  getCurrentRunId(): string | null {
    return this.currentRunId;
  }

  // ============================================================================
  // RESULT SAVING
  // ============================================================================

  /**
   * Save a benchmark result to the current run
   */
  async saveResult(
    adapter: IORMAdapter,
    scenarioId: string,
    scenarioName: string,
    scenarioCategory: string,
    metrics: BenchmarkMetrics,
    config: TestConfiguration,
    rawData?: any[],
    options: SaveResultOptions = {},
  ): Promise<string> {
    if (!this.currentRunId) {
      throw new Error('No active run. Call startRun() first.');
    }

    const runId = this.currentRunId;

    // Create directory structure: runs/{runId}/{ormId}/{category}/
    const ormDir = path.join(this.runsDir, runId, adapter.id);
    const categoryDir = path.join(ormDir, scenarioCategory);
    await fs.mkdir(categoryDir, { recursive: true });

    // Create metadata
    const metadata: BenchmarkMetadata = {
      runId,
      timestamp: new Date().toISOString(),
      ormId: adapter.id,
      ormName: adapter.name,
      ormVersion: adapter.version,
      scenarioId,
      scenarioName,
      scenarioCategory,
      environment: this.captureEnvironment(),
      duration: 0, // Can be calculated from metrics if needed
      success: metrics.errors.count === 0,
      error:
        metrics.errors.count > 0 ? 'Errors occurred during test' : undefined,
    };

    // Create full result
    const result: BenchmarkResult = {
      metadata,
      metrics,
      configuration: config,
      rawData: options.includeRawData ? rawData : undefined,
    };

    // Save result
    const resultPath = path.join(categoryDir, `${scenarioId}.json`);
    await fs.writeFile(resultPath, JSON.stringify(result, null, 2));

    // Update run metadata
    await this.updateRunMetadata(adapter, scenarioId, metrics);

    logger.info(`  Saved: ${adapter.id}/${scenarioCategory}/${scenarioId}`);

    return resultPath;
  }

  /**
   * Save run metadata
   */
  private async saveRunMetadata(): Promise<void> {
    if (!this.currentRunId || !this.currentRunMetadata) {
      return;
    }

    const metadataPath = path.join(
      this.runsDir,
      this.currentRunId,
      'metadata.json',
    );
    await fs.writeFile(
      metadataPath,
      JSON.stringify(this.currentRunMetadata, null, 2),
    );
  }

  /**
   * Update run metadata with test results
   */
  private async updateRunMetadata(
    adapter: IORMAdapter,
    scenarioId: string,
    metrics: BenchmarkMetrics,
  ): Promise<void> {
    if (!this.currentRunMetadata) {
      return;
    }

    // Update or add ORM summary
    let ormSummary = this.currentRunMetadata.testedORMs.find(
      (o) => o.ormId === adapter.id,
    );

    if (!ormSummary) {
      ormSummary = {
        ormId: adapter.id,
        name: adapter.name,
        version: adapter.version,
        scenariosRun: 0,
        scenariosSucceeded: 0,
        scenariosFailed: 0,
        totalDuration: 0,
      };
      this.currentRunMetadata.testedORMs.push(ormSummary);
    }

    ormSummary.scenariosRun++;
    if (metrics.errors.count === 0) {
      ormSummary.scenariosSucceeded++;
      this.currentRunMetadata.summary.successfulTests++;
    } else {
      ormSummary.scenariosFailed++;
      this.currentRunMetadata.summary.failedTests++;
    }

    // Update overall summary
    this.currentRunMetadata.summary.totalScenarios++;
    this.currentRunMetadata.summary.totalMeasurements +=
      metrics.throughput.totalRequests;

    await this.saveRunMetadata();
  }

  // ============================================================================
  // LOADING RESULTS
  // ============================================================================

  /**
   * Load run metadata
   */
  async loadRunMetadata(runId: string): Promise<RunMetadata | null> {
    try {
      const metadataPath = path.join(this.runsDir, runId, 'metadata.json');
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Failed to load run metadata ${runId}:`, error);
      return null;
    }
  }

  /**
   * Load a specific result from a run
   */
  async loadResult(
    runId: string,
    ormId: string,
    category: string,
    scenarioId: string,
  ): Promise<BenchmarkResult | null> {
    try {
      const resultPath = path.join(
        this.runsDir,
        runId,
        ormId,
        category,
        `${scenarioId}.json`,
      );
      const content = await fs.readFile(resultPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Failed to load result:`, error);
      return null;
    }
  }

  /**
   * Load all results for a specific ORM in a run
   */
  async loadORMResultsFromRun(
    runId: string,
    ormId: string,
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    try {
      const ormDir = path.join(this.runsDir, runId, ormId);
      const categories = await fs.readdir(ormDir);

      for (const category of categories) {
        const categoryDir = path.join(ormDir, category);
        const stat = await fs.stat(categoryDir);

        if (stat.isDirectory()) {
          const files = await fs.readdir(categoryDir);

          for (const file of files) {
            if (file.endsWith('.json')) {
              const content = await fs.readFile(
                path.join(categoryDir, file),
                'utf-8',
              );
              results.push(JSON.parse(content));
            }
          }
        }
      }
    } catch (error) {
      logger.error(
        `Failed to load ORM results for ${ormId} in run ${runId}:`,
        error,
      );
    }

    return results;
  }

  /**
   * Load all results for a specific scenario across a run
   */
  async loadScenarioResultsFromRun(
    runId: string,
    scenarioId: string,
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    try {
      const runDir = path.join(this.runsDir, runId);
      const orms = await fs.readdir(runDir);

      for (const orm of orms) {
        if (orm === 'metadata.json') continue;

        const ormDir = path.join(runDir, orm);
        const stat = await fs.stat(ormDir);

        if (stat.isDirectory()) {
          const categories = await fs.readdir(ormDir);

          for (const category of categories) {
            const scenarioPath = path.join(
              ormDir,
              category,
              `${scenarioId}.json`,
            );

            try {
              const content = await fs.readFile(scenarioPath, 'utf-8');
              results.push(JSON.parse(content));
            } catch {
              // Scenario doesn't exist in this category, continue
            }
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to load scenario results for ${scenarioId}:`, error);
    }

    return results;
  }

  /**
   * Load all results from a run
   */
  async loadAllResultsFromRun(runId: string): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    try {
      const runDir = path.join(this.runsDir, runId);
      const orms = await fs.readdir(runDir);

      for (const orm of orms) {
        if (orm === 'metadata.json') continue;

        const ormResults = await this.loadORMResultsFromRun(runId, orm);
        results.push(...ormResults);
      }
    } catch (error) {
      logger.error(`Failed to load all results from run ${runId}:`, error);
    }

    return results;
  }

  /**
   * List all available runs
   */
  async listRuns(): Promise<string[]> {
    try {
      const runs = await fs.readdir(this.runsDir);
      return runs
        .filter((run) => {
          // Filter out non-directory items
          return !run.includes('.');
        })
        .sort()
        .reverse(); // Most recent first
    } catch (error) {
      logger.error('Failed to list runs:', error);
      return [];
    }
  }

  /**
   * Get latest run ID
   */
  async getLatestRunId(): Promise<string | null> {
    const runs = await this.listRuns();
    return runs.length > 0 ? runs[0] : null;
  }

  // ============================================================================
  // AGGREGATIONS
  // ============================================================================

  /**
   * Aggregate results by ORM (latest run)
   */
  async aggregateByORM(ormId: string, runId?: string): Promise<void> {
    const targetRunId = runId || (await this.getLatestRunId());
    if (!targetRunId) {
      logger.warn('No runs found');
      return;
    }

    const results = await this.loadORMResultsFromRun(targetRunId, ormId);

    if (results.length === 0) {
      logger.warn(`No results found for ORM: ${ormId} in run ${targetRunId}`);
      return;
    }

    // Group by scenario
    const scenarioMap = new Map<string, BenchmarkResult>();
    for (const result of results) {
      scenarioMap.set(result.metadata.scenarioId, result);
    }

    // Create scenario summaries
    const scenarios = Array.from(scenarioMap.values()).map((result) => ({
      scenarioId: result.metadata.scenarioId,
      scenarioName: result.metadata.scenarioName,
      category: result.metadata.scenarioCategory,
      metrics: result.metrics,
      runCount: 1, // Single run for now
      lastRun: result.metadata.timestamp,
    }));

    // Calculate overall stats
    const overallStats = this.calculateOverallStats(scenarios);

    // Load historical data (from previous aggregations)
    const history = await this.loadHistoricalData(ormId);

    const aggregated: AggregatedORMResult = {
      ormId,
      ormName: results[0].metadata.ormName,
      ormVersion: results[0].metadata.ormVersion,
      scenarios,
      overallStats,
      history,
      firstSeen:
        history.length > 0
          ? history[0].timestamp
          : results[0].metadata.timestamp,
      lastTested: results[0].metadata.timestamp,
      totalRuns: history.length + 1,
      generated: new Date().toISOString(),
    };

    // Save aggregated result
    const filename = `${ormId}.json`;
    await fs.writeFile(
      path.join(this.aggregatedDir, 'by-orm', filename),
      JSON.stringify(aggregated, null, 2),
    );

    logger.info(`✓ Aggregated results for ORM: ${ormId}`);
  }

  /**
   * Aggregate results by scenario (latest run)
   */
  async aggregateByScenario(scenarioId: string, runId?: string): Promise<void> {
    const targetRunId = runId || (await this.getLatestRunId());
    if (!targetRunId) {
      logger.warn('No runs found');
      return;
    }

    const results = await this.loadScenarioResultsFromRun(
      targetRunId,
      scenarioId,
    );

    if (results.length === 0) {
      logger.warn(
        `No results found for scenario: ${scenarioId} in run ${targetRunId}`,
      );
      return;
    }

    const ormResults = results.map((result) => ({
      ormId: result.metadata.ormId,
      ormName: result.metadata.ormName,
      ormVersion: result.metadata.ormVersion,
      metrics: result.metrics,
      timestamp: result.metadata.timestamp,
      runId: result.metadata.runId,
    }));

    const comparison: AggregatedScenarioResult = {
      scenarioId,
      scenarioName: results[0].metadata.scenarioName,
      category: results[0].metadata.scenarioCategory,
      ormResults,
      lastUpdated: new Date().toISOString(),
      totalRuns: 1,
    };

    // Save comparison
    const filename = `${scenarioId}.json`;
    await fs.writeFile(
      path.join(this.aggregatedDir, 'by-scenario', filename),
      JSON.stringify(comparison, null, 2),
    );

    logger.info(`✓ Aggregated results for scenario: ${scenarioId}`);
  }

  /**
   * Aggregate results by category
   */
  async aggregateByCategory(category: string, runId?: string): Promise<void> {
    const targetRunId = runId || (await this.getLatestRunId());
    if (!targetRunId) {
      logger.warn('No runs found');
      return;
    }

    const allResults = await this.loadAllResultsFromRun(targetRunId);
    const categoryResults = allResults.filter(
      (r) => r.metadata.scenarioCategory === category,
    );

    if (categoryResults.length === 0) {
      logger.warn(`No results found for category: ${category}`);
      return;
    }

    // Group by ORM
    const ormMap = new Map<string, BenchmarkResult[]>();
    for (const result of categoryResults) {
      const ormId = result.metadata.ormId;
      if (!ormMap.has(ormId)) {
        ormMap.set(ormId, []);
      }
      ormMap.get(ormId)!.push(result);
    }

    // Calculate stats for each ORM
    const ormStats = new Map();
    for (const [ormId, results] of ormMap) {
      const scenarioCount = results.length;
      const avgLatencyP50 =
        results.reduce((sum, r) => sum + r.metrics.latency.median, 0) /
        scenarioCount;
      const avgLatencyP95 =
        results.reduce((sum, r) => sum + r.metrics.latency.p95, 0) /
        scenarioCount;
      const avgThroughput =
        results.reduce((sum, r) => sum + r.metrics.throughput.rps, 0) /
        scenarioCount;

      ormStats.set(ormId, {
        ormId,
        ormName: results[0].metadata.ormName,
        ormVersion: results[0].metadata.ormVersion,
        scenarioCount,
        averageLatencyP50: avgLatencyP50,
        averageLatencyP95: avgLatencyP95,
        averageThroughput: avgThroughput,
        totalRuns: scenarioCount,
      });
    }

    const scenarios = [
      ...new Set(categoryResults.map((r) => r.metadata.scenarioId)),
    ];

    const aggregated: AggregatedCategoryResult = {
      category,
      scenarios,
      ormResults: ormStats,
      lastUpdated: new Date().toISOString(),
    };

    // Save aggregated result
    const filename = `${category}.json`;
    await fs.writeFile(
      path.join(this.aggregatedDir, 'by-category', filename),
      JSON.stringify(aggregated, null, 2),
    );

    logger.info(`✓ Aggregated results for category: ${category}`);
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate run ID with timestamp
   */
  private generateRunId(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');

    return `${year}-${month}-${day}_${hours}-${minutes}-${seconds}`;
  }

  /**
   * Capture current environment
   */
  private captureEnvironment(): EnvironmentSnapshot {
    const os = require('os');
    return {
      nodeVersion: process.version,
      platform: os.platform(),
      arch: os.arch(),
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      cpuCores: os.cpus().length,
      totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
      postgresVersion: process.env.POSTGRES_VERSION || undefined,
      databaseSize: undefined, // Can be populated if needed
      connectionPoolSize: 20, // Default value
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Capture git information
   */
  private async captureGitInfo(): Promise<any> {
    try {
      const { execSync } = require('child_process');

      const branch = execSync('git rev-parse --abbrev-ref HEAD')
        .toString()
        .trim();
      const commit = execSync('git rev-parse HEAD').toString().trim();
      const isDirty =
        execSync('git status --porcelain').toString().trim().length > 0;

      return {
        branch,
        commit,
        isDirty,
      };
    } catch {
      return undefined;
    }
  }

  /**
   * Calculate overall statistics
   */
  private calculateOverallStats(scenarios: any[]) {
    if (scenarios.length === 0) {
      return {
        totalScenarios: 0,
        totalRuns: 0,
        averageLatencyP50: 0,
        averageLatencyP95: 0,
        averageThroughput: 0,
        totalErrors: 0,
      };
    }

    const totalRuns = scenarios.reduce((sum, s) => sum + s.runCount, 0);
    const avgP50 =
      scenarios.reduce((sum, s) => sum + s.metrics.latency.median, 0) /
      scenarios.length;
    const avgP95 =
      scenarios.reduce((sum, s) => sum + s.metrics.latency.p95, 0) /
      scenarios.length;
    const avgThroughput =
      scenarios.reduce((sum, s) => sum + s.metrics.throughput.rps, 0) /
      scenarios.length;
    const totalErrors = scenarios.reduce(
      (sum, s) => sum + s.metrics.errors.count,
      0,
    );

    return {
      totalScenarios: scenarios.length,
      totalRuns,
      averageLatencyP50: avgP50,
      averageLatencyP95: avgP95,
      averageThroughput: avgThroughput,
      totalErrors,
    };
  }

  /**
   * Load historical data for an ORM (placeholder for now)
   */
  private async loadHistoricalData(ormId: string): Promise<any[]> {
    // TODO: Implement historical data loading from previous runs
    return [];
  }

  /**
   * Update runs index
   */
  private async updateRunsIndex(): Promise<void> {
    const runs = await this.listRuns();
    const indexEntries: RunIndexEntry[] = [];

    for (const runId of runs) {
      const metadata = await this.loadRunMetadata(runId);
      if (metadata) {
        indexEntries.push({
          runId: metadata.runId,
          timestamp: metadata.timestamp,
          status: metadata.status,
          orms: metadata.testedORMs.map((o) => o.ormId),
          scenarios: metadata.summary.totalScenarios,
          duration: metadata.duration,
        });
      }
    }

    const runsIndex: RunsIndex = {
      runs: indexEntries,
      totalRuns: indexEntries.length,
      oldestRun:
        indexEntries.length > 0
          ? indexEntries[indexEntries.length - 1].runId
          : '',
      newestRun: indexEntries.length > 0 ? indexEntries[0].runId : '',
      lastUpdated: new Date().toISOString(),
    };

    await fs.writeFile(
      path.join(this.metadataDir, 'runs-index.json'),
      JSON.stringify(runsIndex, null, 2),
    );
  }

  /**
   * Get storage statistics
   */
  async getStats(): Promise<StorageStats> {
    const runs = await this.listRuns();

    // Calculate disk usage (simplified)
    const stats: StorageStats = {
      totalRuns: runs.length,
      totalResults: 0,
      diskUsage: {
        runs: 0,
        aggregated: 0,
        uiData: 0,
        total: 0,
      },
      oldestRun: runs.length > 0 ? runs[runs.length - 1] : '',
      newestRun: runs.length > 0 ? runs[0] : '',
    };

    return stats;
  }
}
