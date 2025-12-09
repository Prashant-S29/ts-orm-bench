import { logger } from '../utils/logger';
import { TestRunner } from './test-runner';
import { ResultsStorage } from './results-storage';
import { BENCHMARK_CONFIG } from './config';
import { crudScenarios } from './scenarios';
import type { ORM, TestResult } from './types';

export class BenchmarkSuite {
  private testRunner: TestRunner;
  private resultsStorage: ResultsStorage;
  private results: TestResult[] = [];

  constructor() {
    this.testRunner = new TestRunner();
    this.resultsStorage = new ResultsStorage();
  }

  async runAll(orms: ORM[]): Promise<void> {
    logger.info('='.repeat(60));
    logger.info('Starting ORM Benchmark Suite');
    logger.info('='.repeat(60));

    const allScenarios = [...crudScenarios];

    logger.info(`Total scenarios: ${allScenarios.length}`);
    logger.info(`ORMs to test: ${orms.map((o) => o.name).join(', ')}`);
    logger.info('');

    for (const orm of orms) {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`Testing: ${orm.name.toUpperCase()} v${orm.version}`);
      logger.info('='.repeat(60));

      for (const scenario of allScenarios) {
        try {
          const config = this.getConfigForScenario(scenario.category);

          const result = await this.testRunner.runScenario(
            scenario,
            orm,
            config,
          );

          this.results.push(result);
          await this.resultsStorage.saveResult(result);
        } catch (error) {
          logger.error(`Failed to run ${scenario.id} for ${orm.name}:`, error);
        }

        // Cool down between tests
        await this.sleep(2000);
      }
    }

    logger.info('\n' + '='.repeat(60));
    logger.info('Benchmark Complete!');
    logger.info('='.repeat(60));

    this.printSummary();
  }

  async runScenario(scenarioId: string, orms: ORM[]): Promise<void> {
    const allScenarios = [...crudScenarios];
    const scenario = allScenarios.find((s) => s.id === scenarioId);

    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    logger.info(`Running scenario: ${scenario.name}`);

    for (const orm of orms) {
      const config = this.getConfigForScenario(scenario.category);
      const result = await this.testRunner.runScenario(scenario, orm, config);
      this.results.push(result);
      await this.resultsStorage.saveResult(result);
    }
  }

  private getConfigForScenario(category: string) {
    switch (category) {
      case 'crud':
        return {
          warmupIterations: BENCHMARK_CONFIG.scenarios.simple.warmup,
          iterations: BENCHMARK_CONFIG.scenarios.simple.iterations,
          memoryMonitoringInterval: BENCHMARK_CONFIG.memoryMonitoringInterval,
        };
      case 'relations':
        return {
          warmupIterations: BENCHMARK_CONFIG.scenarios.complex.warmup,
          iterations: BENCHMARK_CONFIG.scenarios.complex.iterations,
          memoryMonitoringInterval: BENCHMARK_CONFIG.memoryMonitoringInterval,
        };
      default:
        return {
          warmupIterations: BENCHMARK_CONFIG.warmupIterations,
          iterations: BENCHMARK_CONFIG.measurementIterations,
          memoryMonitoringInterval: BENCHMARK_CONFIG.memoryMonitoringInterval,
        };
    }
  }

  private printSummary(): void {
    logger.info('\nPerformance Summary:');
    logger.info('');

    // Group results by scenario
    const byScenario = new Map<string, TestResult[]>();
    for (const result of this.results) {
      const existing = byScenario.get(result.scenario) || [];
      existing.push(result);
      byScenario.set(result.scenario, existing);
    }

    // Print comparison for each scenario
    for (const [scenarioId, results] of byScenario) {
      logger.info(`\n${scenarioId}:`);

      for (const result of results) {
        const avgMemMB = (
          result.metrics.memory.heapUsed.reduce((a, b) => a + b, 0) /
          result.metrics.memory.heapUsed.length /
          1024 /
          1024
        ).toFixed(2);

        logger.info(
          `  ${result.orm.padEnd(10)} | ` +
            `p50: ${result.metrics.latency.median
              .toFixed(2)
              .padStart(6)}ms | ` +
            `p95: ${result.metrics.latency.p95.toFixed(2).padStart(6)}ms | ` +
            `p99: ${result.metrics.latency.p99.toFixed(2).padStart(6)}ms | ` +
            `RPS: ${result.metrics.throughput.rps.toFixed(0).padStart(6)} | ` +
            `Mem: ${avgMemMB.padStart(6)}MB`,
        );
      }

      // Show winner (lowest p95)
      const winner = results.reduce((min, r) =>
        r.metrics.latency.p95 < min.metrics.latency.p95 ? r : min,
      );
      const improvement = results
        .filter((r) => r.orm !== winner.orm)
        .map((r) => {
          const pct =
            ((r.metrics.latency.p95 - winner.metrics.latency.p95) /
              winner.metrics.latency.p95) *
            100;
          return `${pct.toFixed(1)}%`;
        })
        .join(', ');

      logger.success(`Winner: ${winner.orm} (${improvement} faster)`);
    }

    logger.info('\n' + '='.repeat(60));
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  getResults(): TestResult[] {
    return this.results;
  }
}
