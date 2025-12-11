/**
 * Generate Markdown Results
 * Creates human-readable markdown files for benchmark results
 * Also copies UI data to ui/public/data/ directory for Next.js
 */

import * as fs from 'fs/promises';
import * as path from 'path';
import { logger } from '../utils/logger';
import type {
  RunMetadata,
  BenchmarkResult,
  ORMComparison,
  AggregatedCategoryResult,
} from '../benchmark/enhanced-types';

export class MarkdownGenerator {
  private baseDir: string;
  private resultsDir: string;
  private uiDataDir: string;
  private uiPublicDir: string;

  constructor(baseDir: string = 'benchmark-results') {
    this.baseDir = baseDir;
    this.resultsDir = 'results';
    this.uiDataDir = path.join(baseDir, 'ui-data');
    this.uiPublicDir = 'ui/public/data';
  }

  /**
   * Generate all markdown files for a run
   */
  async generateAll(runId: string): Promise<void> {
    logger.info('\n📝 Generating markdown documentation...');

    // Load run metadata
    const metadata = await this.loadRunMetadata(runId);
    if (!metadata) {
      throw new Error(`Run metadata not found: ${runId}`);
    }

    // Create results directory for this run
    const runResultsDir = path.join(this.resultsDir, runId);
    await fs.mkdir(runResultsDir, { recursive: true });

    // Save metadata
    await this.saveMetadata(runResultsDir, metadata);

    // Generate summary.md
    await this.generateSummary(runId, runResultsDir, metadata);

    // Generate category-specific markdown files
    await this.generateCategoryFiles(runId, runResultsDir, metadata);

    // Copy UI data to ui/public/data
    await this.copyUIData();

    logger.success('✓ Markdown documentation generated');
    logger.info(`  📁 ${runResultsDir}/`);
    logger.info(`  📄 summary.md`);
    logger.info(`  📄 CRUD.md`);
    logger.info(`  📁 ui/public/data/ (UI data copied)`);
  }

  /**
   * Save metadata.json
   */
  private async saveMetadata(
    runResultsDir: string,
    metadata: RunMetadata,
  ): Promise<void> {
    await fs.writeFile(
      path.join(runResultsDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2),
    );
  }

