/**
 * Storage Manager
 * High-level orchestration of storage operations, aggregations, and UI data generation
 */

import { ResultsStorage } from './results-storage';
import { ComparisonGenerator } from './comparison-generator';
import { HistoricalTracker } from './historical-tracker';
import { UIDataGenerator } from './ui-data-generator';
import type {
  AggregationOptions,
  ComparisonOptions,
  CleanupOptions,
} from './enhanced-types';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export class StorageManager {
  private storage: ResultsStorage;
  private comparisonGenerator: ComparisonGenerator;
  private historicalTracker: HistoricalTracker;
  private uiDataGenerator: UIDataGenerator;

  constructor(baseDir: string = 'benchmark-results') {
    this.storage = new ResultsStorage(baseDir);
    this.comparisonGenerator = new ComparisonGenerator(baseDir);
    this.historicalTracker = new HistoricalTracker(baseDir);
    this.uiDataGenerator = new UIDataGenerator(baseDir);
  }

  /**
   * Initialize all storage components
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
    logger.success('✓ Storage manager initialized');
  }

  /**
   * Get the underlying storage instance
   */
  getStorage(): ResultsStorage {
    return this.storage;
  }

  // ============================================================================
  // COMPLETE AGGREGATION WORKFLOW
  // ============================================================================

  /**
   * Generate all aggregations for a specific run
   */
  async generateAllAggregations(
    runId: string,
    options: Partial<AggregationOptions> = {},
  ): Promise<void> {
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('Generating All Aggregations');
    logger.info('='.repeat(60));

    const startTime = Date.now();

    // Load run metadata to get ORMs and scenarios
    const metadata = await this.storage.loadRunMetadata(runId);
    if (!metadata) {
      throw new Error(`Run not found: ${runId}`);
    }

    logger.info(`Run: ${runId}`);
    logger.info(`ORMs: ${metadata.testedORMs.length}`);
    logger.info(`Scenarios: ${metadata.summary.totalScenarios}`);
    logger.info('');

    // Step 1: Aggregate by ORM
    logger.info('📊 Step 1: Aggregating by ORM...');
    const ormIds = options.ormIds || metadata.testedORMs.map((o) => o.ormId);
    for (const ormId of ormIds) {
      try {
        await this.storage.aggregateByORM(ormId, runId);
        logger.success(`  ✓ ${ormId}`);
      } catch (error) {
        logger.error(`  ✗ ${ormId}:`, error);
      }
    }

    // Step 2: Aggregate by scenario
    logger.info('\n📊 Step 2: Aggregating by scenario...');
    const allResults = await this.storage.loadAllResultsFromRun(runId);
    const scenarioIds = [
      ...new Set(allResults.map((r) => r.metadata.scenarioId)),
    ];

    for (const scenarioId of scenarioIds) {
      try {
        await this.storage.aggregateByScenario(scenarioId, runId);
        logger.success(`  ✓ ${scenarioId}`);
      } catch (error) {
        logger.error(`  ✗ ${scenarioId}:`, error);
      }
    }

    // Step 3: Aggregate by category
    logger.info('\n📊 Step 3: Aggregating by category...');
    const categories = [
      ...new Set(allResults.map((r) => r.metadata.scenarioCategory)),
    ];

    for (const category of categories) {
      try {
        await this.storage.aggregateByCategory(category, runId);
        logger.success(`  ✓ ${category}`);
      } catch (error) {
        logger.error(`  ✗ ${category}:`, error);
      }
    }

    // Step 4: Generate comparisons
    logger.info('\n📊 Step 4: Generating comparisons...');
    try {
      await this.comparisonGenerator.generateORMComparison(runId);
      logger.success('  ✓ ORM comparisons');
    } catch (error) {
      logger.error('  ✗ ORM comparisons:', error);
    }

    // Step 5: Update historical data
    logger.info('\n📊 Step 5: Updating historical data...');
    try {
      await this.historicalTracker.updateTimelines(runId, ormIds);
      logger.success('  ✓ Historical timelines');
    } catch (error) {
      logger.error('  ✗ Historical timelines:', error);
    }

    // Step 6: Generate UI data
    logger.info('\n📊 Step 6: Generating UI-optimized data...');
    try {
      await this.uiDataGenerator.generateAll(runId);
      logger.success('  ✓ UI data generated');
    } catch (error) {
      logger.error('  ✗ UI data generation:', error);
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    logger.info('');
    logger.info('='.repeat(60));
    logger.success(`✓ All aggregations completed in ${duration}s`);
    logger.info('='.repeat(60));
  }

  /**
   * Generate aggregations for the latest run
   */
  async generateLatestAggregations(): Promise<void> {
    const latestRunId = await this.storage.getLatestRunId();
    if (!latestRunId) {
      throw new Error('No runs found');
    }

    await this.generateAllAggregations(latestRunId);
  }

  /**
   * Regenerate all aggregations from existing runs
   */
  async regenerateAllAggregations(): Promise<void> {
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('Regenerating All Aggregations from Historical Runs');
    logger.info('='.repeat(60));

    const runs = await this.storage.listRuns();
    logger.info(`Total runs: ${runs.length}`);
    logger.info('');

    for (let i = 0; i < runs.length; i++) {
      const runId = runs[i];
      logger.info(`\nProcessing run ${i + 1}/${runs.length}: ${runId}`);

      try {
        await this.generateAllAggregations(runId);
      } catch (error) {
        logger.error(`Failed to process run ${runId}:`, error);
      }
    }

    logger.info('');
    logger.info('='.repeat(60));
    logger.success('✓ All historical aggregations regenerated');
    logger.info('='.repeat(60));
  }

  // ============================================================================
  // COMPARISON OPERATIONS
  // ============================================================================

  /**
   * Compare two runs
   */
  async compareRuns(run1: string, run2: string): Promise<void> {
    logger.info(`\nComparing runs: ${run1} vs ${run2}`);
    await this.comparisonGenerator.compareRuns(run1, run2);
    logger.success('✓ Run comparison generated');
  }

  /**
   * Compare ORM versions
   */
  async compareVersions(ormName: string, versions: string[]): Promise<void> {
    logger.info(`\nComparing ${ormName} versions: ${versions.join(', ')}`);
    await this.comparisonGenerator.compareVersions(ormName, versions);
    logger.success('✓ Version comparison generated');
  }

  /**
   * Generate all possible comparisons for a run
   */
  async generateAllComparisons(runId: string): Promise<void> {
    logger.info('\n📊 Generating all comparisons...');

    try {
      await this.comparisonGenerator.generateORMComparison(runId);
      logger.success('  ✓ ORM comparisons');
    } catch (error) {
      logger.error('  ✗ Failed to generate comparisons:', error);
    }
  }

  // ============================================================================
  // HISTORICAL OPERATIONS
  // ============================================================================

  /**
   * Update historical timelines for all ORMs
   */
  async updateHistoricalData(runId: string): Promise<void> {
    logger.info('\n📈 Updating historical data...');

    const metadata = await this.storage.loadRunMetadata(runId);
    if (!metadata) {
      throw new Error(`Run not found: ${runId}`);
    }

    const ormIds = metadata.testedORMs.map((o) => o.ormId);
    await this.historicalTracker.updateTimelines(runId, ormIds);

    logger.success('✓ Historical data updated');
  }

  /**
   * Detect regressions in the latest run
   */
  async detectRegressions(runId?: string): Promise<void> {
    const targetRunId = runId || (await this.storage.getLatestRunId());
    if (!targetRunId) {
      throw new Error('No runs found');
    }

    logger.info(`\n🔍 Detecting regressions in run: ${targetRunId}`);
    await this.historicalTracker.detectRegressions(targetRunId);
  }

  // ============================================================================
  // UI DATA OPERATIONS
  // ============================================================================

  /**
   * Generate all UI data
   */
  async generateUIData(runId?: string): Promise<void> {
    const targetRunId = runId || (await this.storage.getLatestRunId());
    if (!targetRunId) {
      throw new Error('No runs found');
    }

    logger.info('\n🎨 Generating UI-optimized data...');
    await this.uiDataGenerator.generateAll(targetRunId);
    logger.success('✓ UI data generated');
  }

  /**
   * Update UI data incrementally (after new run)
   */
  async updateUIData(runId: string): Promise<void> {
    logger.info('\n🎨 Updating UI data...');
    await this.uiDataGenerator.updateWithNewRun(runId);
    logger.success('✓ UI data updated');
  }

  // ============================================================================
  // CLEANUP OPERATIONS
  // ============================================================================

  /**
   * Clean up old runs
   */
  async cleanup(options: CleanupOptions): Promise<void> {
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('Storage Cleanup');
    logger.info('='.repeat(60));

    const runs = await this.storage.listRuns();
    const now = Date.now();
    const runsToDelete: string[] = [];

    // Determine which runs to delete
    if (options.olderThan) {
      const cutoffDate = now - options.olderThan * 24 * 60 * 60 * 1000;

      for (const runId of runs) {
        const runDate = this.parseRunIdDate(runId);
        if (runDate && runDate.getTime() < cutoffDate) {
          runsToDelete.push(runId);
        }
      }
    }

    if (options.keepLatest) {
      const toKeep = runs.slice(0, options.keepLatest);
      const toDelete = runs.slice(options.keepLatest);
      runsToDelete.push(...toDelete);
    }

    // Remove duplicates
    const uniqueToDelete = [...new Set(runsToDelete)];

    if (uniqueToDelete.length === 0) {
      logger.info('No runs to delete');
      return;
    }

    logger.info(`Runs to delete: ${uniqueToDelete.length}`);

    if (options.dryRun) {
      logger.info('\nDry run - no files will be deleted:');
      uniqueToDelete.forEach((runId) => {
        logger.info(`  - ${runId}`);
      });
      return;
    }

    // Archive before delete if requested
    if (options.archiveBeforeDelete) {
      logger.info('\n📦 Archiving runs before deletion...');
      // TODO: Implement archival
      logger.warn('Archival not yet implemented');
    }

    // Delete runs
    logger.info('\n🗑️  Deleting runs...');
    for (const runId of uniqueToDelete) {
      try {
        const runDir = path.join('benchmark-results', 'runs', runId);
        await fs.rm(runDir, { recursive: true, force: true });
        logger.success(`  ✓ Deleted: ${runId}`);
      } catch (error) {
        logger.error(`  ✗ Failed to delete ${runId}:`, error);
      }
    }

    logger.info('');
    logger.info('='.repeat(60));
    logger.success('✓ Cleanup completed');
    logger.info('='.repeat(60));
  }

  /**
   * Get storage statistics
   */
  async getStatistics(): Promise<void> {
    logger.info('');
    logger.info('='.repeat(60));
    logger.info('Storage Statistics');
    logger.info('='.repeat(60));

    const stats = await this.storage.getStats();

    logger.info(`Total runs: ${stats.totalRuns}`);
    logger.info(`Oldest run: ${stats.oldestRun}`);
    logger.info(`Newest run: ${stats.newestRun}`);
    logger.info('');

    // Additional statistics
    const runs = await this.storage.listRuns();
    logger.info('Recent runs:');
    for (let i = 0; i < Math.min(5, runs.length); i++) {
      const metadata = await this.storage.loadRunMetadata(runs[i]);
      if (metadata) {
        logger.info(
          `  ${i + 1}. ${runs[i]} - ${metadata.testedORMs.length} ORMs, ${
            metadata.summary.totalScenarios
          } scenarios`,
        );
      }
    }

    logger.info('');
    logger.info('='.repeat(60));
  }

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

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
   * Validate run exists
   */
  async validateRun(runId: string): Promise<boolean> {
    const metadata = await this.storage.loadRunMetadata(runId);
    return metadata !== null;
  }

  /**
   * Get run summary
   */
  async getRunSummary(runId: string): Promise<void> {
    const metadata = await this.storage.loadRunMetadata(runId);
    if (!metadata) {
      logger.error(`Run not found: ${runId}`);
      return;
    }

    logger.info('');
    logger.info('='.repeat(60));
    logger.info(`Run Summary: ${runId}`);
    logger.info('='.repeat(60));
    logger.info(`Status: ${metadata.status}`);
    logger.info(`Started: ${metadata.startTime}`);
    logger.info(`Duration: ${(metadata.duration / 1000).toFixed(2)}s`);
    logger.info('');
    logger.info('Tested ORMs:');
    metadata.testedORMs.forEach((orm) => {
      logger.info(
        `  - ${orm.name}@${orm.version}: ${orm.scenariosRun} scenarios (${orm.scenariosSucceeded} succeeded, ${orm.scenariosFailed} failed)`,
      );
    });
    logger.info('');
    logger.info(`Total scenarios: ${metadata.summary.totalScenarios}`);
    logger.info(`Total measurements: ${metadata.summary.totalMeasurements}`);
    logger.info(`Successful tests: ${metadata.summary.successfulTests}`);
    logger.info(`Failed tests: ${metadata.summary.failedTests}`);
    logger.info('='.repeat(60));
  }

  /**
   * Export run data (for backup or sharing)
   */
  async exportRun(runId: string, outputPath: string): Promise<void> {
    logger.info(`\n📤 Exporting run: ${runId}`);

    const metadata = await this.storage.loadRunMetadata(runId);
    const results = await this.storage.loadAllResultsFromRun(runId);

    const exportData = {
      metadata,
      results,
      exportedAt: new Date().toISOString(),
    };

    await fs.writeFile(outputPath, JSON.stringify(exportData, null, 2));

    logger.success(`✓ Run exported to: ${outputPath}`);
  }

  /**
   * Import run data
   */
  async importRun(inputPath: string): Promise<string> {
    logger.info(`\n📥 Importing run from: ${inputPath}`);

    const content = await fs.readFile(inputPath, 'utf-8');
    const importData = JSON.parse(content);

    // TODO: Implement import logic
    logger.warn('Import functionality not yet implemented');

    return importData.metadata.runId;
  }
}
