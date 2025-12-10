/**
 * Core configuration types for ts-orm-bench
 * Defines the structure for test configuration, ORM versions, and scenarios
 */

export interface TestConfig {
  environment: EnvironmentConfig;
  orms: ORMConfig[];
  scenarios: ScenarioConfig[];
  metrics: MetricsConfig;
  database: DatabaseConfig;
}

export interface EnvironmentConfig {
  nodeVersion: string;
  platform: string;
  arch: string;
  cpuModel: string;
  cpuCores: number;
  totalMemoryMB: number;
  description?: string;
}

export interface ORMConfig {
  id: string;
  name: 'drizzle' | 'prisma' | string;
  version: string;
  status: 'enabled' | 'disabled';
  schemaPath: string;
  clientPath: string;
  dependencies: Record<string, string>;
  settings?: ORMSettings;
}

export interface ORMSettings {
  connectionPoolSize?: number;
  timeout?: number;
  logging?: boolean;
  [key: string]: any;
}

export interface ScenarioConfig {
  id: string;
  name: string;
  category:
    | 'crud'
    | 'relations'
    | 'aggregations'
    | 'filtering'
    | 'transactions'
    | 'mixed';
  enabled: boolean;
  warmupIterations: number;
  measurementIterations: number;
  description?: string;
}

export interface MetricsConfig {
  latency: {
    enabled: boolean;
    percentiles: number[];
  };
  throughput: {
    enabled: boolean;
  };
  memory: {
    enabled: boolean;
    monitoringIntervalMs: number;
  };
  cpu: {
    enabled: boolean;
  };
  queryCount: {
    enabled: boolean;
  };
}

export interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  user: string;
  password: string;
  ssl?: boolean;
  maxConnections?: number;
}

/**
 * Test execution options
 */
export interface TestExecutionOptions {
  warmupIterations: number;
  iterations: number;
  memoryMonitoringInterval?: number;
}

/**
 * ORM adapter interface - all ORM implementations must conform to this
 */
export interface ORMAdapter {
  id: string;
  name: string;
  version: string;

  initialize(): Promise<void>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;

  // Health check
  healthCheck(): Promise<boolean>;

  // Get the actual client for scenario execution
  getClient(): any;

  // Metadata
  getMetadata(): ORMMetadata;
}

export interface ORMMetadata {
  id: string;
  name: string;
  version: string;
  dependencies: Record<string, string>;
  features: string[];
  limitations?: string[];
}

/**
 * Scenario definition with execution function
 */
export interface ScenarioDefinition {
  id: string;
  name: string;
  description: string;
  category: ScenarioConfig['category'];
  execute: (adapter: ORMAdapter) => Promise<void>;
}
