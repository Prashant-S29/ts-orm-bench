/**
 * Configuration Validator
 * Validates test configuration before running benchmarks
 */

import type {
  TestConfig,
  ORMConfig,
  ScenarioConfig,
} from '../config/test-config';
import { logger } from './logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export class ConfigValidator {
  /**
   * Validate entire test configuration
   */
  async validate(config: TestConfig): Promise<ValidationResult> {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Validate environment
    this.validateEnvironment(config, errors, warnings);

    // Validate database config
    this.validateDatabase(config, errors, warnings);

    // Validate ORMs
    await this.validateORMs(config, errors, warnings);

    // Validate scenarios
    this.validateScenarios(config, errors, warnings);

    // Validate metrics
    this.validateMetrics(config, errors, warnings);

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate environment configuration
   */
  private validateEnvironment(
    config: TestConfig,
    errors: string[],
    warnings: string[],
  ): void {
    const env = config.environment;

    if (!env.nodeVersion) {
      errors.push('Environment: nodeVersion is required');
    }

    if (!env.platform) {
      errors.push('Environment: platform is required');
    }

    if (!env.cpuCores || env.cpuCores < 1) {
      errors.push('Environment: cpuCores must be at least 1');
    }

    if (!env.totalMemoryMB || env.totalMemoryMB < 1024) {
      warnings.push('Environment: Less than 1GB memory may cause issues');
    }
  }

  /**
   * Validate database configuration
   */
  private validateDatabase(
    config: TestConfig,
    errors: string[],
    warnings: string[],
  ): void {
    const db = config.database;

    if (!db.host) {
      errors.push('Database: host is required');
    }

    if (!db.port || db.port < 1 || db.port > 65535) {
      errors.push('Database: port must be between 1 and 65535');
    }

    if (!db.database) {
      errors.push('Database: database name is required');
    }

    if (!db.user) {
      errors.push('Database: user is required');
    }

    if (!db.password) {
      warnings.push(
        'Database: password is empty (may be intentional for local dev)',
      );
    }

    if (db.maxConnections && db.maxConnections < 5) {
      warnings.push(
        'Database: maxConnections is very low, may cause connection issues',
      );
    }
  }

  /**
   * Validate ORM configurations
   */
  private async validateORMs(
    config: TestConfig,
    errors: string[],
    warnings: string[],
  ): Promise<void> {
    if (config.orms.length === 0) {
      errors.push('ORMs: At least one ORM must be configured');
      return;
    }

    const enabledORMs = config.orms.filter((orm) => orm.status === 'enabled');
    if (enabledORMs.length === 0) {
      errors.push('ORMs: At least one ORM must be enabled');
    }

    for (const orm of config.orms) {
      await this.validateORM(orm, errors, warnings);
    }

    // Check for duplicate IDs
    const ids = config.orms.map((orm) => orm.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`ORMs: Duplicate IDs found: ${duplicates.join(', ')}`);
    }
  }

  /**
   * Validate single ORM configuration
   */
  private async validateORM(
    orm: ORMConfig,
    errors: string[],
    warnings: string[],
  ): Promise<void> {
    const prefix = `ORM[${orm.id}]`;

    if (!orm.id) {
      errors.push(`${prefix}: id is required`);
    }

    if (!orm.name) {
      errors.push(`${prefix}: name is required`);
    }

    if (!orm.version) {
      errors.push(`${prefix}: version is required`);
    }

    if (!orm.schemaPath) {
      errors.push(`${prefix}: schemaPath is required`);
    }

    if (!orm.clientPath) {
      errors.push(`${prefix}: clientPath is required`);
    }

    if (!orm.dependencies || Object.keys(orm.dependencies).length === 0) {
      warnings.push(`${prefix}: No dependencies specified`);
    }

    // Validate file paths exist
    if (orm.schemaPath) {
      try {
        const schemaPath = path.join(process.cwd(), 'src', orm.schemaPath);
        await fs.access(schemaPath);
      } catch (error) {
        errors.push(`${prefix}: Schema file not found at ${orm.schemaPath}`);
      }
    }

    if (orm.clientPath) {
      try {
        const clientPath = path.join(process.cwd(), 'src', orm.clientPath);
        await fs.access(clientPath);
      } catch (error) {
        errors.push(`${prefix}: Client file not found at ${orm.clientPath}`);
      }
    }

    // Validate settings
    if (orm.settings) {
      if (
        orm.settings.connectionPoolSize &&
        orm.settings.connectionPoolSize < 1
      ) {
        errors.push(`${prefix}: connectionPoolSize must be at least 1`);
      }

      if (
        orm.settings.connectionPoolSize &&
        orm.settings.connectionPoolSize > 100
      ) {
        warnings.push(
          `${prefix}: connectionPoolSize is very high (${orm.settings.connectionPoolSize})`,
        );
      }
    }
  }

  /**
   * Validate scenario configurations
   */
  private validateScenarios(
    config: TestConfig,
    errors: string[],
    warnings: string[],
  ): void {
    if (config.scenarios.length === 0) {
      errors.push('Scenarios: At least one scenario must be configured');
      return;
    }

    const enabledScenarios = config.scenarios.filter((s) => s.enabled);
    if (enabledScenarios.length === 0) {
      warnings.push('Scenarios: No scenarios are enabled');
    }

    for (const scenario of config.scenarios) {
      this.validateScenario(scenario, errors, warnings);
    }

    // Check for duplicate IDs
    const ids = config.scenarios.map((s) => s.id);
    const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
    if (duplicates.length > 0) {
      errors.push(`Scenarios: Duplicate IDs found: ${duplicates.join(', ')}`);
    }
  }

  /**
   * Validate single scenario configuration
   */
  private validateScenario(
    scenario: ScenarioConfig,
    errors: string[],
    warnings: string[],
  ): void {
    const prefix = `Scenario[${scenario.id}]`;

    if (!scenario.id) {
      errors.push(`${prefix}: id is required`);
    }

    if (!scenario.name) {
      errors.push(`${prefix}: name is required`);
    }

    if (!scenario.category) {
      errors.push(`${prefix}: category is required`);
    }

    const validCategories = [
      'crud',
      'relations',
      'aggregations',
      'filtering',
      'transactions',
      'mixed',
    ];
    if (scenario.category && !validCategories.includes(scenario.category)) {
      errors.push(
        `${prefix}: Invalid category '${
          scenario.category
        }'. Must be one of: ${validCategories.join(', ')}`,
      );
    }

    if (scenario.warmupIterations < 0) {
      errors.push(`${prefix}: warmupIterations cannot be negative`);
    }

    if (scenario.warmupIterations === 0) {
      warnings.push(
        `${prefix}: No warmup iterations - results may include cold start overhead`,
      );
    }

    if (scenario.warmupIterations > 10000) {
      warnings.push(
        `${prefix}: Very high warmup iterations (${scenario.warmupIterations}) - may take long time`,
      );
    }

    if (scenario.measurementIterations < 100) {
      warnings.push(
        `${prefix}: Low measurement iterations (${scenario.measurementIterations}) - results may not be statistically significant`,
      );
    }

    if (scenario.measurementIterations > 100000) {
      warnings.push(
        `${prefix}: Very high measurement iterations (${scenario.measurementIterations}) - may take very long time`,
      );
    }
  }

  /**
   * Validate metrics configuration
   */
  private validateMetrics(
    config: TestConfig,
    errors: string[],
    warnings: string[],
  ): void {
    const metrics = config.metrics;

    if (
      !metrics.latency &&
      !metrics.throughput &&
      !metrics.memory &&
      !metrics.cpu
    ) {
      errors.push('Metrics: At least one metric type must be enabled');
    }

    if (metrics.latency) {
      if (
        !metrics.latency.percentiles ||
        metrics.latency.percentiles.length === 0
      ) {
        warnings.push('Metrics: No latency percentiles specified');
      }

      for (const p of metrics.latency.percentiles) {
        if (p < 0 || p > 100) {
          errors.push(
            `Metrics: Invalid percentile ${p} - must be between 0 and 100`,
          );
        }
      }
    }

    if (metrics.memory) {
      if (metrics.memory.monitoringIntervalMs < 10) {
        warnings.push(
          'Metrics: Very low memory monitoring interval - may impact performance',
        );
      }

      if (metrics.memory.monitoringIntervalMs > 5000) {
        warnings.push(
          'Metrics: High memory monitoring interval - may miss spikes',
        );
      }
    }
  }

  /**
   * Print validation results
   */
  printResults(result: ValidationResult): void {
    if (result.valid && result.warnings.length === 0) {
      logger.success('✓ Configuration is valid');
      return;
    }

    if (result.errors.length > 0) {
      logger.error('\n✗ Configuration Errors:');
      result.errors.forEach((error) => logger.error(`  - ${error}`));
    }

    if (result.warnings.length > 0) {
      logger.warn('\n⚠ Configuration Warnings:');
      result.warnings.forEach((warning) => logger.warn(`  - ${warning}`));
    }

    if (result.valid) {
      logger.success('\n✓ Configuration is valid (with warnings)');
    } else {
      logger.error('\n✗ Configuration is invalid');
    }
  }
}
