/**
 * Compare Runs Script
 * Compare two benchmark runs or ORM versions
 */

import { StorageManager } from '../benchmark/storage-manager';
import { logger } from '../utils/logger';

async function main() {
  logger.info('='.repeat(60));
  logger.info('Compare Benchmark Runs');
  logger.info('='.repeat(60));

  const storageManager = new StorageManager();
  await storageManager.initialize();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'runs') {
      // Compare two runs
      const run1 = args[1];
      const run2 = args[2];

      if (!run1 || !run2) {
        logger.error('Please provide two run IDs');
        printUsage();
        process.exit(1);
      }

      await storageManager.compareRuns(run1, run2);
    } else if (command === 'versions') {
      // Compare ORM versions
      const ormName = args[1];
      const versionsStr = args[2];

      if (!ormName || !versionsStr) {
        logger.error('Please provide ORM name and versions');
        printUsage();
        process.exit(1);
      }

      const versions = versionsStr.split(',');
      await storageManager.compareVersions(ormName, versions);
    } else if (command === 'latest') {
      // Generate comparisons for latest run
      const storage = storageManager.getStorage();
      const latestRunId = await storage.getLatestRunId();

      if (!latestRunId) {
        logger.error('No runs found');
        process.exit(1);
      }

      logger.info(`\nGenerating comparisons for latest run: ${latestRunId}`);
      await storageManager.generateAllComparisons(latestRunId);
    } else {
      logger.error('Unknown command');
      printUsage();
      process.exit(1);
    }

    logger.info('');
    logger.info('='.repeat(60));
    logger.success('✓ Comparison complete!');
    logger.info('='.repeat(60));
  } catch (error) {
    logger.error('\nComparison failed:', error);
    process.exit(1);
  }
}

function printUsage() {
  logger.info('\nUsage:');
  logger.info(
    '  pnpm compare runs <run1> <run2>              - Compare two runs',
  );
  logger.info(
    '  pnpm compare versions <orm> <v1,v2,...>     - Compare ORM versions',
  );
  logger.info(
    '  pnpm compare latest                          - Compare ORMs in latest run',
  );
  logger.info('');
  logger.info('Examples:');
  logger.info('  pnpm compare runs 2025-12-10_14-30-45 2025-12-09_10-15-30');
  logger.info('  pnpm compare versions drizzle 1.0.0-beta.2,0.44.7');
  logger.info('  pnpm compare versions prisma 7.1.0,6.0.0');
  logger.info('  pnpm compare latest');
}

main().catch((error) => {
  logger.error('Script failed:', error);
  process.exit(1);
});
