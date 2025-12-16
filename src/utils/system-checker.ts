/**
 * System Requirements Checker
 * Checks if the system meets minimum requirements for benchmarking
 */

import * as os from 'os';
import * as fs from 'fs/promises';
import { logger } from './logger';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface SystemRequirements {
  minCpuCores: number;
  minMemoryGB: number;
  minDiskSpaceGB: number;
  requiredCommands: string[];
}

export interface SystemInfo {
  cpuCores: number;
  cpuModel: string;
  totalMemoryGB: number;
  freeMemoryGB: number;
  platform: string;
  arch: string;
  nodeVersion: string;
  diskSpaceGB: number;
  availableCommands: Map<string, boolean>;
}

export class SystemChecker {
  private requirements: SystemRequirements = {
    minCpuCores: 2,
    minMemoryGB: 4,
    minDiskSpaceGB: 10,
    requiredCommands: ['node', 'psql', 'docker'],
  };

  /**
   * Get system information
   */
  async getSystemInfo(): Promise<SystemInfo> {
    const cpus = os.cpus();
    const totalMemoryGB = os.totalmem() / 1024 ** 3;
    const freeMemoryGB = os.freemem() / 1024 ** 3;

    // Check disk space
    let diskSpaceGB = 0;
    try {
      if (process.platform === 'win32') {
        // Windows
        const { stdout } = await execAsync(
          'wmic logicaldisk get size,freespace,caption',
        );
        // Parse output (simplified)
        diskSpaceGB = 100; // Placeholder
      } else {
        // Unix-like systems
        const { stdout } = await execAsync(
          "df -BG . | tail -1 | awk '{print $4}'",
        );
        diskSpaceGB = parseInt(stdout.replace('G', '')) || 0;
      }
    } catch (error) {
      logger.warn('Could not determine disk space');
    }

    // Check available commands
    const availableCommands = new Map<string, boolean>();
    for (const cmd of this.requirements.requiredCommands) {
      availableCommands.set(cmd, await this.checkCommand(cmd));
    }

    return {
      cpuCores: cpus.length,
      cpuModel: cpus[0]?.model || 'Unknown',
      totalMemoryGB,
      freeMemoryGB,
      platform: os.platform(),
      arch: os.arch(),
      nodeVersion: process.version,
      diskSpaceGB,
      availableCommands,
    };
  }

  /**
   * Check if system meets requirements
   */
  async checkRequirements(): Promise<{ passed: boolean; issues: string[] }> {
    const info = await this.getSystemInfo();
    const issues: string[] = [];

    // Check CPU cores
    if (info.cpuCores < this.requirements.minCpuCores) {
      issues.push(
        `Insufficient CPU cores: ${info.cpuCores} (minimum: ${this.requirements.minCpuCores})`,
      );
    }

    // Check memory
    if (info.totalMemoryGB < this.requirements.minMemoryGB) {
      issues.push(
        `Insufficient memory: ${info.totalMemoryGB.toFixed(1)}GB (minimum: ${
          this.requirements.minMemoryGB
        }GB)`,
      );
    }

    // Check free memory
    if (info.freeMemoryGB < this.requirements.minMemoryGB / 2) {
      issues.push(
        `Low free memory: ${info.freeMemoryGB.toFixed(1)}GB (recommended: ${(
          this.requirements.minMemoryGB / 2
        ).toFixed(1)}GB)`,
      );
    }

    // Check disk space
    if (
      info.diskSpaceGB > 0 &&
      info.diskSpaceGB < this.requirements.minDiskSpaceGB
    ) {
      issues.push(
        `Insufficient disk space: ${info.diskSpaceGB}GB (minimum: ${this.requirements.minDiskSpaceGB}GB)`,
      );
    }

    // Check required commands
    for (const [cmd, available] of info.availableCommands) {
      if (!available) {
        issues.push(`Required command not found: ${cmd}`);
      }
    }

    return {
      passed: issues.length === 0,
      issues,
    };
  }

  /**
   * Print system information
   */
  printSystemInfo(info: SystemInfo): void {
    logger.info('\n' + '='.repeat(60));
    logger.info('System Information');
    logger.info('='.repeat(60));
    logger.info(`Platform:     ${info.platform} (${info.arch})`);
    logger.info(`Node.js:      ${info.nodeVersion}`);
    logger.info(`CPU:          ${info.cpuModel}`);
    logger.info(`CPU Cores:    ${info.cpuCores}`);
    logger.info(
      `Memory:       ${info.totalMemoryGB.toFixed(
        2,
      )}GB total, ${info.freeMemoryGB.toFixed(2)}GB free`,
    );
    if (info.diskSpaceGB > 0) {
      logger.info(`Disk Space:   ${info.diskSpaceGB}GB available`);
    }
    logger.info('\nAvailable Commands:');
    for (const [cmd, available] of info.availableCommands) {
      const status = available ? '✓' : '✗';
      const color = available ? 'success' : 'error';
      logger[color](`  ${status} ${cmd}`);
    }
    logger.info('='.repeat(60) + '\n');
  }

  /**
   * Check if a command is available
   */
  private async checkCommand(command: string): Promise<boolean> {
    try {
      const checkCmd =
        process.platform === 'win32' ? `where ${command}` : `which ${command}`;

      await execAsync(checkCmd);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check database connectivity
   */
  async checkDatabase(): Promise<{ connected: boolean; error?: string }> {
    try {
      // Import pg dynamically to avoid issues if not installed
      const { Pool } = await import('pg');

      const pool = new Pool({
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        user: process.env.DB_USER || 'benchmark',
        password: process.env.DB_PASSWORD || 'benchmark',
        database: process.env.DB_NAME || 'benchmark',
        connectionTimeoutMillis: 5000,
      });

      // Test connection
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      await pool.end();

      return { connected: true };
    } catch (error) {
      return {
        connected: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}
