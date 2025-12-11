/**
 * Comparison Generator
 * Generates various comparison views between ORMs, versions, and runs
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  ORMComparison,
  ComparedORM,
  ScenarioComparison,
  ComparisonMetric,
  VersionComparison,
  VersionScenarioComparison,
  SignificantChange,
  BenchmarkResult,
  BenchmarkMetrics,
  ComparisonSummary,
} from './enhanced-types';
import { logger } from '../utils/logger';

export class ComparisonGenerator {
  private baseDir: string;
  private comparisonsDir: string;

  constructor(baseDir: string = 'benchmark-results') {
    this.baseDir = baseDir;
    this.comparisonsDir = path.join(baseDir, 'aggregated', 'comparisons');
  }

  // ============================================================================
  // ORM COMPARISONS
  // ============================================================================

  /**
   * Generate ORM comparison for a specific run
   */
  async generateORMComparison(runId: string): Promise<void> {
    const runsDir = path.join(this.baseDir, 'runs', runId);

    // Load all results from this run
    const results = await this.loadAllResultsFromRun(runId);

    if (results.length === 0) {
      logger.warn(`No results found for run: ${runId}`);
      return;
    }

    // Group results by ORM
    const ormMap = new Map<string, BenchmarkResult[]>();
    for (const result of results) {
      const ormId = result.metadata.ormId;
      if (!ormMap.has(ormId)) {
        ormMap.set(ormId, []);
      }
      ormMap.get(ormId)!.push(result);
    }

    // Get unique ORMs
    const orms: ComparedORM[] = Array.from(ormMap.keys()).map((ormId) => {
      const firstResult = ormMap.get(ormId)![0];
      return {
        ormId,
        name: firstResult.metadata.ormName,
        version: firstResult.metadata.ormVersion,
      };
    });

    if (orms.length < 2) {
      logger.warn('Need at least 2 ORMs to generate comparison');
      return;
    }

    // Get all unique scenarios
    const scenarioIds = [...new Set(results.map((r) => r.metadata.scenarioId))];

    // Compare each scenario
    const scenarioComparisons: ScenarioComparison[] = [];

    for (const scenarioId of scenarioIds) {
      const scenarioResults = results.filter(
        (r) => r.metadata.scenarioId === scenarioId,
      );

      if (scenarioResults.length < 2) {
        continue; // Skip if not all ORMs have this scenario
      }

      const comparison = this.compareScenario(scenarioResults);
      scenarioComparisons.push(comparison);
    }

    // Calculate overall winner
    const overallWinner = this.calculateOverallWinner(
      scenarioComparisons,
      orms,
    );

    // Calculate summary
    const summary = this.calculateComparisonSummary(scenarioComparisons);

    // Create comparison object
    const comparison: ORMComparison = {
      comparisonId: `${runId}-orm-comparison`,
      generated: new Date().toISOString(),
      baselineRun: runId,
      orms,
      scenarios: scenarioComparisons,
      overallWinner,
      summary,
    };

    // Save comparison
    const filename = `${runId}-orm-comparison.json`;
    await fs.mkdir(path.join(this.comparisonsDir, 'orm-comparisons'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(this.comparisonsDir, 'orm-comparisons', filename),
      JSON.stringify(comparison, null, 2),
    );

    // Also save as "latest"
    await fs.writeFile(
      path.join(this.comparisonsDir, 'orm-comparisons', 'latest.json'),
      JSON.stringify(comparison, null, 2),
    );

    logger.info(`✓ ORM comparison generated: ${filename}`);
  }

  /**
   * Compare a single scenario across multiple ORMs
   */
  private compareScenario(results: BenchmarkResult[]): ScenarioComparison {
    const firstResult = results[0];

    // Sort by p50 latency to find winner
    const sortedByLatency = [...results].sort(
      (a, b) => a.metrics.latency.median - b.metrics.latency.median,
    );

    const winner = sortedByLatency[0];
    const baseline = sortedByLatency[0];
    const comparison = sortedByLatency[1]; // Second best for comparison

    // Calculate differences
    const latencyDiffP50 = this.calculateDifference(
      baseline.metrics.latency.median,
      comparison.metrics.latency.median,
    );

    const latencyDiffP95 = this.calculateDifference(
      baseline.metrics.latency.p95,
      comparison.metrics.latency.p95,
    );

    const latencyDiffP99 = this.calculateDifference(
      baseline.metrics.latency.p99,
      comparison.metrics.latency.p99,
    );

    const throughputDiff = this.calculateDifference(
      baseline.metrics.throughput.rps,
      comparison.metrics.throughput.rps,
    );

    return {
      scenarioId: firstResult.metadata.scenarioId,
      scenarioName: firstResult.metadata.scenarioName,
      category: firstResult.metadata.scenarioCategory,
      winner: {
        ormId: winner.metadata.ormId,
        reason: 'latency_p50',
      },
      results: results.map((r) => ({
        ormId: r.metadata.ormId,
        ormName: r.metadata.ormName,
        ormVersion: r.metadata.ormVersion,
        metrics: r.metrics,
        timestamp: r.metadata.timestamp,
        runId: r.metadata.runId,
      })),
      comparison: {
        latencyDiff: {
          p50: {
            ...latencyDiffP50,
            faster: baseline.metadata.ormId,
          },
          p95: {
            ...latencyDiffP95,
            faster: baseline.metadata.ormId,
          },
          p99: {
            ...latencyDiffP99,
            faster: baseline.metadata.ormId,
          },
        },
        throughputDiff: {
          ...throughputDiff,
          higher: baseline.metadata.ormId,
        },
      },
    };
  }

  /**
   * Calculate difference between two values
   */
  private calculateDifference(
    baseline: number,
    comparison: number,
  ): ComparisonMetric {
    const absolute = Math.abs(comparison - baseline);
    const percentage = ((comparison - baseline) / baseline) * 100;

    return {
      absolute,
      percentage: Math.abs(percentage),
    };
  }

  /**
   * Calculate overall winner across all scenarios
   */
  private calculateOverallWinner(
    scenarios: ScenarioComparison[],
    orms: ComparedORM[],
  ) {
    // Count wins for each ORM
    const winCounts = new Map<string, number>();
    const categoryWins = new Map<
      string,
      Map<string, { wins: number; losses: number; ties: number }>
    >();

    // Initialize counts
    orms.forEach((orm) => {
      winCounts.set(orm.ormId, 0);
      categoryWins.set(orm.ormId, new Map());
    });

    // Count wins
    scenarios.forEach((scenario) => {
      const winnerId = scenario.winner.ormId;
      winCounts.set(winnerId, (winCounts.get(winnerId) || 0) + 1);

      // Track category wins
      const category = scenario.category;
      orms.forEach((orm) => {
        if (!categoryWins.get(orm.ormId)!.has(category)) {
          categoryWins
            .get(orm.ormId)!
            .set(category, { wins: 0, losses: 0, ties: 0 });
        }

        if (orm.ormId === winnerId) {
          categoryWins.get(orm.ormId)!.get(category)!.wins++;
        } else {
          categoryWins.get(orm.ormId)!.get(category)!.losses++;
        }
      });
    });

    // Find overall winner
    let maxWins = 0;
    let winnerId = '';

    winCounts.forEach((wins, ormId) => {
      if (wins > maxWins) {
        maxWins = wins;
        winnerId = ormId;
      }
    });

    // Calculate losses and ties for winner
    const totalScenarios = scenarios.length;
    const wins = maxWins;
    const losses = totalScenarios - wins;
    const ties = 0; // For now, we don't calculate ties

    // Convert category wins to plain object
    const categoryWinsObj: Record<
      string,
      { wins: number; losses: number; ties: number }
    > = {};
    const winnerCategoryWins = categoryWins.get(winnerId) || new Map();

    winnerCategoryWins.forEach((stats, category) => {
      categoryWinsObj[category] = stats;
    });

    return {
      ormId: winnerId,
      winsCount: wins,
      tiesCount: ties,
      lossesCount: losses,
      categories: categoryWinsObj,
    };
  }

  /**
   * Calculate comparison summary
   */
  private calculateComparisonSummary(
    scenarios: ScenarioComparison[],
  ): ComparisonSummary {
    const categories = [...new Set(scenarios.map((s) => s.category))];

    // Calculate significant differences (>10% difference)
    const significantDifferences = scenarios.filter((s) => {
      const p50Diff = s.comparison.latencyDiff.p50.percentage;
      return p50Diff > 10;
    }).length;

    // Calculate average performance difference
    const avgDiff =
      scenarios.reduce((sum, s) => {
        return sum + s.comparison.latencyDiff.p50.percentage;
      }, 0) / scenarios.length;

    return {
      totalScenarios: scenarios.length,
      categoriesCompared: categories,
      significantDifferences,
      averagePerformanceDiff: avgDiff,
    };
  }

  // ============================================================================
  // VERSION COMPARISONS
  // ============================================================================

  /**
   * Compare different versions of the same ORM
   */
  async compareVersions(ormName: string, versions: string[]): Promise<void> {
    if (versions.length < 2) {
      throw new Error('Need at least 2 versions to compare');
    }

    logger.info(`Comparing ${ormName} versions: ${versions.join(' vs ')}`);

    // Load results for each version from latest runs
    const versionResults = new Map<string, BenchmarkResult[]>();

    for (const version of versions) {
      const ormId = `${ormName}-v${version}`;
      const results = await this.loadLatestResultsForORM(ormId);
      versionResults.set(version, results);
    }

    // Get common scenarios across all versions
    const allScenarioIds = new Set<string>();
    versionResults.forEach((results) => {
      results.forEach((r) => allScenarioIds.add(r.metadata.scenarioId));
    });

    const commonScenarios = Array.from(allScenarioIds).filter((scenarioId) => {
      return versions.every((version) => {
        const results = versionResults.get(version) || [];
        return results.some((r) => r.metadata.scenarioId === scenarioId);
      });
    });

    // Compare each scenario
    const scenarioComparisons: VersionScenarioComparison[] = [];

    for (const scenarioId of commonScenarios) {
      const versionMetrics = new Map<string, BenchmarkMetrics>();

      for (const version of versions) {
        const results = versionResults.get(version) || [];
        const result = results.find(
          (r) => r.metadata.scenarioId === scenarioId,
        );
        if (result) {
          versionMetrics.set(version, result.metrics);
        }
      }

      const comparison = this.compareVersionScenario(
        scenarioId,
        versionMetrics,
        versions,
      );
      scenarioComparisons.push(comparison);
    }

    // Calculate significant changes
    const significantChanges = this.findSignificantChanges(
      scenarioComparisons,
      versions,
    );

    // Create comparison object
    const comparison: VersionComparison = {
      comparisonId: `${ormName}-version-comparison`,
      ormName,
      versions,
      generated: new Date().toISOString(),
      scenarios: scenarioComparisons,
      summary: {
        improvementCount: significantChanges.filter(
          (c) => c.type === 'improvement',
        ).length,
        regressionCount: significantChanges.filter(
          (c) => c.type === 'regression',
        ).length,
        noChangeCount: scenarioComparisons.length - significantChanges.length,
        significantChanges,
      },
    };

    // Save comparison
    const filename = `${ormName}-${versions.join('-vs-')}.json`;
    await fs.mkdir(path.join(this.comparisonsDir, 'version-comparisons'), {
      recursive: true,
    });
    await fs.writeFile(
      path.join(this.comparisonsDir, 'version-comparisons', filename),
      JSON.stringify(comparison, null, 2),
    );

    logger.success(`✓ Version comparison generated: ${filename}`);
  }

  /**
   * Compare a single scenario across versions
   */
  private compareVersionScenario(
    scenarioId: string,
    versionMetrics: Map<string, BenchmarkMetrics>,
    versions: string[],
  ): VersionScenarioComparison {
    // Get first and last version for trend calculation
    const firstVersion = versions[0];
    const lastVersion = versions[versions.length - 1];

    const firstMetrics = versionMetrics.get(firstVersion);
    const lastMetrics = versionMetrics.get(lastVersion);

    let trend: 'improving' | 'degrading' | 'stable' = 'stable';
    let changePercentage = 0;

    if (firstMetrics && lastMetrics) {
      const latencyChange =
        ((lastMetrics.latency.median - firstMetrics.latency.median) /
          firstMetrics.latency.median) *
        100;

      changePercentage = Math.abs(latencyChange);

      if (latencyChange < -5) {
        trend = 'improving'; // Latency decreased
      } else if (latencyChange > 5) {
        trend = 'degrading'; // Latency increased
      }
    }

    // Get scenario name from first result
    const scenarioName = scenarioId
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');

    return {
      scenarioId,
      scenarioName,
      category: 'crud', // Default, should be loaded from actual data
      versionResults: versionMetrics,
      trend,
      changePercentage,
    };
  }

  /**
   * Find significant changes between versions
   */
  private findSignificantChanges(
    scenarios: VersionScenarioComparison[],
    versions: string[],
  ): SignificantChange[] {
    const changes: SignificantChange[] = [];
    const threshold = 10; // 10% change is considered significant

    for (const scenario of scenarios) {
      if (scenario.changePercentage > threshold) {
        changes.push({
          scenarioId: scenario.scenarioId,
          scenarioName: scenario.scenarioName,
          type: scenario.trend === 'improving' ? 'improvement' : 'regression',
          metric: 'latency',
          changePercentage: scenario.changePercentage,
          fromVersion: versions[0],
          toVersion: versions[versions.length - 1],
        });
      }
    }

    return changes;
  }

  // ============================================================================
  // RUN COMPARISONS
  // ============================================================================

  /**
   * Compare two different runs
   */
  async compareRuns(run1: string, run2: string): Promise<void> {
    logger.info(`Comparing runs: ${run1} vs ${run2}`);

    // Load results from both runs
    const results1 = await this.loadAllResultsFromRun(run1);
    const results2 = await this.loadAllResultsFromRun(run2);

    // Find common ORMs and scenarios
    const orms1 = new Set(results1.map((r) => r.metadata.ormId));
    const orms2 = new Set(results2.map((r) => r.metadata.ormId));
    const commonORMs = Array.from(orms1).filter((orm) => orms2.has(orm));

    if (commonORMs.length === 0) {
      logger.warn('No common ORMs found between runs');
      return;
    }

    // Create comparison for each ORM
    for (const ormId of commonORMs) {
      const ormResults1 = results1.filter((r) => r.metadata.ormId === ormId);
      const ormResults2 = results2.filter((r) => r.metadata.ormId === ormId);

      // TODO: Implement detailed run comparison logic
      logger.info(
        `  Comparing ${ormId}: ${ormResults1.length} vs ${ormResults2.length} scenarios`,
      );
    }

    logger.success('✓ Run comparison completed');
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Load all results from a run
   */
  private async loadAllResultsFromRun(
    runId: string,
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    const runDir = path.join(this.baseDir, 'runs', runId);

    try {
      const orms = await fs.readdir(runDir);

      for (const orm of orms) {
        if (orm === 'metadata.json') continue;

        const ormDir = path.join(runDir, orm);
        const stat = await fs.stat(ormDir);

        if (stat.isDirectory()) {
          const categories = await fs.readdir(ormDir);

          for (const category of categories) {
            const categoryDir = path.join(ormDir, category);
            const categoryStat = await fs.stat(categoryDir);

            if (categoryStat.isDirectory()) {
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
        }
      }
    } catch (error) {
      logger.error(`Failed to load results from run ${runId}:`, error);
    }

    return results;
  }

  /**
   * Load latest results for a specific ORM
   */
  private async loadLatestResultsForORM(
    ormId: string,
  ): Promise<BenchmarkResult[]> {
    // Find the most recent run with this ORM
    const runsDir = path.join(this.baseDir, 'runs');
    const runs = await fs.readdir(runsDir);
    const sortedRuns = runs.sort().reverse();

    for (const runId of sortedRuns) {
      const ormDir = path.join(runsDir, runId, ormId);

      try {
        const stat = await fs.stat(ormDir);
        if (stat.isDirectory()) {
          // Found a run with this ORM
          return await this.loadAllResultsFromRun(runId);
        }
      } catch {
        continue;
      }
    }

    return [];
  }
}
