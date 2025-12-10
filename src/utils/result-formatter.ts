/**
 * Result Formatter
 * Formats benchmark results for console and file output
 */

import type { BenchmarkMetrics } from '../benchmark/types';
import type { TestResult } from '../benchmark/test-runner';
import { PerformanceUtils } from './performance-utils';
import * as Table from 'cli-table3';

export class ResultFormatter {
  /**
   * Format metrics as a table
   */
  static formatMetricsTable(metrics: BenchmarkMetrics): string {
    const table = new (Table as any)({
      head: ['Metric', 'Value'],
      colWidths: [30, 30],
    });

    // Latency metrics
    table.push(
      ['Latency - Mean', `${metrics.latency.mean.toFixed(3)}ms`],
      ['Latency - Median (p50)', `${metrics.latency.median.toFixed(3)}ms`],
      ['Latency - p95', `${metrics.latency.p95.toFixed(3)}ms`],
      ['Latency - p99', `${metrics.latency.p99.toFixed(3)}ms`],
      ['Latency - p99.9', `${metrics.latency.p999.toFixed(3)}ms`],
      ['Latency - Min', `${metrics.latency.min.toFixed(3)}ms`],
      ['Latency - Max', `${metrics.latency.max.toFixed(3)}ms`],
      ['Latency - StdDev', `${metrics.latency.stddev.toFixed(3)}ms`],
    );

    // Throughput metrics
    table.push(
      ['', ''],
      ['Throughput - RPS', `${metrics.throughput.rps.toFixed(2)}`],
      ['Total Requests', `${metrics.throughput.totalRequests}`],
    );

    // Memory metrics (average)
    if (metrics.memory.heapUsed.length > 0) {
      const avgHeapUsed =
        metrics.memory.heapUsed.reduce((a, b) => a + b, 0) /
        metrics.memory.heapUsed.length;
      const avgHeapTotal =
        metrics.memory.heapTotal.reduce((a, b) => a + b, 0) /
        metrics.memory.heapTotal.length;
      const avgRss =
        metrics.memory.rss.reduce((a, b) => a + b, 0) /
        metrics.memory.rss.length;

      table.push(
        ['', ''],
        ['Memory - Avg Heap Used', PerformanceUtils.formatBytes(avgHeapUsed)],
        ['Memory - Avg Heap Total', PerformanceUtils.formatBytes(avgHeapTotal)],
        ['Memory - Avg RSS', PerformanceUtils.formatBytes(avgRss)],
      );
    }

    // CPU metrics (average)
    if (metrics.cpu.usage.length > 0) {
      const avgCPU =
        metrics.cpu.usage.reduce((a, b) => a + b, 0) / metrics.cpu.usage.length;
      table.push(['', ''], ['CPU - Avg Usage', `${avgCPU.toFixed(2)}%`]);
    }

    // Error metrics
    if (metrics.errors.count > 0) {
      table.push(['', ''], ['Errors - Total', `${metrics.errors.count}`]);
      for (const [type, count] of Object.entries(metrics.errors.types)) {
        table.push([`  ${type}`, `${count}`]);
      }
    }

    return table.toString();
  }

  /**
   * Format comparison table between multiple ORMs
   */
  static formatComparisonTable(results: TestResult[]): string {
    const table = new (Table as any)({
      head: [
        'Metric',
        ...results.map((r) => `${r.adapter.name}@${r.adapter.version}`),
      ],
    });

    // Latency comparison
    table.push(
      [
        'p50 Latency (ms)',
        ...results.map((r) => r.metrics.latency.median.toFixed(3)),
      ],
      [
        'p95 Latency (ms)',
        ...results.map((r) => r.metrics.latency.p95.toFixed(3)),
      ],
      [
        'p99 Latency (ms)',
        ...results.map((r) => r.metrics.latency.p99.toFixed(3)),
      ],
    );

    // Throughput comparison
    table.push(
      ['', ...results.map(() => '')],
      [
        'Throughput (RPS)',
        ...results.map((r) => r.metrics.throughput.rps.toFixed(2)),
      ],
    );

    // Memory comparison
    if (results.every((r) => r.metrics.memory.heapUsed.length > 0)) {
      const avgHeaps = results.map((r) => {
        const avg =
          r.metrics.memory.heapUsed.reduce((a, b) => a + b, 0) /
          r.metrics.memory.heapUsed.length;
        return PerformanceUtils.formatBytes(avg);
      });

      table.push(
        ['', ...results.map(() => '')],
        ['Avg Heap Used', ...avgHeaps],
      );
    }

    return table.toString();
  }

