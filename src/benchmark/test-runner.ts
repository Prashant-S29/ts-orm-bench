/**
 * Test Runner
 * Uses ORM adapters and configuration-driven execution
 */

import { logger } from '../utils/logger';
import { MetricsCollector } from './metrics-collector';
import type { IORMAdapter } from '../adapters/orm-adapter.interface';
import type { ScenarioConfig, TestExecutionOptions } from '../config/test-config';
import type { BenchmarkMetrics } from './types';
import type { TestConfiguration } from './enhanced-types';

export interface TestResult {
  adapter: IORMAdapter;
  scenarioConfig: ScenarioConfig;
  metrics: BenchmarkMetrics;
  configuration: TestConfiguration;
  rawData: any[];
  duration: number;
  success: boolean;
  error?: string;
}

export class TestRunner {
  private memoryMonitorInterval?: NodeJS.Timeout;

  /**
   * Run a single scenario with an ORM adapter
   */
  async runScenario(
    scenarioConfig: ScenarioConfig,
    adapter: IORMAdapter,
    scenarioExecuteFn: (adapter: IORMAdapter) => Promise<void>,
    options?: Partial<TestExecutionOptions>,
  ): Promise<TestResult> {
    const executionOptions: TestExecutionOptions = {
      warmupIterations: options?.warmupIterations ?? scenarioConfig.warmupIterations,
      iterations: options?.iterations ?? scenarioConfig.measurementIterations,
      memoryMonitoringInterval: options?.memoryMonitoringInterval ?? 100,
    };

    logger.info(`Running scenario: ${scenarioConfig.name} [${adapter.name}@${adapter.version}]`);

    try {
      // Ensure adapter is connected
      const isHealthy = await adapter.healthCheck();
      if (!isHealthy) {
        await adapter.connect();
      }

      // Warmup phase
      logger.info(`  Warmup: ${executionOptions.warmupIterations} iterations...`);
      await this.runIterations(
        scenarioExecuteFn,
        adapter,
        executionOptions.warmupIterations,
        false,
      );

      // Wait for GC
      if (global.gc) {
        global.gc();
      }
      await this.sleep(1000);

      // Measurement phase
      logger.info(`  Measuring: ${executionOptions.iterations} iterations...`);
      const collector = new MetricsCollector();

      // Start memory monitoring
      if (executionOptions.memoryMonitoringInterval) {
        this.memoryMonitorInterval = setInterval(() => {
          collector.recordMemory();
          collector.recordCPU();
        }, executionOptions.memoryMonitoringInterval);
      }

      const rawData: any[] = [];
      collector.start();
      
      await this.runIterations(
        scenarioExecuteFn,
        adapter,
        executionOptions.iterations,
        true,
        collector,
        rawData,
      );
      
      collector.end();

      // Stop memory monitoring
      if (this.memoryMonitorInterval) {
        clearInterval(this.memoryMonitorInterval);
      }

      const metrics = collector.getMetrics();
      const duration = collector['endTime'] - collector['startTime'];

      logger.success(
        `  ✓ Completed: ${metrics.throughput.rps.toFixed(0)} RPS, ` +
          `p50: ${metrics.latency.median.toFixed(2)}ms, ` +
          `p95: ${metrics.latency.p95.toFixed(2)}ms`,
      );

      const configuration: TestConfiguration = {
        warmupIterations: executionOptions.warmupIterations,
        measurementIterations: executionOptions.iterations,
        memoryMonitoringInterval: executionOptions.memoryMonitoringInterval || 100,
        connectionPoolSize: 20, // TODO: get from adapter config
        database: {
          host: process.env.DB_HOST || 'localhost',
          port: parseInt(process.env.DB_PORT || '5432'),
          database: process.env.DB_NAME || 'benchmark',
        },
      };

      return {
        adapter,
        scenarioConfig,
        metrics,
        configuration,
        rawData,
        duration,
        success: true,
      };
    } catch (error) {
      logger.error(`  ✗ Failed: ${error}`);
      
      // Stop memory monitoring on error
      if (this.memoryMonitorInterval) {
        clearInterval(this.memoryMonitorInterval);
      }

      throw error;
    }
  }

  /**
   * Run multiple scenarios for a single ORM adapter
   */
  async runScenarios(
    scenarioConfigs: ScenarioConfig[],
    adapter: IORMAdapter,
    scenarioExecuteFns: Map<string, (adapter: IORMAdapter) => Promise<void>>,
  ): Promise<TestResult[]> {
    const results: TestResult[] = [];

    for (const config of scenarioConfigs) {
      if (!config.enabled) {
        logger.info(`Skipping disabled scenario: ${config.name}`);
        continue;
      }

      const executeFn = scenarioExecuteFns.get(config.id);
      if (!executeFn) {
        logger.warn(`No execution function found for scenario: ${config.id}`);
        continue;
      }

      try {
        const result = await this.runScenario(config, adapter, executeFn);
        results.push(result);
      } catch (error) {
        logger.error(`Failed to run scenario ${config.id}:`, error);
        // Continue with next scenario
      }

      // Small delay between scenarios
      await this.sleep(2000);
    }

    return results;
  }

  /**
   * Run multiple scenarios across multiple ORM adapters
   */
  async runAll(
    scenarioConfigs: ScenarioConfig[],
    adapters: IORMAdapter[],
    scenarioExecuteFns: Map<string, (adapter: IORMAdapter) => Promise<void>>,
  ): Promise<Map<string, TestResult[]>> {
    const allResults = new Map<string, TestResult[]>();

    for (const adapter of adapters) {
      logger.info(`\n${'='.repeat(60)}`);
      logger.info(`Testing ORM: ${adapter.name}@${adapter.version}`);
      logger.info(`${'='.repeat(60)}\n`);

      try {
        const results = await this.runScenarios(scenarioConfigs, adapter, scenarioExecuteFns);
        allResults.set(adapter.id, results);
      } catch (error) {
        logger.error(`Failed to run tests for ${adapter.name}:`, error);
      }

      // Delay between different ORMs
      await this.sleep(5000);
    }

    return allResults;
  }

  /**
   * Run iterations of a scenario
   */
  private async runIterations(
    executeFn: (adapter: IORMAdapter) => Promise<void>,
    adapter: IORMAdapter,
    count: number,
    collectMetrics: boolean,
    collector?: MetricsCollector,
    rawData?: any[],
  ): Promise<void> {
    for (let i = 0; i < count; i++) {
      const start = performance.now();

      try {
        await executeFn(adapter);

        if (collectMetrics && collector) {
          const duration = performance.now() - start;
          collector.recordLatency(duration);

          if (rawData) {
            rawData.push({
              iteration: i,
              timestamp: Date.now(),
              latencyMs: duration,
            });
          }
        }
      } catch (error) {
        if (collectMetrics && collector) {
          collector.recordError(
            error instanceof Error ? error.name : 'UnknownError',
          );
        }
        logger.error(`  Error in iteration ${i}:`, error);
      }

      // Log progress every 1000 iterations
      if (collectMetrics && i > 0 && i % 1000 === 0) {
        logger.info(`    Progress: ${i}/${count} iterations...`);
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}