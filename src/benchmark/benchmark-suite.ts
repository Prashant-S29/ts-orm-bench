/**
 * Benchmark Suite
 * High-level orchestration of benchmark execution
 */

import { TestRunner, type TestResult } from './test-runner';
import { ScenarioRegistry } from './scenario-registry';
import { ResultsStorage } from './results-storage';
import type { IORMAdapter } from '../adapters/orm-adapter.interface';
import type { TestConfig, ScenarioConfig } from '../config/test-config';
import { logger } from '../utils/logger';
import { ResultFormatter } from '../utils/result-formatter';

export class BenchmarkSuite {
  private testRunner: TestRunner;
  private scenarioRegistry: ScenarioRegistry;
  private storage: ResultsStorage;

  constructor() {
    this.testRunner = new TestRunner();
    this.scenarioRegistry = new ScenarioRegistry();
    this.storage = new ResultsStorage();
  }

  /**
   * Initialize the benchmark suite
   */
  async initialize(): Promise<void> {
    await this.storage.initialize();
  }

  /**
   * Run all scenarios for all ORMs
   */
  async runAll(
    config: TestConfig,
    adapters: IORMAdapter[],
  ): Promise<Map<string, TestResult[]>> {
    const enabledScenarios = config.scenarios.filter((s) => s.enabled);
    const scenarioExecuteFns = this.scenarioRegistry.getAll();

    logger.info('='.repeat(60));
    logger.info('Running Full Benchmark Suite');
    logger.info('='.repeat(60));
    logger.info(`ORMs: ${adapters.length}`);
    logger.info(`Scenarios: ${enabledScenarios.length}`);
    logger.info(`Total Tests: ${adapters.length * enabledScenarios.length}`);
    logger.info('='.repeat(60));

    const allResults = await this.testRunner.runAll(
      enabledScenarios,
      adapters,
      scenarioExecuteFns,
    );

    // Save all results
    logger.info('\n💾 Saving results...');
    for (const [ormId, results] of allResults) {
      for (const result of results) {
        await this.storage.saveResult(
          result.adapter,
          result.scenarioConfig.id,
          result.scenarioConfig.name,
          result.scenarioConfig.category,
          result.metrics,
          result.configuration,
          result.rawData,
        );
      }
      logger.info(`  ✓ Saved ${results.length} results for ${ormId}`);
    }

    // Generate aggregations
    await this.generateAggregations(adapters, enabledScenarios);

    return allResults;
  }

  /**
   * Run specific scenario for all ORMs
   */
  async runScenario(
    scenarioConfig: ScenarioConfig,
    adapters: IORMAdapter[],
  ): Promise<TestResult[]> {
    const executeFn = this.scenarioRegistry.get(scenarioConfig.id);
    if (!executeFn) {
      throw new Error(
        `No execution function found for scenario: ${scenarioConfig.id}`,
      );
    }

    logger.info('='.repeat(60));
    logger.info(`Running Scenario: ${scenarioConfig.name}`);
    logger.info('='.repeat(60));
    logger.info(`ORMs: ${adapters.length}`);
    logger.info('='.repeat(60));

    const results: TestResult[] = [];

    for (const adapter of adapters) {
      const result = await this.testRunner.runScenario(
        scenarioConfig,
        adapter,
        executeFn,
      );

      results.push(result);

      await this.storage.saveResult(
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
    await this.storage.aggregateByScenario(scenarioConfig.id);
    for (const adapter of adapters) {
      await this.storage.aggregateByORM(adapter.id);
    }
    await this.storage.generateUIData();

    // Print comparison
    this.printComparison(results);

    return results;
  }

  /**
   * Run all scenarios for specific ORM
   */
  async runForORM(
    scenarios: ScenarioConfig[],
    adapter: IORMAdapter,
  ): Promise<TestResult[]> {
    const scenarioExecuteFns = this.scenarioRegistry.getAll();

    logger.info('='.repeat(60));
    logger.info(`Running All Scenarios: ${adapter.name}@${adapter.version}`);
    logger.info('='.repeat(60));
    logger.info(`Scenarios: ${scenarios.length}`);
    logger.info('='.repeat(60));

    const results = await this.testRunner.runScenarios(
      scenarios,
      adapter,
      scenarioExecuteFns,
    );

    // Save results
    for (const result of results) {
      await this.storage.saveResult(
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
    await this.storage.aggregateByORM(adapter.id);
    for (const scenario of scenarios) {
      await this.storage.aggregateByScenario(scenario.id);
    }
    await this.storage.generateUIData();

    return results;
  }

  /**
   * Generate all aggregations
   */
  private async generateAggregations(
    adapters: IORMAdapter[],
    scenarios: ScenarioConfig[],
  ): Promise<void> {
    logger.info('\n📊 Generating aggregations...');

    for (const adapter of adapters) {
      await this.storage.aggregateByORM(adapter.id);
    }

    for (const scenario of scenarios) {
      await this.storage.aggregateByScenario(scenario.id);
    }

    await this.storage.generateUIData();

    logger.success('✓ Aggregations complete');
  }

  /**
   * Print comparison table
   */
  private printComparison(results: TestResult[]): void {
    if (results.length < 2) {
      return;
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('Comparison Results');
    logger.info('='.repeat(60));
    logger.info(ResultFormatter.formatComparisonTable(results));
    logger.info('='.repeat(60));
  }

  /**
   * Get scenario registry (for external use)
   */
  getScenarioRegistry(): ScenarioRegistry {
    return this.scenarioRegistry;
  }

  /**
   * Get storage (for external use)
   */
  getStorage(): ResultsStorage {
    return this.storage;
  }
}
