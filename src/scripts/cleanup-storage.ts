/**
 * Cleanup Storage Script
 * Clean up old benchmark runs and manage storage
 */

import { StorageManager } from '../benchmark/storage-manager';
import { logger } from '../utils/logger';
import type { CleanupOptions } from '../benchmark/enhanced-types';

async function main() {
  logger.info('='.repeat(60));
  logger.info('Storage Cleanup');
  logger.info('='.repeat(60));

  const storageManager = new StorageManager();
  await storageManager.initialize();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    if (command === 'older-than') {
      // Delete runs older than N days
      const days = parseInt(args[1]);

      if (isNaN(days) || days <= 0) {
        logger.error('Please provide a valid number of days');
        printUsage();
        process.exit(1);
      }

      const dryRun = args.includes('--dry-run');

      const options: CleanupOptions = {
        olderThan: days,
        dryRun,
        archiveBeforeDelete: args.includes('--archive'),
      };

      await storageManager.cleanup(options);
    } else if (command === 'keep-latest') {
      // Keep only N latest runs
      const count = parseInt(args[1]);

      if (isNaN(count) || count <= 0) {
        logger.error('Please provide a valid number of runs to keep');
        printUsage();
        process.exit(1);
      }

      const dryRun = args.includes('--dry-run');

      const options: CleanupOptions = {
        keepLatest: count,
        dryRun,
        archiveBeforeDelete: args.includes('--archive'),
      };

      await storageManager.cleanup(options);
    } else if (command === 'stats') {
      // Show storage statistics
      await storageManager.getStatistics();
    } else {
      logger.error('Unknown command');
      printUsage();
      process.exit(1);
    }

    if (command !== 'stats') {
      logger.info('');
      logger.info('='.repeat(60));
      logger.success('✓ Cleanup complete!');
      logger.info('='.repeat(60));
    }
  } catch (error) {
    logger.error('\nCleanup failed:', error);
    process.exit(1);
  }
}

function printUsage() {
  logger.info('\nUsage:');
  logger.info('  pnpm cleanup older-than <days> [--dry-run] [--archive]');
  logger.info('  pnpm cleanup keep-latest <count> [--dry-run] [--archive]');
  logger.info('  pnpm cleanup stats');
  logger.info('');
  logger.info('Options:');
  logger.info(
    '  --dry-run    Show what would be deleted without actually deleting',
  );
  logger.info(
    '  --archive    Archive runs before deleting (not yet implemented)',
  );
  logger.info('');
  logger.info('Examples:');
  logger.info(
    '  pnpm cleanup older-than 90                  - Delete runs older than 90 days',
  );
  logger.info(
    '  pnpm cleanup older-than 90 --dry-run        - Preview deletion',
  );
  logger.info(
    '  pnpm cleanup keep-latest 10                 - Keep only 10 most recent runs',
  );
  logger.info(
    '  pnpm cleanup keep-latest 10 --archive       - Archive before deleting',
  );
  logger.info(
    '  pnpm cleanup stats                          - Show storage statistics',
  );
}

main().catch((error) => {
  logger.error('Script failed:', error);
  process.exit(1);
});
