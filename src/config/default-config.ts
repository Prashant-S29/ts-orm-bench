import type { TestConfig } from './test-config';
import * as os from 'os';

import { drizzleV1Config } from './orms/drizzle/v1.0.0-beta.2';
import { drizzleV045Config } from './orms/drizzle/v0.45.0';
import { prismaV7Config } from './orms/prisma/v7.1.0';
import { prismaV6Config } from './orms/prisma/v6.19.0';
/**
 * Default configuration for ts-orm-bench
 * This serves as the base configuration that can be overridden
 */
export const defaultConfig: TestConfig = {
  environment: {
    nodeVersion: process.version,
    platform: os.platform(),
    arch: os.arch(),
    cpuModel: os.cpus()[0]?.model || 'Unknown',
    cpuCores: os.cpus().length,
    totalMemoryMB: Math.round(os.totalmem() / 1024 / 1024),
    description: 'Default benchmark environment',
  },

  orms: [
    drizzleV1Config,
    prismaV7Config,
    prismaV6Config,
    drizzleV045Config,
  ],

  scenarios: [
    {
      id: 'select_by_id',
      name: 'SELECT by Primary Key',
      category: 'crud',
      enabled: true,
      warmupIterations: 500,
      measurementIterations: 10000,
      description: 'Fetch a single record by primary key',
    },
    {
      id: 'select_by_email',
      name: 'SELECT by Email (Indexed)',
      category: 'crud',
      enabled: true,
      warmupIterations: 500,
      measurementIterations: 10000,
      description: 'Fetch a single record by indexed email column',
    },
    {
      id: 'select_pagination',
      name: 'SELECT with Pagination',
      category: 'crud',
      enabled: true,
      warmupIterations: 500,
      measurementIterations: 10000,
      description: 'Fetch 50 records with offset',
    },
    {
      id: 'insert_single',
      name: 'INSERT Single Record',
      category: 'crud',
      enabled: true,
      warmupIterations: 500,
      measurementIterations: 10000,
      description: 'Insert a single record',
    },
    {
      id: 'update_single',
      name: 'UPDATE Single Record',
      category: 'crud',
      enabled: true,
      warmupIterations: 500,
      measurementIterations: 10000,
      description: 'Update a single existing record',
    },
    {
      id: 'delete_single',
      name: 'DELETE Single Record',
      category: 'crud',
      enabled: true,
      warmupIterations: 500,
      measurementIterations: 10000,
      description: 'Delete a single record (insert + delete)',
    },
    {
      id: 'bulk_insert',
      name: 'Bulk INSERT (100 records)',
      category: 'crud',
      enabled: true,
      warmupIterations: 100,
      measurementIterations: 1000,
      description: 'Insert 100 records in one operation',
    },
  ],

  metrics: {
    latency: {
      enabled: true,
      percentiles: [50, 95, 99, 99.9],
    },
    throughput: {
      enabled: true,
    },
    memory: {
      enabled: true,
      monitoringIntervalMs: 100,
    },
    cpu: {
      enabled: true,
    },
    queryCount: {
      enabled: true,
    },
  },

  database: {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'benchmark',
    user: process.env.DB_USER || 'benchmark',
    password: process.env.DB_PASSWORD || 'benchmark',
    ssl: false,
    maxConnections: 20,
  },
};

/**
 * Helper function to get enabled ORMs
 */
export function getEnabledORMs(config: TestConfig) {
  return config.orms.filter((orm) => orm.status === 'enabled');
}

/**
 * Helper function to get enabled scenarios
 */
export function getEnabledScenarios(config: TestConfig) {
  return config.scenarios.filter((scenario) => scenario.enabled);
}

/**
 * Helper function to find ORM config by ID
 */
export function getORMConfig(config: TestConfig, ormId: string) {
  return config.orms.find((orm) => orm.id === ormId);
}

/**
 * Helper function to find scenario config by ID
 */
export function getScenarioConfig(config: TestConfig, scenarioId: string) {
  return config.scenarios.find((scenario) => scenario.id === scenarioId);
}