  /**
   * Generate summary.md
   */
  private async generateSummary(
    runId: string,
    runResultsDir: string,
    metadata: RunMetadata,
  ): Promise<void> {
    // Load ORM comparison
    const comparison = await this.loadComparison(runId);
    if (!comparison) {
      logger.warn('No comparison data found, skipping summary');
      return;
    }

    const lines: string[] = [];

    // Header
    lines.push('# Benchmark Results Summary\n');
    lines.push(`**Run ID:** ${runId}`);
    lines.push(`**Date:** ${new Date(metadata.timestamp).toLocaleString()}`);
    lines.push(`**Duration:** ${(metadata.duration / 1000).toFixed(2)}s`);
    lines.push(`**Status:** ${metadata.status}\n`);

    // Environment
    lines.push('## Test Environment\n');
    lines.push('### Hardware');
    lines.push(`- **CPU**: ${metadata.environment.cpuModel}`);
    lines.push(`- **Cores**: ${metadata.environment.cpuCores}`);
    lines.push(`- **RAM**: ${metadata.environment.totalMemoryMB} MB`);
    lines.push(
      `- **OS**: ${metadata.environment.platform} ${metadata.environment.arch}`,
    );
    lines.push(`- **Node**: ${metadata.environment.nodeVersion}\n`);

    lines.push('### Database');
    lines.push(
      `- **PostgreSQL**: ${metadata.environment.postgresVersion || 'Unknown'}`,
    );
    lines.push(
      `- **Connection Pool**: ${metadata.environment.connectionPoolSize}`,
    );
    lines.push(
      `- **Host**: ${metadata.configuration.databaseConfig.host}:${metadata.configuration.databaseConfig.port}\n`,
    );

    // Overall Summary Table
    lines.push('## Overall Summary\n');

    const ormStats = this.calculateORMStats(comparison);

    lines.push('| ORM | Wins | Average p50 | Average p95 | Avg RPS |');
    lines.push('|-----|------|-------------|-------------|---------|');

    for (const [ormId, stats] of Object.entries(ormStats)) {
      const isWinner = ormId === comparison.overallWinner.ormId;
      const ormName =
        comparison.orms.find((o) => o.ormId === ormId)?.name || ormId;
      const ormVersion =
        comparison.orms.find((o) => o.ormId === ormId)?.version || '';

      const nameCell = isWinner
        ? `**${ormName}@${ormVersion}**`
        : `${ormName}@${ormVersion}`;
      const winsCell = isWinner
        ? `**${stats.wins}/${comparison.scenarios.length}**`
        : `${stats.wins}/${comparison.scenarios.length}`;
      const p50Cell = isWinner
        ? `**${stats.avgP50.toFixed(2)}ms**`
        : `${stats.avgP50.toFixed(2)}ms`;
      const p95Cell = isWinner
        ? `**${stats.avgP95.toFixed(2)}ms**`
        : `${stats.avgP95.toFixed(2)}ms`;
      const rpsCell = isWinner
        ? `**${Math.round(stats.avgRPS)} RPS**`
        : `${Math.round(stats.avgRPS)} RPS`;

      lines.push(
        `| ${nameCell} | ${winsCell} | ${p50Cell} | ${p95Cell} | ${rpsCell} |`,
      );
    }

    lines.push('');

    // Winner announcement
    const winner = comparison.orms.find(
      (o) => o.ormId === comparison.overallWinner.ormId,
    );
    if (winner) {
      const speedup = this.calculateSpeedup(
        ormStats,
        comparison.overallWinner.ormId,
      );
      lines.push(
        `**Winner**: **${winner.name}@${winner.version}** - Wins ${comparison.overallWinner.winsCount}/${comparison.scenarios.length} scenarios with **${speedup}x average speedup**\n`,
      );
    }

    // Category breakdown
    lines.push('## Category Breakdown\n');

    const categories = new Set(comparison.scenarios.map((s) => s.category));
    for (const category of categories) {
      const categoryScenarios = comparison.scenarios.filter(
        (s) => s.category === category,
      );
      const categoryWinner = this.getCategoryWinner(categoryScenarios);

      const categoryName = this.formatCategoryName(category);
      lines.push(`### ${categoryName}`);
      lines.push(`- **Scenarios**: ${categoryScenarios.length}`);
      lines.push(
        `- **Winner**: ${categoryWinner.name}@${categoryWinner.version} (${categoryWinner.wins}/${categoryScenarios.length} wins)`,
      );
      lines.push(
        `- **Details**: [${categoryName} Results](./${category.toUpperCase()}.md)\n`,
      );
    }

    // Tested ORMs
    lines.push('## Tested ORMs\n');
    for (const orm of metadata.testedORMs) {
      lines.push(`### ${orm.name}@${orm.version}`);
      lines.push(`- **Scenarios Run**: ${orm.scenariosRun}`);
      lines.push(
        `- **Success Rate**: ${orm.scenariosSucceeded}/${orm.scenariosRun} (${(
          (orm.scenariosSucceeded / orm.scenariosRun) *
          100
        ).toFixed(1)}%)`,
      );
      if (orm.scenariosFailed > 0) {
        lines.push(`- **Failed**: ${orm.scenariosFailed}`);
      }
      lines.push('');
    }

    // Configuration
    lines.push('## Test Configuration\n');
    lines.push(
      `- **Warmup Iterations**: ${metadata.configuration.warmupIterations}`,
    );
    lines.push(
      `- **Test Iterations**: ${metadata.configuration.testIterations}`,
    );
    lines.push(
      `- **Categories**: ${metadata.configuration.enabledCategories.join(
        ', ',
      )}`,
    );
    lines.push(
      `- **Total Scenarios**: ${metadata.configuration.enabledScenarios.length}\n`,
    );

    // Git info if available
    if (metadata.gitInfo) {
      lines.push('## Git Information\n');
      lines.push(`- **Branch**: ${metadata.gitInfo.branch}`);
      lines.push(`- **Commit**: ${metadata.gitInfo.commit.substring(0, 7)}`);
      lines.push(
        `- **Clean**: ${
          metadata.gitInfo.isDirty ? 'No (uncommitted changes)' : 'Yes'
        }\n`,
      );
    }

    // Footer
    lines.push('---\n');
    lines.push(`**Generated**: ${new Date().toISOString()}`);
    lines.push(`**Benchmark Version**: 1.0.0\n`);

    // Save
    await fs.writeFile(
      path.join(runResultsDir, 'summary.md'),
      lines.join('\n'),
    );
  }

