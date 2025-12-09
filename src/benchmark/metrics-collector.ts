import { BenchmarkMetrics } from "./types";

export class MetricsCollector {
  private latencies: number[] = [];
  private memorySnapshots: NodeJS.MemoryUsage[] = [];
  private cpuUsage: number[] = [];
  private errors: Map<string, number> = new Map();
  private startTime: number = 0;
  private endTime: number = 0;

  start(): void {
    this.startTime = performance.now();
  }

  end(): void {
    this.endTime = performance.now();
  }

  recordLatency(latency: number): void {
    this.latencies.push(latency);
  }

  recordMemory(): void {
    this.memorySnapshots.push(process.memoryUsage());
  }

  recordCPU(): void {
    const usage = process.cpuUsage();
    const totalUsage = (usage.user + usage.system) / 1000000; // Convert to seconds
    this.cpuUsage.push(totalUsage);
  }

  recordError(errorType: string): void {
    this.errors.set(errorType, (this.errors.get(errorType) || 0) + 1);
  }

  getMetrics(): BenchmarkMetrics {
    const sortedLatencies = [...this.latencies].sort((a, b) => a - b);

    return {
      latency: {
        mean: this.mean(this.latencies),
        median: this.percentile(sortedLatencies, 50),
        p95: this.percentile(sortedLatencies, 95),
        p99: this.percentile(sortedLatencies, 99),
        p999: this.percentile(sortedLatencies, 99.9),
        min: Math.min(...this.latencies),
        max: Math.max(...this.latencies),
        stddev: this.stddev(this.latencies),
      },
      throughput: {
        rps: this.latencies.length / ((this.endTime - this.startTime) / 1000),
        totalRequests: this.latencies.length,
      },
      memory: {
        heapUsed: this.memorySnapshots.map((m) => m.heapUsed),
        heapTotal: this.memorySnapshots.map((m) => m.heapTotal),
        rss: this.memorySnapshots.map((m) => m.rss),
        external: this.memorySnapshots.map((m) => m.external),
      },
      cpu: {
        usage: this.cpuUsage,
      },
      errors: {
        count: Array.from(this.errors.values()).reduce((a, b) => a + b, 0),
        types: Object.fromEntries(this.errors),
      },
    };
  }

  private mean(arr: number[]): number {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  private percentile(sorted: number[], p: number): number {
    const index = (p / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;
    return sorted[lower] * (1 - weight) + sorted[upper] * weight;
  }

  private stddev(arr: number[]): number {
    const avg = this.mean(arr);
    const squareDiffs = arr.map((value) => Math.pow(value - avg, 2));
    return Math.sqrt(this.mean(squareDiffs));
  }

  reset(): void {
    this.latencies = [];
    this.memorySnapshots = [];
    this.cpuUsage = [];
    this.errors.clear();
    this.startTime = 0;
    this.endTime = 0;
  }
}
