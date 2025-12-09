import { logger } from '../utils/logger';
import { MetricsCollector } from './metrics-collector';
import type { TestScenario, TestResult, ORM } from './types';

export class TestRunner {
  private memoryMonitorInterval?: NodeJS.Timeout;

  async runScenario(
    scenario: TestScenario,
    orm: ORM,
    options: {
      warmupIterations: number;
      iterations: number;
      memoryMonitoringInterval?: number;
    },
  ): Promise<TestResult> {
    logger.info(`Running scenario: ${scenario.name} [${orm.name}]`);

    // Warmup phase
    logger.info(`  Warmup: ${options.warmupIterations} iterations...`);
    await this.runIterations(scenario, orm, options.warmupIterations, false);

    // Wait for GC
    if (global.gc) {
      global.gc();
    }
    await this.sleep(1000);

    // Measurement phase
    logger.info(`  Measuring: ${options.iterations} iterations...`);
    const collector = new MetricsCollector();

    // Start memory monitoring
    if (options.memoryMonitoringInterval) {
      this.memoryMonitorInterval = setInterval(() => {
        collector.recordMemory();
        collector.recordCPU();
      }, options.memoryMonitoringInterval);
    }

    collector.start();
    await this.runIterations(
      scenario,
      orm,
      options.iterations,
      true,
      collector,
    );
    collector.end();

    // Stop memory monitoring
    if (this.memoryMonitorInterval) {
      clearInterval(this.memoryMonitorInterval);
    }

    const metrics = collector.getMetrics();

    logger.success(
      `  ✓ Completed: ${metrics.throughput.rps.toFixed(0)} RPS, ` +
        `p50: ${metrics.latency.median.toFixed(2)}ms, ` +
        `p95: ${metrics.latency.p95.toFixed(2)}ms`,
    );

    return {
      testId: `${scenario.id}-${orm.name}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      orm: orm.name,
      ormVersion: orm.version,
      scenario: scenario.id,
      metrics,
      duration: collector['endTime'] - collector['startTime'],
      iterations: options.iterations,
      warmupIterations: options.warmupIterations,
    };
  }

  private async runIterations(
    scenario: TestScenario,
    orm: ORM,
    count: number,
    collectMetrics: boolean,
    collector?: MetricsCollector,
  ): Promise<void> {
    for (let i = 0; i < count; i++) {
      const start = performance.now();

      try {
        await scenario.execute(orm);

        if (collectMetrics && collector) {
          const duration = performance.now() - start;
          collector.recordLatency(duration);
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
