/**
 * Performance Utilities
 * Helper functions for performance measurement and monitoring
 */

import * as v8 from 'v8';

export interface MemorySnapshot {
  timestamp: number;
  heapUsed: number;
  heapTotal: number;
  external: number;
  rss: number;
  arrayBuffers: number;
}

export interface GCStats {
  type: 'minor' | 'major' | 'incremental' | 'weak';
  duration: number;
  beforeGC: MemorySnapshot;
  afterGC: MemorySnapshot;
  reclaimedBytes: number;
}

export class PerformanceUtils {
  /**
   * Get current memory usage snapshot
   */
  static getMemorySnapshot(): MemorySnapshot {
    const usage = process.memoryUsage();
    return {
      timestamp: Date.now(),
      heapUsed: usage.heapUsed,
      heapTotal: usage.heapTotal,
      external: usage.external,
      rss: usage.rss,
      arrayBuffers: usage.arrayBuffers,
    };
  }

  /**
   * Get memory usage in MB
   */
  static getMemoryUsageMB(): {
    heapUsed: number;
    heapTotal: number;
    external: number;
    rss: number;
  } {
    const usage = process.memoryUsage();
    return {
      heapUsed: usage.heapUsed / 1024 / 1024,
      heapTotal: usage.heapTotal / 1024 / 1024,
      external: usage.external / 1024 / 1024,
      rss: usage.rss / 1024 / 1024,
    };
  }

  /**
   * Calculate memory delta between two snapshots
   */
  static calculateMemoryDelta(
    before: MemorySnapshot,
    after: MemorySnapshot,
  ): {
    heapUsedDelta: number;
    heapTotalDelta: number;
    externalDelta: number;
    rssDelta: number;
  } {
    return {
      heapUsedDelta: after.heapUsed - before.heapUsed,
      heapTotalDelta: after.heapTotal - before.heapTotal,
      externalDelta: after.external - before.external,
      rssDelta: after.rss - before.rss,
    };
  }

  /**
   * Format bytes to human-readable string
   */
  static formatBytes(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];

    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  /**
   * Force garbage collection if available
   */
  static forceGC(): boolean {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  /**
   * Get V8 heap statistics
   */
  static getHeapStatistics() {
    return v8.getHeapStatistics();
  }

  /**
   * Get V8 heap space statistics
   */
  static getHeapSpaceStatistics() {
    return v8.getHeapSpaceStatistics();
  }

  /**
   * Get CPU usage
   */
  static getCPUUsage(): NodeJS.CpuUsage {
    return process.cpuUsage();
  }

  /**
   * Calculate CPU usage percentage between two measurements
   */
  static calculateCPUPercent(
    before: NodeJS.CpuUsage,
    after: NodeJS.CpuUsage,
    elapsedMs: number,
  ): number {
    const userDiff = after.user - before.user;
    const systemDiff = after.system - before.system;
    const totalDiff = userDiff + systemDiff;

    // Convert to percentage (CPU time is in microseconds)
    const elapsedUs = elapsedMs * 1000;
    return (totalDiff / elapsedUs) * 100;
  }

  /**
   * Sleep for specified milliseconds
   */
  static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * High-resolution timestamp in milliseconds
   */
  static now(): number {
    return performance.now();
  }

  /**
   * High-resolution timestamp in microseconds
   */
  static nowMicroseconds(): number {
    const [seconds, nanoseconds] = process.hrtime();
    return seconds * 1_000_000 + nanoseconds / 1000;
  }

  /**
   * Measure execution time of a function
   */
  static async measureTime<T>(
    fn: () => Promise<T>,
  ): Promise<{ result: T; durationMs: number }> {
    const start = performance.now();
    const result = await fn();
    const durationMs = performance.now() - start;
    return { result, durationMs };
  }

  /**
   * Monitor event loop lag
   */
  static measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        resolve(lag);
      });
    });
  }

  /**
   * Get process uptime
   */
  static getUptime(): number {
    return process.uptime();
  }

  /**
   * Get system load average (Unix-like systems only)
   */
  static getLoadAverage(): number[] {
    return require('os').loadavg();
  }

  /**
   * Calculate percentile from sorted array
   */
  static calculatePercentile(
    sortedArray: number[],
    percentile: number,
  ): number {
    if (sortedArray.length === 0) return 0;
    if (percentile <= 0) return sortedArray[0];
    if (percentile >= 100) return sortedArray[sortedArray.length - 1];

    const index = (percentile / 100) * (sortedArray.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    const weight = index - lower;

    if (lower === upper) {
      return sortedArray[lower];
    }

    return sortedArray[lower] * (1 - weight) + sortedArray[upper] * weight;
  }

  /**
   * Calculate standard deviation
   */
  static calculateStdDev(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map((val) => Math.pow(val - mean, 2));
    const variance =
      squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;

    return Math.sqrt(variance);
  }

  /**
   * Calculate coefficient of variation (CV)
   */
  static calculateCV(values: number[]): number {
    if (values.length === 0) return 0;

    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    if (mean === 0) return 0;

    const stdDev = this.calculateStdDev(values);
    return (stdDev / mean) * 100;
  }
}
