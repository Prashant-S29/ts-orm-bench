/**
 * Configuration Validation Script
 * Validates the test configuration before running benchmarks
 */

import { defaultConfig } from '../config/default-config';
import { ConfigValidator } from '../utils/config-validator';
import { SystemChecker } from '../utils/system-checker';
import { logger } from '../utils/logger';

async function main() {
  logger.info('='.repeat(60));
  logger.info('Configuration Validation');
  logger.info('='.repeat(60));

  // Validate configuration
  logger.info('\n📋 Validating configuration...\n');
  const validator = new ConfigValidator();
  const configResult = await validator.validate(defaultConfig);
  validator.printResults(configResult);

  if (!configResult.valid) {
    logger.error('\n❌ Configuration validation failed!');
    process.exit(1);
  }

  // Check system requirements
  logger.info('\n💻 Checking system requirements...\n');
  const systemChecker = new SystemChecker();
  const systemInfo = await systemChecker.getSystemInfo();
  systemChecker.printSystemInfo(systemInfo);

  const requirementsCheck = await systemChecker.checkRequirements();
  if (!requirementsCheck.passed) {
    logger.error('\n❌ System requirements check failed:');
    requirementsCheck.issues.forEach((issue) => logger.error(`  - ${issue}`));
    process.exit(1);
  }

  logger.success('\n✓ System meets minimum requirements');

  // Check database connectivity
  logger.info('\n🗄️  Checking database connectivity...\n');
  const dbCheck = await systemChecker.checkDatabase();
  if (!dbCheck.connected) {
    logger.error(`❌ Database connection failed: ${dbCheck.error}`);
    logger.info('\nMake sure:');
    logger.info('  1. PostgreSQL is running (docker-compose up -d)');
    logger.info('  2. Environment variables are set correctly');
    logger.info('  3. Database schema is set up (pnpm db:schema)');
    process.exit(1);
  }

  logger.success('✓ Database connection successful');

  logger.info('\n' + '='.repeat(60));
  logger.success('✓ All validation checks passed!');
  logger.info('='.repeat(60));
  logger.info('\nYou can now run benchmarks:');
  logger.info('  pnpm test              - Run all tests');
  logger.info('  pnpm test scenario <id> - Run specific scenario');
  logger.info('  pnpm test orm <id>      - Run specific ORM');
}

main().catch((error) => {
  logger.error('Validation failed:', error);
  process.exit(1);
});
