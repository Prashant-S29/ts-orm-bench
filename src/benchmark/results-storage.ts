import * as fs from 'fs/promises';
import * as path from 'path';
import type { TestResult } from './types';
import { logger } from '../utils/logger';

export class ResultsStorage {
  private baseDir: string;

  constructor(baseDir: string = './benchmark-results') {
    this.baseDir = baseDir;
  }

  async saveResult(result: TestResult): Promise<void> {
    const runDir = path.join(
      this.baseDir,
      'runs',
      `${result.timestamp.split('T')[0]}-${result.orm}-${result.scenario}`,
    );

    await fs.mkdir(runDir, { recursive: true });

    // Save complete result
    await fs.writeFile(
      path.join(runDir, 'result.json'),
      JSON.stringify(result, null, 2),
    );

    // Save summary for quick access
    const summary = {
      testId: result.testId,
      timestamp: result.timestamp,
      orm: result.orm,
      scenario: result.scenario,
      summary: {
        p50: result.metrics.latency.median,
        p95: result.metrics.latency.p95,
        p99: result.metrics.latency.p99,
        rps: result.metrics.throughput.rps,
        avgMemoryMB: this.mean(result.metrics.memory.heapUsed) / 1024 / 1024,
        errorCount: result.metrics.errors.count,
      },
    };

    await fs.writeFile(
      path.join(runDir, 'summary.json'),
      JSON.stringify(summary, null, 2),
    );

    logger.info(`  Saved results to: ${runDir}`);
  }

  async loadResult(testId: string): Promise<TestResult | null> {
    // Implementation for loading results
    return null;
  }

  private mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }
}
