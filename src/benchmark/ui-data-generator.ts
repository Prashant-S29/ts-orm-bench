/**
 * UI Data Generator
 * Generates optimized data structures for UI consumption
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  UIIndex,
  RunListItem,
  ORMListItem,
  CategoryListItem,
  ScenarioListItem,
  UIDashboard,
  PerformanceChange,
  RunMetadata,
  BenchmarkResult,
  AggregatedORMResult,
  AggregatedScenarioResult,
  RegressionAlert,
} from './enhanced-types';
import { logger } from '../utils/logger';

export class UIDataGenerator {
  private baseDir: string;
  private uiDataDir: string;
  private aggregatedDir: string;
  private runsDir: string;

  constructor(baseDir: string = 'benchmark-results') {
    this.baseDir = baseDir;
    this.uiDataDir = path.join(baseDir, 'ui-data');
    this.aggregatedDir = path.join(baseDir, 'aggregated');
    this.runsDir = path.join(baseDir, 'runs');
  }

  // ============================================================================
  // COMPLETE UI DATA GENERATION
  // ============================================================================

  /**
   * Generate all UI data for a specific run
   */
  async generateAll(runId: string): Promise<void> {
    logger.info('Generating UI-optimized data...');

    // Generate main index
    await this.generateIndex();

    // Generate dashboard
    await this.generateDashboard(runId);

    // Generate comparison views
    await this.generateComparisonViews(runId);

    logger.success('✓ All UI data generated');
  }

  /**
   * Update UI data with new run (incremental update)
   */
  async updateWithNewRun(runId: string): Promise<void> {
    logger.info(`Updating UI data with run: ${runId}`);

    // Update index
    await this.generateIndex();

    // Update dashboard
    await this.generateDashboard(runId);

    // Update comparison views
    await this.generateComparisonViews(runId);

    logger.success('✓ UI data updated');
  }

  // ============================================================================
  // INDEX GENERATION
  // ============================================================================

  /**
   * Generate main UI index file
   */
  async generateIndex(): Promise<void> {
    const runs = await this.listAllRuns();
    const orms = await this.collectORMList();
    const categories = await this.collectCategories();
    const scenarios = await this.collectScenarios();

    const latestRun = runs.length > 0 ? runs[0] : null;

    const index: UIIndex = {
      version: '1.0.0',
      generated: new Date().toISOString(),
      latestRun: latestRun
        ? {
            runId: latestRun.runId,
            timestamp: latestRun.timestamp,
          }
        : {
            runId: '',
            timestamp: '',
          },
      availableRuns: runs,
      orms,
      categories,
      scenarios,
    };

    // Save index
    const latestDir = path.join(this.uiDataDir, 'latest');
    await fs.mkdir(latestDir, { recursive: true });
    await fs.writeFile(
      path.join(latestDir, 'index.json'),
      JSON.stringify(index, null, 2),
    );

    logger.info('  ✓ Index generated');
  }

  /**
   * List all runs with metadata
   */
  private async listAllRuns(): Promise<RunListItem[]> {
    const runDirs = await fs.readdir(this.runsDir);
    const runs: RunListItem[] = [];

    for (const runId of runDirs) {
      try {
        const metadataPath = path.join(this.runsDir, runId, 'metadata.json');
        const content = await fs.readFile(metadataPath, 'utf-8');
        const metadata: RunMetadata = JSON.parse(content);

        // Create human-readable label
        const date = new Date(metadata.timestamp);
        const label = this.formatRunLabel(date);

        runs.push({
          runId: metadata.runId,
          timestamp: metadata.timestamp,
          label,
          orms: metadata.testedORMs.map((o) => o.ormId),
          categories: metadata.configuration.enabledCategories,
          scenarioCount: metadata.summary.totalScenarios,
          status: metadata.status,
        });
      } catch (error) {
        logger.warn(`Could not load metadata for run: ${runId}`);
      }
    }

    // Sort by timestamp (newest first)
    return runs.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    );
  }

  /**
   * Format run label for UI display
   */
  private formatRunLabel(date: Date): string {
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffHours < 1) {
      return 'Just now';
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return `${diffDays} days ago`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    }
  }

  /**
   * Collect list of all ORMs
   */
  private async collectORMList(): Promise<ORMListItem[]> {
    const ormMap = new Map<string, ORMListItem>();

    try {
      const ormDir = path.join(this.aggregatedDir, 'by-orm');
      const files = await fs.readdir(ormDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(path.join(ormDir, file), 'utf-8');
          const data: AggregatedORMResult = JSON.parse(content);

          ormMap.set(data.ormId, {
            id: data.ormId,
            name: data.ormName,
            version: data.ormVersion,
            firstSeen: data.firstSeen,
            lastTested: data.lastTested,
            totalRuns: data.totalRuns,
          });
        }
      }
    } catch (error) {
      logger.warn('Could not collect ORM list:');
    }

    return Array.from(ormMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * Collect list of categories
   */
  private async collectCategories(): Promise<CategoryListItem[]> {
    const categoryMap = new Map<string, CategoryListItem>();

    try {
      const scenarioDir = path.join(this.aggregatedDir, 'by-scenario');
      const files = await fs.readdir(scenarioDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(
            path.join(scenarioDir, file),
            'utf-8',
          );
          const data: AggregatedScenarioResult = JSON.parse(content);

          const category = data.category;
          if (!categoryMap.has(category)) {
            categoryMap.set(category, {
              id: category,
              name: this.formatCategoryName(category),
              scenarioCount: 0,
            });
          }

          const item = categoryMap.get(category)!;
          item.scenarioCount++;
        }
      }
    } catch (error) {
      logger.warn('Could not collect categories:');
    }

    return Array.from(categoryMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name),
    );
  }

  /**
   * Collect list of scenarios
   */
  private async collectScenarios(): Promise<ScenarioListItem[]> {
    const scenarios: ScenarioListItem[] = [];

    try {
      const scenarioDir = path.join(this.aggregatedDir, 'by-scenario');
      const files = await fs.readdir(scenarioDir);

      for (const file of files) {
        if (file.endsWith('.json')) {
          const content = await fs.readFile(
            path.join(scenarioDir, file),
            'utf-8',
          );
          const data: AggregatedScenarioResult = JSON.parse(content);

          scenarios.push({
            id: data.scenarioId,
            name: data.scenarioName,
            category: data.category,
            description: undefined, // Can be added from scenario registry
          });
        }
      }
    } catch (error) {
      logger.warn('Could not collect scenarios:');
    }

    return scenarios.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Format category name for display
   */
  private formatCategoryName(category: string): string {
    const nameMap: Record<string, string> = {
      crud: 'CRUD Operations',
      relations: 'Relations & Joins',
      aggregations: 'Aggregations',
      filtering: 'Filtering & Sorting',
      transactions: 'Transactions',
      mixed: 'Mixed Operations',
    };

    return (
      nameMap[category] || category.charAt(0).toUpperCase() + category.slice(1)
    );
  }

  // ============================================================================
  // DASHBOARD GENERATION
  // ============================================================================

  /**
   * Generate dashboard data
   */
  async generateDashboard(runId: string): Promise<void> {
    const runs = await this.listAllRuns();
    const orms = await this.collectORMList();
    const scenarios = await this.collectScenarios();

    // Load latest run metadata
    const latestMetadata = await this.loadRunMetadata(runId);
    if (!latestMetadata) {
      logger.warn('Could not load run metadata for dashboard');
      return;
    }

    // Find top performers
    const topPerformers = await this.findTopPerformers(runId);

    // Calculate category winners
    const categoryWinners = await this.calculateCategoryWinners(runId);

    // Get recent performance changes
    const performanceChanges = await this.getPerformanceChanges(7); // Last 7 days

    // Load regression alerts
    const regressions = await this.loadRegressionAlerts();

    const dashboard: UIDashboard = {
      generated: new Date().toISOString(),
      summary: {
        totalRuns: runs.length,
        totalScenarios: scenarios.length,
        totalORMs: orms.length,
        lastRunDate: latestMetadata.timestamp,
      },
      latestResults: {
        runId: latestMetadata.runId,
        timestamp: latestMetadata.timestamp,
        topPerformers,
        categoryWinners,
      },
      trends: {
        period: 'week',
        performanceChanges,
      },
      recentRegressions: regressions.slice(0, 10), // Top 10 most recent
    };

    // Save dashboard
    const latestDir = path.join(this.uiDataDir, 'latest');
    await fs.mkdir(latestDir, { recursive: true });
    await fs.writeFile(
      path.join(latestDir, 'dashboard.json'),
      JSON.stringify(dashboard, null, 2),
    );

    logger.info('  ✓ Dashboard generated');
  }

  /**
   * Find top performers in latest run
   */
  private async findTopPerformers(runId: string): Promise<{
    latency: { ormId: string; ormName: string; value: number };
    throughput: { ormId: string; ormName: string; value: number };
  }> {
    const results = await this.loadAllResultsFromRun(runId);

    if (results.length === 0) {
      return {
        latency: { ormId: '', ormName: '', value: 0 },
        throughput: { ormId: '', ormName: '', value: 0 },
      };
    }

    // Group by ORM and calculate averages
    const ormStats = new Map<
      string,
      {
        ormName: string;
        latencies: number[];
        throughputs: number[];
      }
    >();

    results.forEach((result) => {
      const ormId = result.metadata.ormId;
      if (!ormStats.has(ormId)) {
        ormStats.set(ormId, {
          ormName: result.metadata.ormName,
          latencies: [],
          throughputs: [],
        });
      }

      const stats = ormStats.get(ormId)!;
      stats.latencies.push(result.metrics.latency.median);
      stats.throughputs.push(result.metrics.throughput.rps);
    });

    // Find best latency
    let bestLatency = { ormId: '', ormName: '', value: Infinity };
    let bestThroughput = { ormId: '', ormName: '', value: 0 };

    ormStats.forEach((stats, ormId) => {
      const avgLatency =
        stats.latencies.reduce((a, b) => a + b, 0) / stats.latencies.length;
      const avgThroughput =
        stats.throughputs.reduce((a, b) => a + b, 0) / stats.throughputs.length;

      if (avgLatency < bestLatency.value) {
        bestLatency = {
          ormId,
          ormName: stats.ormName,
          value: avgLatency,
        };
      }

      if (avgThroughput > bestThroughput.value) {
        bestThroughput = {
          ormId,
          ormName: stats.ormName,
          value: avgThroughput,
        };
      }
    });

    return {
      latency: bestLatency,
      throughput: bestThroughput,
    };
  }

  /**
   * Calculate category winners
   */
  private async calculateCategoryWinners(
    runId: string,
  ): Promise<Map<string, string>> {
    const winners = new Map<string, string>();
    const results = await this.loadAllResultsFromRun(runId);

    // Group by category
    const categoryMap = new Map<string, BenchmarkResult[]>();
    results.forEach((result) => {
      const category = result.metadata.scenarioCategory;
      if (!categoryMap.has(category)) {
        categoryMap.set(category, []);
      }
      categoryMap.get(category)!.push(result);
    });

    // Find winner for each category
    categoryMap.forEach((categoryResults, category) => {
      const ormStats = new Map<string, number[]>();

      categoryResults.forEach((result) => {
        const ormId = result.metadata.ormId;
        if (!ormStats.has(ormId)) {
          ormStats.set(ormId, []);
        }
        ormStats.get(ormId)!.push(result.metrics.latency.median);
      });

      let bestOrm = '';
      let bestAvgLatency = Infinity;

      ormStats.forEach((latencies, ormId) => {
        const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
        if (avg < bestAvgLatency) {
          bestAvgLatency = avg;
          bestOrm = ormId;
        }
      });

      winners.set(category, bestOrm);
    });

    return winners;
  }

  /**
   * Get recent performance changes
   */
  private async getPerformanceChanges(
    daysBack: number,
  ): Promise<PerformanceChange[]> {
    // TODO: Implement performance change detection
    // This would compare recent runs to detect trends
    return [];
  }

  /**
   * Load regression alerts
   */
  private async loadRegressionAlerts(): Promise<RegressionAlert[]> {
    try {
      const alertsPath = path.join(
        this.uiDataDir,
        'historical',
        'regression-alerts.json',
      );
      const content = await fs.readFile(alertsPath, 'utf-8');
      const data = JSON.parse(content);

      return [
        ...(data.regressions?.critical || []),
        ...(data.regressions?.warnings || []),
        ...(data.regressions?.minor || []),
      ];
    } catch {
      return [];
    }
  }

  // ============================================================================
  // COMPARISON VIEWS
  // ============================================================================

  /**
   * Generate comparison views for UI
   */
  async generateComparisonViews(runId: string): Promise<void> {
    // Load ORM comparison
    const ormComparisonPath = path.join(
      this.aggregatedDir,
      'comparisons',
      'orm-comparisons',
      'latest.json',
    );

    try {
      const content = await fs.readFile(ormComparisonPath, 'utf-8');
      const ormComparison = JSON.parse(content);

      // Save to UI data
      const comparisonsDir = path.join(this.uiDataDir, 'comparisons');
      await fs.mkdir(comparisonsDir, { recursive: true });

      await fs.writeFile(
        path.join(comparisonsDir, 'latest-all-orms.json'),
        JSON.stringify(ormComparison, null, 2),
      );

      // Generate category-specific comparisons
      await this.generateCategoryComparisons(ormComparison);

      logger.info('  ✓ Comparison views generated');
    } catch (error) {
      logger.warn('Could not generate comparison views');
    }
  }

  /**
   * Generate category-specific comparison views
   */
  private async generateCategoryComparisons(ormComparison: any): Promise<void> {
    const categories = new Set<string>();
    ormComparison.scenarios.forEach((s: any) => categories.add(s.category));

    const comparisonsDir = path.join(this.uiDataDir, 'comparisons');

    for (const category of categories) {
      const categoryScenarios = ormComparison.scenarios.filter(
        (s: any) => s.category === category,
      );

      const categoryComparison = {
        ...ormComparison,
        scenarios: categoryScenarios,
        category,
      };

      await fs.writeFile(
        path.join(comparisonsDir, `${category}-only.json`),
        JSON.stringify(categoryComparison, null, 2),
      );
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Load run metadata
   */
  private async loadRunMetadata(runId: string): Promise<RunMetadata | null> {
    try {
      const metadataPath = path.join(this.runsDir, runId, 'metadata.json');
      const content = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  /**
   * Load all results from a run
   */
  private async loadAllResultsFromRun(
    runId: string,
  ): Promise<BenchmarkResult[]> {
    const results: BenchmarkResult[] = [];
    const runDir = path.join(this.runsDir, runId);

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
      logger.error(`Failed to load results from run ${runId}:`);
    }

    return results;
  }

  /**
   * Generate runs list file
   */
  async generateRunsList(): Promise<void> {
    const runs = await this.listAllRuns();

    const latestDir = path.join(this.uiDataDir, 'latest');
    await fs.mkdir(latestDir, { recursive: true });
    await fs.writeFile(
      path.join(latestDir, 'runs-list.json'),
      JSON.stringify({ runs, generated: new Date().toISOString() }, null, 2),
    );

    logger.info('  ✓ Runs list generated');
  }

  /**
   * Generate ORMs list file
   */
  async generateORMsList(): Promise<void> {
    const orms = await this.collectORMList();

    const latestDir = path.join(this.uiDataDir, 'latest');
    await fs.mkdir(latestDir, { recursive: true });
    await fs.writeFile(
      path.join(latestDir, 'orms-list.json'),
      JSON.stringify({ orms, generated: new Date().toISOString() }, null, 2),
    );

    logger.info('  ✓ ORMs list generated');
  }

  /**
   * Generate scenarios list file
   */
  async generateScenariosList(): Promise<void> {
    const scenarios = await this.collectScenarios();

    const latestDir = path.join(this.uiDataDir, 'latest');
    await fs.mkdir(latestDir, { recursive: true });
    await fs.writeFile(
      path.join(latestDir, 'scenarios-list.json'),
      JSON.stringify(
        { scenarios, generated: new Date().toISOString() },
        null,
        2,
      ),
    );

    logger.info('  ✓ Scenarios list generated');
  }
}