  /**
   * Format summary for a single test result
   */
  static formatSummary(result: TestResult): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('='.repeat(60));
    lines.push(`Test Summary: ${result.scenarioConfig.name}`);
    lines.push(`ORM: ${result.adapter.name}@${result.adapter.version}`);
    lines.push('='.repeat(60));
    lines.push('');

    lines.push('Latency:');
    lines.push(`  Median (p50): ${result.metrics.latency.median.toFixed(3)}ms`);
    lines.push(`  p95: ${result.metrics.latency.p95.toFixed(3)}ms`);
    lines.push(`  p99: ${result.metrics.latency.p99.toFixed(3)}ms`);
    lines.push(`  p99.9: ${result.metrics.latency.p999.toFixed(3)}ms`);
    lines.push('');

    lines.push('Throughput:');
    lines.push(`  RPS: ${result.metrics.throughput.rps.toFixed(2)}`);
    lines.push(`  Total Requests: ${result.metrics.throughput.totalRequests}`);
    lines.push('');

    if (result.metrics.memory.heapUsed.length > 0) {
      const avgHeapUsed =
        result.metrics.memory.heapUsed.reduce((a, b) => a + b, 0) /
        result.metrics.memory.heapUsed.length;
      lines.push('Memory:');
      lines.push(
        `  Avg Heap Used: ${PerformanceUtils.formatBytes(avgHeapUsed)}`,
      );
      lines.push('');
    }

    if (result.metrics.errors.count > 0) {
      lines.push('Errors:');
      lines.push(`  Total: ${result.metrics.errors.count}`);
      lines.push('');
    }

    lines.push(`Duration: ${(result.duration / 1000).toFixed(2)}s`);
    lines.push('='.repeat(60));

    return lines.join('\n');
  }

  /**
   * Format results as JSON string
   */
  static formatJSON(
    result: TestResult,
    pretty: boolean = true,
  ): string {
    const data = {
      adapter: {
        id: result.adapter.id,
        name: result.adapter.name,
        version: result.adapter.version,
      },
      scenario: {
        id: result.scenarioConfig.id,
        name: result.scenarioConfig.name,
        category: result.scenarioConfig.category,
      },
      metrics: result.metrics,
      configuration: result.configuration,
      duration: result.duration,
      success: result.success,
    };

    return pretty ? JSON.stringify(data, null, 2) : JSON.stringify(data);
  }

  /**
   * Format results as CSV
   */
  static formatCSV(results: TestResult[]): string {
    const headers = [
      'ORM',
      'Version',
      'Scenario',
      'Category',
      'p50 (ms)',
      'p95 (ms)',
      'p99 (ms)',
      'RPS',
      'Total Requests',
      'Duration (s)',
    ];

    const rows = results.map((r) => [
      r.adapter.name,
      r.adapter.version,
      r.scenarioConfig.name,
      r.scenarioConfig.category,
      r.metrics.latency.median.toFixed(3),
      r.metrics.latency.p95.toFixed(3),
      r.metrics.latency.p99.toFixed(3),
      r.metrics.throughput.rps.toFixed(2),
      r.metrics.throughput.totalRequests,
      (r.duration / 1000).toFixed(2),
    ]);

    return [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
  }

  /**
   * Format markdown table
   */
  static formatMarkdownTable(results: TestResult[]): string {
    const lines: string[] = [];

    lines.push(
      '| ORM | Version | Scenario | p50 (ms) | p95 (ms) | p99 (ms) | RPS |',
    );
    lines.push(
      '|-----|---------|----------|----------|----------|----------|-----|',
    );

    for (const result of results) {
      lines.push(
        `| ${result.adapter.name} | ${result.adapter.version} | ${result.scenarioConfig.name} | ` +
          `${result.metrics.latency.median.toFixed(
            3,
          )} | ${result.metrics.latency.p95.toFixed(3)} | ` +
          `${result.metrics.latency.p99.toFixed(
            3,
          )} | ${result.metrics.throughput.rps.toFixed(2)} |`,
      );
    }

    return lines.join('\n');
  }
}