  /**
   * Generate category-specific markdown files (e.g., CRUD.md)
   */
  private async generateCategoryFiles(
    runId: string,
    runResultsDir: string,
    metadata: RunMetadata,
  ): Promise<void> {
    // Load comparison
    const comparison = await this.loadComparison(runId);
    if (!comparison) {
      return;
    }

    // Group scenarios by category
    const categoriesMap = new Map<string, typeof comparison.scenarios>();
    comparison.scenarios.forEach((scenario) => {
      if (!categoriesMap.has(scenario.category)) {
        categoriesMap.set(scenario.category, []);
      }
      categoriesMap.get(scenario.category)!.push(scenario);
    });

    // Generate file for each category
    for (const [category, scenarios] of categoriesMap) {
      await this.generateCategoryFile(
        category,
        scenarios,
        comparison.orms,
        runResultsDir,
        metadata,
      );
    }
  }

  /**
   * Generate a single category markdown file
   */
  private async generateCategoryFile(
    category: string,
    scenarios: any[],
    orms: any[],
    runResultsDir: string,
    metadata: RunMetadata,
  ): Promise<void> {
    const lines: string[] = [];
    const categoryName = this.formatCategoryName(category);

    // Header
    lines.push(`# ${categoryName} Benchmark Results\n`);
    lines.push(
      `Comparing ${categoryName.toLowerCase()} between ${orms
        .map((o) => `${o.name}@${o.version}`)
        .join(' and ')}.\n`,
    );

    // Environment (brief)
    lines.push('## Test Environment\n');
    lines.push('### Hardware');
    lines.push(
      `- **CPU**: ${metadata.environment.cpuModel} (${metadata.environment.cpuCores} cores)`,
    );
    lines.push(`- **RAM**: ${metadata.environment.totalMemoryMB} MB`);
    lines.push(`- **Node**: ${metadata.environment.nodeVersion}\n`);

    // Overall category summary
    lines.push('## Overall Summary\n');

    const categoryStats = this.calculateCategoryStats(scenarios, orms);

    lines.push('| ORM | Wins | Average p50 | Average p95 | Avg RPS |');
    lines.push('|-----|------|-------------|-------------|---------|');

    for (const [ormId, stats] of Object.entries(categoryStats)) {
      const orm = orms.find((o) => o.ormId === ormId);
      const isWinner =
        stats.wins ===
        Math.max(...Object.values(categoryStats).map((s: any) => s.wins));

      const nameCell = isWinner
        ? `**${orm?.name}@${orm?.version}**`
        : `${orm?.name}@${orm?.version}`;
      const winsCell = isWinner
        ? `**${stats.wins}/${scenarios.length}**`
        : `${stats.wins}/${scenarios.length}`;
      const p50Cell = isWinner
        ? `**${stats.avgP50.toFixed(2)}ms**`
        : `${stats.avgP50.toFixed(2)}ms`;
      const p95Cell = isWinner
        ? `**${stats.avgP95.toFixed(2)}ms**`
        : `${stats.avgP95.toFixed(2)}ms`;
      const rpsCell = isWinner
        ? `**${Math.round(stats.avgRPS)} RPS**`
        : `${Math.round(stats.avgRPS)} RPS`;

      lines.push(
        `| ${nameCell} | ${winsCell} | ${p50Cell} | ${p95Cell} | ${rpsCell} |`,
      );
    }

    lines.push('');

    // Detailed results for each scenario
    lines.push('## Detailed Results\n');

    scenarios.forEach((scenario, index) => {
      lines.push(`### ${index + 1}. ${scenario.scenarioName}\n`);
      lines.push(
        `**Use Case**: ${this.getScenarioUseCase(scenario.scenarioId)}\n`,
      );

      lines.push('| ORM | p50 | p95 | p99 | RPS |');
      lines.push('|-----|-----|-----|-----|-----|');

      const winner = scenario.results.find(
        (r: any) => r.ormId === scenario.winner.ormId,
      );

      scenario.results.forEach((result: any) => {
        const isWinner = result.ormId === scenario.winner.ormId;
        const orm = orms.find((o) => o.ormId === result.ormId);

        const nameCell = isWinner
          ? `**${orm?.name}@${orm?.version}**`
          : `${orm?.name}@${orm?.version}`;
        const p50Cell = isWinner
          ? `**${result.metrics.latency.median.toFixed(2)}ms**`
          : `${result.metrics.latency.median.toFixed(2)}ms`;
        const p95Cell = isWinner
          ? `**${result.metrics.latency.p95.toFixed(2)}ms**`
          : `${result.metrics.latency.p95.toFixed(2)}ms`;
        const p99Cell = isWinner
          ? `**${result.metrics.latency.p99.toFixed(2)}ms**`
          : `${result.metrics.latency.p99.toFixed(2)}ms`;
        const rpsCell = isWinner
          ? `**${Math.round(result.metrics.throughput.rps)} RPS**`
          : `${Math.round(result.metrics.throughput.rps)} RPS`;

        lines.push(
          `| ${nameCell} | ${p50Cell} | ${p95Cell} | ${p99Cell} | ${rpsCell} |`,
        );
      });

      lines.push('');

      // Winner announcement
      if (winner) {
        const loser = scenario.results.find(
          (r: any) => r.ormId !== scenario.winner.ormId,
        );
        if (loser) {
          const improvement =
            ((loser.metrics.latency.median - winner.metrics.latency.median) /
              loser.metrics.latency.median) *
            100;
          const winnerOrm = orms.find((o) => o.ormId === winner.ormId);
          lines.push(
            `**Winner**: ${winnerOrm?.name}@${
              winnerOrm?.version
            } - **${improvement.toFixed(1)}% faster**\n`,
          );
        }
      }

      lines.push('---\n');
    });

    // Footer
    lines.push(`**Generated**: ${new Date().toISOString()}`);
    lines.push(`**Run ID**: ${metadata.runId}\n`);

    // Save
    const filename = `${category.toUpperCase()}.md`;
    await fs.writeFile(path.join(runResultsDir, filename), lines.join('\n'));
  }

