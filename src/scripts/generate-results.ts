/**
 * Generate Results Script
 * Aggregates all results and generates UI-optimized data using the new storage system
 */

import { StorageManager } from '../benchmark/storage-manager';
import { logger } from '../utils/logger';

async function main() {
  logger.info('='.repeat(60));
  logger.info('Results Generation & Aggregation (Enhanced)');
  logger.info('='.repeat(60));

  const storageManager = new StorageManager();
  await storageManager.initialize();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];
  const runId = args[1];

  try {
    if (command === 'latest' || !command) {
      // Generate aggregations for latest run
      logger.info('\nGenerating aggregations for latest run...');
      await storageManager.generateLatestAggregations();
    } else if (command === 'run' && runId) {
      // Generate aggregations for specific run
      logger.info(`\nGenerating aggregations for run: ${runId}...`);
      await storageManager.generateAllAggregations(runId);
    } else if (command === 'all') {
      // Regenerate all historical aggregations
      logger.info('\nRegenerating all historical aggregations...');
      await storageManager.regenerateAllAggregations();
    } else if (command === 'stats') {
      // Show storage statistics
      await storageManager.getStatistics();
    } else if (command === 'summary' && runId) {
      // Show run summary
      await storageManager.getRunSummary(runId);
    } else {
      logger.error('Unknown command or missing arguments');
      printUsage();
      process.exit(1);
    }

    logger.info('');
    logger.info('='.repeat(60));
    logger.success('✓ Results generation complete!');
    logger.info('='.repeat(60));

    logger.info('\nGenerated files:');
    logger.info('  📁 benchmark-results/aggregated/by-orm/');
    logger.info('  📁 benchmark-results/aggregated/by-scenario/');
    logger.info('  📁 benchmark-results/aggregated/by-category/');
    logger.info('  📁 benchmark-results/aggregated/comparisons/');
    logger.info('  📁 benchmark-results/ui-data/latest/');
    logger.info('  📁 benchmark-results/ui-data/comparisons/');
    logger.info('  📁 benchmark-results/ui-data/historical/');
  } catch (error) {
    logger.error('\nFailed to generate results:', error);
    process.exit(1);
  }
}

function printUsage() {
  logger.info('\nUsage:');
  logger.info(
    '  pnpm generate-results                    - Generate for latest run',
  );
  logger.info(
    '  pnpm generate-results latest             - Generate for latest run',
  );
  logger.info(
    '  pnpm generate-results run <runId>        - Generate for specific run',
  );
  logger.info(
    '  pnpm generate-results all                - Regenerate all historical',
  );
  logger.info(
    '  pnpm generate-results stats              - Show storage statistics',
  );
  logger.info('  pnpm generate-results summary <runId>    - Show run summary');
  logger.info('');
  logger.info('Examples:');
  logger.info('  pnpm generate-results');
  logger.info('  pnpm generate-results run 2025-12-10_14-30-45');
  logger.info('  pnpm generate-results all');
  logger.info('  pnpm generate-results stats');
}

main().catch((error) => {
  logger.error('Script failed:', error);
  process.exit(1);
});
