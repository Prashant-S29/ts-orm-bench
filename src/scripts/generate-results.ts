/**
 * Generate Results Script
 * Aggregates all results and generates UI-optimized data
 */

import { ResultsStorage } from '../benchmark/results-storage';
import {
  defaultConfig,
  getEnabledORMs,
  getEnabledScenarios,
} from '../config/default-config';
import { logger } from '../utils/logger';
import * as fs from 'fs/promises';
import * as path from 'path';

async function main() {
  logger.info('='.repeat(60));
  logger.info('Results Generation & Aggregation');
  logger.info('='.repeat(60));

  const storage = new ResultsStorage();
  await storage.initialize();

  const enabledORMs = getEnabledORMs(defaultConfig);
  const enabledScenarios = getEnabledScenarios(defaultConfig);

  // Check if we have any results
  const runsDir = path.join('benchmark-results', 'runs');
  try {
    const runs = await fs.readdir(runsDir);
    if (runs.length === 0) {
      logger.warn('\nNo benchmark results found!');
      logger.info('Run benchmarks first:');
      logger.info('  pnpm test');
      process.exit(0);
    }
    logger.info(`\nFound ${runs.length} benchmark run(s)`);
  } catch (error) {
    logger.error('\nBenchmark results directory not found!');
    logger.info('Run benchmarks first:');
    logger.info('  pnpm test');
    process.exit(1);
  }

  // Aggregate by ORM
  logger.info('\n📊 Aggregating results by ORM...');
  let aggregatedCount = 0;
  for (const orm of enabledORMs) {
    try {
      await storage.aggregateByORM(orm.id);
      logger.success(`  ✓ ${orm.name}@${orm.version}`);
      aggregatedCount++;
    } catch (error) {
      logger.warn(`  ⚠ ${orm.name}@${orm.version} - No results found`);
    }
  }

  // Aggregate by scenario
  logger.info('\n📊 Aggregating results by scenario...');
  for (const scenario of enabledScenarios) {
    try {
      await storage.aggregateByScenario(scenario.id);
      logger.success(`  ✓ ${scenario.name}`);
    } catch (error) {
      logger.warn(`  ⚠ ${scenario.name} - No results found`);
    }
  }

  // Generate UI data
  logger.info('\n🎨 Generating UI-optimized data...');
  try {
    await storage.generateUIData();
    logger.success('  ✓ UI data generated');
  } catch (error) {
    logger.error('  ✗ Failed to generate UI data:', error);
  }

  logger.info('\n' + '='.repeat(60));
  logger.success('✓ Results generation complete!');
  logger.info('='.repeat(60));

  if (aggregatedCount > 0) {
    logger.info('\nGenerated files:');
    logger.info('  📁 benchmark-results/aggregated/by-orm/');
    logger.info('  📁 benchmark-results/aggregated/by-scenario/');
    logger.info('  📄 benchmark-results/ui-data/latest.json');
  }
}

main().catch((error) => {
  logger.error('Failed to generate results:', error);
  process.exit(1);
});
