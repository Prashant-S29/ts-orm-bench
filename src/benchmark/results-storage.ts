/**
 * Results Storage System
 * Handles version-aware result storage with aggregation and UI optimization
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  BenchmarkResult,
  BenchmarkMetadata,
  EnvironmentSnapshot,
  AggregatedResult,
  ScenarioSummary,
  UIOptimizedData,
  TestConfiguration,
} from './enhanced-types';
import type { BenchmarkMetrics } from './types';
import type { ORMAdapter } from '../config/test-config';
import { logger } from '../utils/logger';

export class ResultsStorage {
  private baseDir: string;
  private runsDir: string;
  private aggregatedDir: string;
  private uiDataDir: string;

  constructor(baseDir: string = 'benchmark-results') {
    this.baseDir = baseDir;
    this.runsDir = path.join(baseDir, 'runs');
    this.aggregatedDir = path.join(baseDir, 'aggregated');
    this.uiDataDir = path.join(baseDir, 'ui-data');
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    await fs.mkdir(this.runsDir, { recursive: true });
    await fs.mkdir(path.join(this.aggregatedDir, 'by-orm'), {
      recursive: true,
    });
    await fs.mkdir(path.join(this.aggregatedDir, 'by-scenario'), {
      recursive: true,
    });
    await fs.mkdir(path.join(this.aggregatedDir, 'comparisons'), {
      recursive: true,
    });
    await fs.mkdir(this.uiDataDir, { recursive: true });
  }

  /**
   * Save a benchmark result
   */
  async saveResult(
    adapter: ORMAdapter,
    scenarioId: string,
    scenarioName: string,
    scenarioCategory: string,
    metrics: BenchmarkMetrics,
    config: TestConfiguration,
    rawData?: any[],
  ): Promise<string> {
    const timestamp = new Date().toISOString().split('T')[0];
    const runId = `${timestamp}-${adapter.name}-${scenarioId}`;
    const runDir = path.join(this.runsDir, runId);

    await fs.mkdir(runDir, { recursive: true });

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
      configuration: config,
    };

    // Create full result
    const result: BenchmarkResult = {
      metadata,
      metrics,
      rawData: rawData || [],
    };

    // Save result.json
    await fs.writeFile(
      path.join(runDir, 'result.json'),
      JSON.stringify(result, null, 2),
    );

    // Save summary.json (lighter version)
    const summary = {
      metadata,
      metrics,
    };
    await fs.writeFile(
      path.join(runDir, 'summary.json'),
      JSON.stringify(summary, null, 2),
    );

    logger.info(`Saved result: ${runId}`);
    return runId;
  }

  /**
   * Load a specific result
   */
  async loadResult(runId: string): Promise<BenchmarkResult | null> {
    try {
      const resultPath = path.join(this.runsDir, runId, 'result.json');
      const content = await fs.readFile(resultPath, 'utf-8');
      return JSON.parse(content);
    } catch (error) {
      logger.error(`Failed to load result ${runId}:`, error);
      return null;
    }
  }

  /**
   * Load all results for a specific ORM
   */
  async loadORMResults(ormId: string): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    try {
      const runs = await fs.readdir(this.runsDir);

      for (const run of runs) {
        if (run.includes(ormId.split('-')[0])) {
          // Match by ORM name
          const result = await this.loadResult(run);
          if (result && result.metadata.ormId === ormId) {
            results.push(result);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to load ORM results for ${ormId}:`, error);
    }

    return results;
  }

  /**
   * Load all results for a specific scenario
   */
  async loadScenarioResults(scenarioId: string): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];

    try {
      const runs = await fs.readdir(this.runsDir);

      for (const run of runs) {
        if (run.includes(scenarioId)) {
          const result = await this.loadResult(run);
          if (result && result.metadata.scenarioId === scenarioId) {
            results.push(result);
          }
        }
      }
    } catch (error) {
      logger.error(`Failed to load scenario results for ${scenarioId}:`, error);
    }

    return results;
  }

  /**
   * Aggregate results by ORM
   */
  async aggregateByORM(ormId: string): Promise<void> {
    const results = await this.loadORMResults(ormId);

    if (results.length === 0) {
      logger.warn(`No results found for ORM: ${ormId}`);
      return;
    }

    // Group by scenario
    const scenarioMap = new Map<string, BenchmarkResult[]>();
    for (const result of results) {
      const scenarioId = result.metadata.scenarioId;
      if (!scenarioMap.has(scenarioId)) {
        scenarioMap.set(scenarioId, []);
      }
      scenarioMap.get(scenarioId)!.push(result);
    }

    // Create scenario summaries
    const scenarios: ScenarioSummary[] = [];
    for (const [scenarioId, scenarioResults] of scenarioMap) {
      const latestResult = scenarioResults[scenarioResults.length - 1];
      scenarios.push({
        scenarioId,
        scenarioName: latestResult.metadata.scenarioName,
        category: latestResult.metadata.scenarioCategory,
        metrics: latestResult.metrics,
        runCount: scenarioResults.length,
        lastRun: latestResult.metadata.timestamp,
      });
    }

    // Calculate overall stats
    const overallStats = this.calculateOverallStats(scenarios);

    const aggregated: AggregatedResult = {
      ormId,
      ormName: results[0].metadata.ormName,
      ormVersion: results[0].metadata.ormVersion,
      scenarios,
      overallStats,
      lastUpdated: new Date().toISOString(),
    };

    // Save aggregated result
    const filename = `${ormId}.json`;
    await fs.writeFile(
      path.join(this.aggregatedDir, 'by-orm', filename),
      JSON.stringify(aggregated, null, 2),
    );

    logger.info(`Aggregated results for ORM: ${ormId}`);
  }

  /**
   * Aggregate results by scenario
   */
  async aggregateByScenario(scenarioId: string): Promise<void> {
    const results = await this.loadScenarioResults(scenarioId);

    if (results.length === 0) {
      logger.warn(`No results found for scenario: ${scenarioId}`);
      return;
    }

    // Group by ORM
    const ormMap = new Map<string, BenchmarkResult>();
    for (const result of results) {
      // Keep only the latest result for each ORM
      const ormId = result.metadata.ormId;
      const existing = ormMap.get(ormId);
      if (
        !existing ||
        new Date(result.metadata.timestamp) >
          new Date(existing.metadata.timestamp)
      ) {
        ormMap.set(ormId, result);
      }
    }

    const comparison = {
      scenarioId,
      scenarioName: results[0].metadata.scenarioName,
      category: results[0].metadata.scenarioCategory,
      orms: Array.from(ormMap.entries()).map(([ormId, result]) => ({
        ormId,
        ormName: result.metadata.ormName,
        ormVersion: result.metadata.ormVersion,
        metrics: result.metrics,
        timestamp: result.metadata.timestamp,
      })),
      lastUpdated: new Date().toISOString(),
    };

    // Save comparison
    const filename = `${scenarioId}.json`;
    await fs.writeFile(
      path.join(this.aggregatedDir, 'by-scenario', filename),
      JSON.stringify(comparison, null, 2),
    );

    logger.info(`Aggregated results for scenario: ${scenarioId}`);
  }

  /**
   * Generate UI-optimized data
   */
  async generateUIData(): Promise<void> {
    // Load all aggregated ORM data
    const ormFiles = await fs.readdir(path.join(this.aggregatedDir, 'by-orm'));
    const ormData: AggregatedResult[] = [];

    for (const file of ormFiles) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(
          path.join(this.aggregatedDir, 'by-orm', file),
          'utf-8',
        );
        ormData.push(JSON.parse(content));
      }
    }

    // Load all scenario comparisons
    const scenarioFiles = await fs.readdir(
      path.join(this.aggregatedDir, 'by-scenario'),
    );
    const scenarioData: any[] = [];

    for (const file of scenarioFiles) {
      if (file.endsWith('.json')) {
        const content = await fs.readFile(
          path.join(this.aggregatedDir, 'by-scenario', file),
          'utf-8',
        );
        scenarioData.push(JSON.parse(content));
      }
    }

    // Create UI-optimized structure
    const uiData = {
      summary: {
        totalRuns: ormData.reduce(
          (sum, orm) =>
            sum + orm.scenarios.reduce((s, sc) => s + sc.runCount, 0),
          0,
        ),
        orms: ormData.map((orm) => `${orm.ormName}@${orm.ormVersion}`),
        scenarios: scenarioData.map((sc) => sc.scenarioId),
        lastUpdated: new Date().toISOString(),
      },
      ormResults: ormData,
      scenarioComparisons: scenarioData,
    };

    // Save UI data
    await fs.writeFile(
      path.join(this.uiDataDir, 'latest.json'),
      JSON.stringify(uiData, null, 2),
    );

    logger.success('Generated UI-optimized data');
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
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Calculate overall statistics
   */
  private calculateOverallStats(scenarios: ScenarioSummary[]) {
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

    return {
      totalScenarios: scenarios.length,
      totalRuns,
      averageLatencyP50: avgP50,
      averageLatencyP95: avgP95,
      averageThroughput: avgThroughput,
    };
  }
}