  /**
   * Copy UI data to ui/public/data directory
   */
  private async copyUIData(): Promise<void> {
    logger.info('\n📦 Copying UI data...');

    // Create ui/public/data directory
    await fs.mkdir(this.uiPublicDir, { recursive: true });

    // Copy all UI data files
    const uiLatestDir = path.join(this.uiDataDir, 'latest');
    const uiComparisonsDir = path.join(this.uiDataDir, 'comparisons');

    try {
      // Copy latest data
      const latestFiles = await fs.readdir(uiLatestDir);
      for (const file of latestFiles) {
        if (file.endsWith('.json')) {
          await fs.copyFile(
            path.join(uiLatestDir, file),
            path.join(this.uiPublicDir, file),
          );
        }
      }

      // Copy comparisons
      const comparisonFiles = await fs.readdir(uiComparisonsDir);
      for (const file of comparisonFiles) {
        if (file.endsWith('.json')) {
          await fs.copyFile(
            path.join(uiComparisonsDir, file),
            path.join(this.uiPublicDir, file),
          );
        }
      }

      logger.success(`✓ UI data copied to ${this.uiPublicDir}`);
    } catch (error) {
      logger.warn('Could not copy UI data');
    }
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  private async loadRunMetadata(runId: string): Promise<RunMetadata | null> {
    try {
      const content = await fs.readFile(
        path.join(this.baseDir, 'runs', runId, 'metadata.json'),
        'utf-8',
      );
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private async loadComparison(runId: string): Promise<ORMComparison | null> {
    try {
      const content = await fs.readFile(
        path.join(
          this.baseDir,
          'aggregated',
          'comparisons',
          'orm-comparisons',
          `${runId}-orm-comparison.json`,
        ),
        'utf-8',
      );
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  private calculateORMStats(comparison: ORMComparison): Record<string, any> {
    const stats: Record<string, any> = {};

    comparison.orms.forEach((orm) => {
      const ormResults = comparison.scenarios
        .map((s) => s.results.find((r) => r.ormId === orm.ormId))
        .filter((r) => r !== undefined);

      const wins = comparison.scenarios.filter(
        (s) => s.winner.ormId === orm.ormId,
      ).length;
      const avgP50 =
        ormResults.reduce((sum, r) => sum + r!.metrics.latency.median, 0) /
        ormResults.length;
      const avgP95 =
        ormResults.reduce((sum, r) => sum + r!.metrics.latency.p95, 0) /
        ormResults.length;
      const avgRPS =
        ormResults.reduce((sum, r) => sum + r!.metrics.throughput.rps, 0) /
        ormResults.length;

      stats[orm.ormId] = { wins, avgP50, avgP95, avgRPS };
    });

    return stats;
  }

  private calculateCategoryStats(
    scenarios: any[],
    orms: any[],
  ): Record<string, any> {
    const stats: Record<string, any> = {};

    orms.forEach((orm) => {
      const ormResults = scenarios
        .map((s) => s.results.find((r: any) => r.ormId === orm.ormId))
        .filter((r) => r !== undefined);

      const wins = scenarios.filter((s) => s.winner.ormId === orm.ormId).length;
      const avgP50 =
        ormResults.reduce((sum, r) => sum + r!.metrics.latency.median, 0) /
        ormResults.length;
      const avgP95 =
        ormResults.reduce((sum, r) => sum + r!.metrics.latency.p95, 0) /
        ormResults.length;
      const avgRPS =
        ormResults.reduce((sum, r) => sum + r!.metrics.throughput.rps, 0) /
        ormResults.length;

      stats[orm.ormId] = { wins, avgP50, avgP95, avgRPS };
    });

    return stats;
  }

  private calculateSpeedup(
    stats: Record<string, any>,
    winnerId: string,
  ): string {
    const winnerStats = stats[winnerId];
    const loserStats = Object.values(stats).find((s: any) => s !== winnerStats);

    if (!loserStats) return '1.00';

    const speedup = (loserStats as any).avgP50 / winnerStats.avgP50;
    return speedup.toFixed(2);
  }

  private getCategoryWinner(scenarios: any[]): any {
    const winCounts: Record<string, number> = {};

    scenarios.forEach((s) => {
      winCounts[s.winner.ormId] = (winCounts[s.winner.ormId] || 0) + 1;
    });

    const winnerId = Object.keys(winCounts).reduce((a, b) =>
      winCounts[a] > winCounts[b] ? a : b,
    );

    const scenario = scenarios[0];
    const winnerResult = scenario.results.find(
      (r: any) => r.ormId === winnerId,
    );

    return {
      ormId: winnerId,
      name: winnerResult.ormName,
      version: winnerResult.ormVersion,
      wins: winCounts[winnerId],
    };
  }

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

  private getScenarioUseCase(scenarioId: string): string {
    const useCases: Record<string, string> = {
      select_by_id:
        'Fetching a single record by primary key (most common operation)',
      select_by_email: 'Login/authentication queries using indexed column',
      select_pagination: 'List views with offset/limit pagination',
      insert_single: 'User registration, creating new records',
      update_single: 'Profile updates, status changes',
      delete_single: 'Account deletion, data cleanup',
      bulk_insert: 'Batch imports, data migrations',
    };

    return useCases[scenarioId] || 'Standard database operation';
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const runId = args[0];

  if (!runId) {
    logger.error('Please provide a run ID');
    logger.info('\nUsage:');
    logger.info('  pnpm generate-markdown <runId>');
    process.exit(1);
  }

  const generator = new MarkdownGenerator();
  await generator.generateAll(runId);
}

if (require.main === module) {
  main().catch((error) => {
    logger.error('Failed to generate markdown:', error);
    process.exit(1);
  });
}
