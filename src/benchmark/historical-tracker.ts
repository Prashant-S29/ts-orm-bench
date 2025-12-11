/**
 * Historical Tracker
 * Tracks performance trends over time and detects regressions
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  ORMTimeline,
  TimelineDataPoint,
  ScenarioTrend,
  RegressionAlert,
  BenchmarkResult,
  BenchmarkMetrics,
  EnvironmentSnapshot,
} from './enhanced-types';
import { logger } from '../utils/logger';

export class HistoricalTracker {
  private baseDir: string;
  private historicalDir: string;

  constructor(baseDir: string = 'benchmark-results') {
    this.baseDir = baseDir;
    this.historicalDir = path.join(
      baseDir,
      'aggregated',
      'comparisons',
      'historical',
    );
  }

  // ============================================================================
  // TIMELINE MANAGEMENT
  // ============================================================================

  /**
   * Update timelines for all specified ORMs
   */
  async updateTimelines(runId: string, ormIds: string[]): Promise<void> {
    logger.info('Updating historical timelines...');

    for (const ormId of ormIds) {
      try {
        await this.updateORMTimeline(runId, ormId);
        logger.success(`  ✓ ${ormId}`);
      } catch (error) {
        logger.error(`  ✗ ${ormId}:`, error);
      }
    }
  }

  /**
   * Update timeline for a specific ORM
   */
  async updateORMTimeline(runId: string, ormId: string): Promise<void> {
    // Load existing timeline
    const existingTimeline = await this.loadTimeline(ormId);

    // Load results from current run
    const results = await this.loadORMResultsFromRun(runId, ormId);

    if (results.length === 0) {
      logger.warn(`No results found for ${ormId} in run ${runId}`);
      return;
    }

    // Create new data point
    const scenariosMap = new Map<string, BenchmarkMetrics>();
    results.forEach((r) => {
      scenariosMap.set(r.metadata.scenarioId, r.metrics);
    });

    const newDataPoint: TimelineDataPoint = {
      runId,
      timestamp: results[0].metadata.timestamp,
      scenarios: scenariosMap,
      environment: results[0].metadata.environment,
    };

    // Add to existing data points
    const dataPoints = existingTimeline
      ? [...existingTimeline.dataPoints, newDataPoint]
      : [newDataPoint];

    // Calculate trends
    const trends = this.calculateTrends(dataPoints);

    // Detect regressions
    const regressions = this.detectRegressionsInTimeline(dataPoints);

    // Create updated timeline
    const timeline: ORMTimeline = {
      ormId,
      ormName: results[0].metadata.ormName,
      ormVersion: results[0].metadata.ormVersion,
      generated: new Date().toISOString(),
      dataPoints,
      trends,
      regressions,
    };

    // Save timeline
    await fs.mkdir(this.historicalDir, { recursive: true });
    const filename = `${ormId}-timeline.json`;
    await fs.writeFile(
      path.join(this.historicalDir, filename),
      JSON.stringify(timeline, null, 2),
    );

    logger.info(`  Updated timeline: ${filename}`);
  }

  /**
   * Calculate trends for each scenario across timeline
   */
  private calculateTrends(
    dataPoints: TimelineDataPoint[],
  ): Map<string, ScenarioTrend> {
    const trends = new Map<string, ScenarioTrend>();

    if (dataPoints.length < 2) {
      return trends; // Need at least 2 data points for trend
    }

    // Get all unique scenarios
    const allScenarios = new Set<string>();
    dataPoints.forEach((dp) => {
      // When loaded from JSON, Map becomes a plain object
      if (dp.scenarios instanceof Map) {
        for (const scenarioId of dp.scenarios.keys()) {
          allScenarios.add(scenarioId);
        }
      } else {
        // It's a plain object from JSON
        for (const scenarioId of Object.keys(dp.scenarios)) {
          allScenarios.add(scenarioId);
        }
      }
    });

    // Calculate trend for each scenario
    allScenarios.forEach((scenarioId) => {
      const scenarioData = dataPoints
        .map((dp) => {
          // Handle both Map and plain object
          const metrics =
            dp.scenarios instanceof Map
              ? dp.scenarios.get(scenarioId)
              : dp.scenarios[scenarioId];

          return {
            timestamp: dp.timestamp,
            metrics,
          };
        })
        .filter((d) => d.metrics !== undefined) as Array<{
        timestamp: string;
        metrics: BenchmarkMetrics;
      }>;

      if (scenarioData.length < 2) {
        return; // Skip if not enough data
      }

      // Calculate averages
      const avgLatencyP50 =
        scenarioData.reduce((sum, d) => sum + d.metrics.latency.median, 0) /
        scenarioData.length;
      const avgLatencyP95 =
        scenarioData.reduce((sum, d) => sum + d.metrics.latency.p95, 0) /
        scenarioData.length;
      const avgThroughput =
        scenarioData.reduce((sum, d) => sum + d.metrics.throughput.rps, 0) /
        scenarioData.length;

      // Calculate change from first to last
      const firstMetrics = scenarioData[0].metrics;
      const lastMetrics = scenarioData[scenarioData.length - 1].metrics;

      const latencyChange =
        ((lastMetrics.latency.median - firstMetrics.latency.median) /
          firstMetrics.latency.median) *
        100;
      const throughputChange =
        ((lastMetrics.throughput.rps - firstMetrics.throughput.rps) /
          firstMetrics.throughput.rps) *
        100;

      // Determine trend
      let trend: 'improving' | 'degrading' | 'stable' = 'stable';
      if (latencyChange < -5) {
        trend = 'improving'; // Latency decreased (good)
      } else if (latencyChange > 5) {
        trend = 'degrading'; // Latency increased (bad)
      }

      // Get scenario name (capitalize and format)
      const scenarioName = scenarioId
        .split('_')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      trends.set(scenarioId, {
        scenarioId,
        scenarioName,
        trend,
        avgLatencyP50,
        avgLatencyP95,
        avgThroughput,
        latencyChange,
        throughputChange,
        dataPoints: scenarioData.length,
      });
    });

    return trends;
  }

  /**
   * Detect regressions in timeline
   */
  private detectRegressionsInTimeline(
    dataPoints: TimelineDataPoint[],
  ): RegressionAlert[] {
    const regressions: RegressionAlert[] = [];

    if (dataPoints.length < 2) {
      return regressions;
    }

    // Compare last two data points
    const previousDataPoint = dataPoints[dataPoints.length - 2];
    const currentDataPoint = dataPoints[dataPoints.length - 1];

    // Check each scenario - handle both Map and plain object
    const currentScenarios =
      currentDataPoint.scenarios instanceof Map
        ? Array.from(currentDataPoint.scenarios.entries())
        : Object.entries(currentDataPoint.scenarios);

    for (const [scenarioId, currentMetrics] of currentScenarios) {
      const previousMetrics =
        previousDataPoint.scenarios instanceof Map
          ? previousDataPoint.scenarios.get(scenarioId)
          : previousDataPoint.scenarios[scenarioId];

      if (!previousMetrics) {
        continue; // New scenario, can't compare
      }

      // Type assertion since we know currentMetrics is BenchmarkMetrics
      const current = currentMetrics as BenchmarkMetrics;
      const previous = previousMetrics as BenchmarkMetrics;

      // Check for latency regression
      const latencyChange =
        ((current.latency.median - previous.latency.median) /
          previous.latency.median) *
        100;

      if (latencyChange > 10) {
        // Latency increased by more than 10%
        const severity = this.determineSeverity(latencyChange);

        regressions.push({
          scenarioId,
          scenarioName: scenarioId
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          metric: 'latency',
          severity,
          changePercentage: latencyChange,
          fromRun: previousDataPoint.runId,
          toRun: currentDataPoint.runId,
          timestamp: currentDataPoint.timestamp,
        });
      }

      // Check for throughput regression
      const throughputChange =
        ((current.throughput.rps - previous.throughput.rps) /
          previous.throughput.rps) *
        100;

      if (throughputChange < -10) {
        // Throughput decreased by more than 10%
        const severity = this.determineSeverity(Math.abs(throughputChange));

        regressions.push({
          scenarioId,
          scenarioName: scenarioId
            .split('_')
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' '),
          metric: 'throughput',
          severity,
          changePercentage: Math.abs(throughputChange),
          fromRun: previousDataPoint.runId,
          toRun: currentDataPoint.runId,
          timestamp: currentDataPoint.timestamp,
        });
      }
    }

    return regressions;
  }

  /**
   * Determine severity of regression
   */
  private determineSeverity(
    changePercentage: number,
  ): 'critical' | 'warning' | 'minor' {
    if (changePercentage > 50) {
      return 'critical';
    } else if (changePercentage > 25) {
      return 'warning';
    } else {
      return 'minor';
    }
  }

  // ============================================================================
  // REGRESSION DETECTION
  // ============================================================================

  /**
   * Detect regressions in a specific run compared to previous runs
   */
  async detectRegressions(runId: string): Promise<RegressionAlert[]> {
    const allRegressions: RegressionAlert[] = [];

    // Get all ORMs in this run
    const runDir = path.join(this.baseDir, 'runs', runId);
    const orms = await fs.readdir(runDir);

    for (const ormId of orms) {
      if (ormId === 'metadata.json') continue;

      try {
        const timeline = await this.loadTimeline(ormId);
        if (timeline && timeline.regressions.length > 0) {
          allRegressions.push(...timeline.regressions);
        }
      } catch (error) {
        logger.warn(`Could not load timeline for ${ormId}`);
      }
    }

    if (allRegressions.length > 0) {
      logger.warn(`\n⚠️  Detected ${allRegressions.length} regressions:`);
      allRegressions.forEach((reg) => {
        const icon =
          reg.severity === 'critical'
            ? '🔴'
            : reg.severity === 'warning'
            ? '🟡'
            : '🟢';
        logger.warn(
          `  ${icon} ${reg.scenarioName}: ${reg.metric} ${
            reg.severity
          } (+${reg.changePercentage.toFixed(1)}%)`,
        );
      });
    } else {
      logger.success('✓ No regressions detected');
    }

    return allRegressions;
  }

  /**
   * Generate regression report
   */
  async generateRegressionReport(runId: string): Promise<void> {
    const regressions = await this.detectRegressions(runId);

    if (regressions.length === 0) {
      logger.info('No regressions to report');
      return;
    }

    // Group by severity
    const critical = regressions.filter((r) => r.severity === 'critical');
    const warnings = regressions.filter((r) => r.severity === 'warning');
    const minor = regressions.filter((r) => r.severity === 'minor');

    const report = {
      runId,
      timestamp: new Date().toISOString(),
      summary: {
        total: regressions.length,
        critical: critical.length,
        warnings: warnings.length,
        minor: minor.length,
      },
      regressions: {
        critical,
        warnings,
        minor,
      },
    };

    // Save report
    await fs.mkdir(path.join(this.baseDir, 'ui-data', 'historical'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(
        this.baseDir,
        'ui-data',
        'historical',
        'regression-alerts.json',
      ),
      JSON.stringify(report, null, 2),
    );

    logger.info(`✓ Regression report saved`);
  }

  // ============================================================================
  // TREND ANALYSIS
  // ============================================================================

  /**
   * Generate weekly performance summary
   */
  async generateWeeklySummary(): Promise<void> {
    logger.info('Generating weekly performance summary...');

    const now = Date.now();
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;

    // Get all runs from the last week
    const runsDir = path.join(this.baseDir, 'runs');
    const allRuns = await fs.readdir(runsDir);

    const recentRuns = allRuns.filter((runId) => {
      const runDate = this.parseRunIdDate(runId);
      return runDate && runDate.getTime() >= oneWeekAgo;
    });

    if (recentRuns.length === 0) {
      logger.info('No runs in the last week');
      return;
    }

    logger.info(`Found ${recentRuns.length} runs in the last week`);

    // TODO: Implement detailed weekly summary logic
    // This would include:
    // - Average performance metrics
    // - Trend analysis
    // - Notable changes
    // - Best/worst performers

    const summary = {
      period: 'week' as const,
      startDate: new Date(oneWeekAgo).toISOString(),
      endDate: new Date(now).toISOString(),
      totalRuns: recentRuns.length,
      generated: new Date().toISOString(),
    };

    await fs.mkdir(path.join(this.baseDir, 'ui-data', 'historical'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(this.baseDir, 'ui-data', 'historical', 'weekly-summary.json'),
      JSON.stringify(summary, null, 2),
    );

    logger.success('✓ Weekly summary generated');
  }

  /**
   * Analyze performance trends
   */
  async analyzeTrends(ormId: string, daysBack: number = 30): Promise<void> {
    const timeline = await this.loadTimeline(ormId);

    if (!timeline) {
      logger.warn(`No timeline found for ${ormId}`);
      return;
    }

    logger.info(`\nPerformance Trends for ${ormId}:`);
    logger.info('='.repeat(60));

    timeline.trends.forEach((trend, scenarioId) => {
      const icon =
        trend.trend === 'improving'
          ? '📈'
          : trend.trend === 'degrading'
          ? '📉'
          : '➡️';

      logger.info(`\n${icon} ${trend.scenarioName}:`);
      logger.info(`  Trend: ${trend.trend}`);
      logger.info(`  Latency change: ${trend.latencyChange.toFixed(2)}%`);
      logger.info(`  Throughput change: ${trend.throughputChange.toFixed(2)}%`);
      logger.info(`  Avg p50: ${trend.avgLatencyP50.toFixed(3)}ms`);
      logger.info(`  Avg p95: ${trend.avgLatencyP95.toFixed(3)}ms`);
      logger.info(`  Data points: ${trend.dataPoints}`);
    });

    logger.info('\n' + '='.repeat(60));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Load existing timeline for an ORM
   */
  private async loadTimeline(ormId: string): Promise<ORMTimeline | null> {
    try {
      const filename = `${ormId}-timeline.json`;
      const content = await fs.readFile(
        path.join(this.historicalDir, filename),
        'utf-8',
      );
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Load ORM results from a specific run
   */
  private async loadORMResultsFromRun(
    runId: string,
    ormId: string,
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    const ormDir = path.join(this.baseDir, 'runs', runId, ormId);

    try {
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
      logger.error(`Failed to load ORM results:`, error);
    }

    return results;
  }

  /**
   * Parse date from run ID
   */
  private parseRunIdDate(runId: string): Date | null {
    try {
      // Format: YYYY-MM-DD_HH-MM-SS
      const [datePart, timePart] = runId.split('_');
      const [year, month, day] = datePart.split('-').map(Number);
      const [hours, minutes, seconds] = timePart.split('-').map(Number);

      return new Date(year, month - 1, day, hours, minutes, seconds);
    } catch {
      return null;
    }
  }

  /**
   * Get timeline statistics
   */
  async getTimelineStats(ormId: string): Promise<void> {
    const timeline = await this.loadTimeline(ormId);

    if (!timeline) {
      logger.warn(`No timeline found for ${ormId}`);
      return;
    }

    logger.info(`\nTimeline Statistics for ${ormId}:`);
    logger.info('='.repeat(60));
    logger.info(`Data points: ${timeline.dataPoints.length}`);
    logger.info(`Scenarios tracked: ${timeline.trends.size}`);
    logger.info(`Active regressions: ${timeline.regressions.length}`);

    if (timeline.dataPoints.length > 0) {
      const firstRun = timeline.dataPoints[0];
      const lastRun = timeline.dataPoints[timeline.dataPoints.length - 1];
      logger.info(`First run: ${firstRun.runId} (${firstRun.timestamp})`);
      logger.info(`Last run: ${lastRun.runId} (${lastRun.timestamp})`);
    }

    logger.info('='.repeat(60));
  }
}
