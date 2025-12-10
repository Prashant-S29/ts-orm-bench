/**
 * Main Entry Point
 * Uses modular configuration-driven architecture
 */

import {
  defaultConfig,
  getEnabledORMs,
  getEnabledScenarios,
} from './config/default-config';
import { ORMFactory } from './factories/orm-factory';
import { TestRunner } from './benchmark/test-runner';
import { ScenarioRegistry } from './benchmark/scenario-registry';
import { ResultsStorage } from './benchmark/results-storage';
import { logger } from './utils/logger';
import type { TestConfig } from './config/test-config';

async function main() {
  logger.info('='.repeat(60));
  logger.info('TS-ORM-BENCH - Modular Benchmark System');
  logger.info('='.repeat(60));
  logger.info(`Node: ${process.version}`);
  logger.info(`Database: ${process.env.DB_NAME || 'benchmark'}`);
  logger.info('='.repeat(60));
  logger.info('');

  // Load configuration
  const config: TestConfig = defaultConfig;

  // Get enabled ORMs and scenarios
  const enabledORMs = getEnabledORMs(config);
  const enabledScenarios = getEnabledScenarios(config);

  logger.info(`Enabled ORMs: ${enabledORMs.length}`);
  enabledORMs.forEach((orm) => {
    logger.info(`  - ${orm.name}@${orm.version} (${orm.id})`);
  });

  logger.info(`\nEnabled Scenarios: ${enabledScenarios.length}`);
  enabledScenarios.forEach((scenario) => {
    logger.info(`  - ${scenario.name} (${scenario.id})`);
  });

  logger.info('');

  // Initialize storage
  const storage = new ResultsStorage();
  await storage.initialize();
  logger.success('✓ Storage initialized');

  // Create ORM adapters
  logger.info('\nInitializing ORM adapters...');
  const adapters = await ORMFactory.createAndInitializeMany(enabledORMs);
  logger.success(`✓ ${adapters.length} adapters initialized`);

  // Connect all adapters
  logger.info('\nConnecting to database...');
  for (const adapter of adapters) {
    try {
      await adapter.connect();
      const metadata = adapter.getMetadata();
      logger.success(`✓ ${metadata.name}@${metadata.version} connected`);
    } catch (error) {
      logger.error(`✗ Failed to connect ${adapter.name}:`, error);
      process.exit(1);
    }
  }

  // Initialize scenario registry
  const scenarioRegistry = new ScenarioRegistry();
  const scenarioExecuteFns = scenarioRegistry.getAll();

  // Parse command line arguments
  const args = process.argv.slice(2);
  const command = args[0];

  const testRunner = new TestRunner();

  try {
    if (command === 'all' || !command) {
      // Run all tests
      logger.info('\n' + '='.repeat(60));
      logger.info('Running all scenarios for all ORMs');
      logger.info('='.repeat(60) + '\n');

      const allResults = await testRunner.runAll(
        enabledScenarios,
        adapters,
        scenarioExecuteFns,
      );

      // Save all results
      logger.info('\nSaving results...');
      for (const [ormId, results] of allResults) {
        for (const result of results) {
          await storage.saveResult(
            result.adapter,
            result.scenarioConfig.id,
            result.scenarioConfig.name,
            result.scenarioConfig.category,
            result.metrics,
            result.configuration,
            result.rawData,
          );
        }
      }

      // Generate aggregations
      logger.info('\nGenerating aggregations...');
      for (const adapter of adapters) {
        await storage.aggregateByORM(adapter.id);
      }
      for (const scenario of enabledScenarios) {
        await storage.aggregateByScenario(scenario.id);
      }

      // Generate UI data
      logger.info('\nGenerating UI-optimized data...');
      await storage.generateUIData();

      logger.success('\n✓ All tests completed successfully!');
    } else if (command === 'scenario') {
      // Run specific scenario
      const scenarioId = args[1];
      if (!scenarioId) {
        logger.error('Please specify a scenario ID');
        logger.info('\nAvailable scenarios:');
        enabledScenarios.forEach((s) => logger.info(`  - ${s.id}`));
        process.exit(1);
      }

      const scenarioConfig = enabledScenarios.find((s) => s.id === scenarioId);
      if (!scenarioConfig) {
        logger.error(`Scenario not found: ${scenarioId}`);
        process.exit(1);
      }

      const executeFn = scenarioExecuteFns.get(scenarioId);
      if (!executeFn) {
        logger.error(`No execution function found for scenario: ${scenarioId}`);
        process.exit(1);
      }

      logger.info('\n' + '='.repeat(60));
      logger.info(`Running scenario: ${scenarioConfig.name}`);
      logger.info('='.repeat(60) + '\n');

      for (const adapter of adapters) {
        const result = await testRunner.runScenario(
          scenarioConfig,
          adapter,
          executeFn,
        );

        await storage.saveResult(
          result.adapter,
          result.scenarioConfig.id,
          result.scenarioConfig.name,
          result.scenarioConfig.category,
          result.metrics,
          result.configuration,
          result.rawData,
        );

        // Small delay between ORMs
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Generate aggregations for this scenario
      await storage.aggregateByScenario(scenarioId);
      for (const adapter of adapters) {
        await storage.aggregateByORM(adapter.id);
      }
      await storage.generateUIData();

      logger.success('\n✓ Scenario completed successfully!');
    } else if (command === 'orm') {
      // Run all scenarios for specific ORM
      const ormId = args[1];
      if (!ormId) {
        logger.error('Please specify an ORM ID');
        logger.info('\nAvailable ORMs:');
        enabledORMs.forEach((o) => logger.info(`  - ${o.id}`));
        process.exit(1);
      }

      const adapter = adapters.find((a) => a.id === ormId);
      if (!adapter) {
        logger.error(`ORM not found: ${ormId}`);
        process.exit(1);
      }

      logger.info('\n' + '='.repeat(60));
      logger.info(
        `Running all scenarios for: ${adapter.name}@${adapter.version}`,
      );
      logger.info('='.repeat(60) + '\n');

      const results = await testRunner.runScenarios(
        enabledScenarios,
        adapter,
        scenarioExecuteFns,
      );

      // Save results
      for (const result of results) {
        await storage.saveResult(
          result.adapter,
          result.scenarioConfig.id,
          result.scenarioConfig.name,
          result.scenarioConfig.category,
          result.metrics,
          result.configuration,
          result.rawData,
        );
      }

      // Generate aggregations
      await storage.aggregateByORM(adapter.id);
      for (const scenario of enabledScenarios) {
        await storage.aggregateByScenario(scenario.id);
      }
      await storage.generateUIData();

      logger.success('\n✓ ORM tests completed successfully!');
    } else if (command === 'aggregate') {
      // Regenerate aggregations from existing results
      logger.info('\nRegenerating aggregations...');

      for (const orm of enabledORMs) {
        await storage.aggregateByORM(orm.id);
      }
      for (const scenario of enabledScenarios) {
        await storage.aggregateByScenario(scenario.id);
      }
      await storage.generateUIData();

      logger.success('\n✓ Aggregations regenerated successfully!');
    } else {
      logger.error(`Unknown command: ${command}`);
      logger.info('\nUsage:');
      logger.info('  pnpm test              - Run all tests');
      logger.info('  pnpm test all          - Run all tests');
      logger.info('  pnpm test scenario <id> - Run specific scenario');
      logger.info(
        '  pnpm test orm <id>      - Run all scenarios for specific ORM',
      );
      logger.info(
        '  pnpm test aggregate     - Regenerate aggregations',
      );
      logger.info('\nExamples:');
      logger.info('  pnpm test scenario select_by_id');
      logger.info('  pnpm test orm drizzle-v1.0.0-beta.2');
      process.exit(1);
    }
  } catch (error) {
    logger.error('\nBenchmark failed:', error);
    process.exit(1);
  } finally {
    // Disconnect all adapters
    logger.info('\nDisconnecting...');
    for (const adapter of adapters) {
      try {
        await adapter.disconnect();
        logger.info(`✓ ${adapter.name} disconnected`);
      } catch (error) {
        logger.error(`✗ Failed to disconnect ${adapter.name}:`, error);
      }
    }
  }

  logger.info('\n' + '='.repeat(60));
  logger.info('Benchmark Complete');
  logger.info('='.repeat(60));
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled rejection:', error);
  process.exit(1);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  process.exit(1);
});

main();
